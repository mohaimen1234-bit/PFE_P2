import requests
import chromadb


CHROMA_PATH = "vector_store/chroma"
COLLECTION_NAME = "maintenance_records"
EMBED_MODEL = "nomic-embed-text"


def ollama_embed(text: str):
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={
            "model": EMBED_MODEL,
            "prompt": text,
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def infer_record_types(question: str):
    q = question.lower()

    record_types = []

    if any(word in q for word in ["claim", "claims", "reported", "severity", "rejected", "qualified"]):
        record_types.append("claims")

    if any(word in q for word in ["work order", "wo", "repair", "maintenance", "delayed", "completed", "cancelled"]):
        record_types.append("work_orders")

    if any(word in q for word in ["task", "blocked", "failure reason", "subtask", "technician"]):
        record_types.append("tasks")

    if any(word in q for word in ["equipment", "asset", "machine", "pump", "ventilator", "autoclave", "compressor", "monitor"]):
        record_types.append("equipment")

    # If the question is about delays, search work orders and tasks.
    if any(word in q for word in ["delay", "delayed", "waiting", "blocked", "unavailable", "spare part", "stock"]):
        for rt in ["work_orders", "tasks"]:
            if rt not in record_types:
                record_types.append(rt)

    # Default: search all main types.
    if not record_types:
        record_types = ["claims", "work_orders", "tasks", "equipment"]

    return record_types


def search_one_type(collection, question: str, record_type: str, top_k: int):
    query_embedding = ollama_embed(question)

    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"record_type": record_type},
    )

    rows = []

    ids = result["ids"][0]
    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]

    for record_id, doc, metadata, distance in zip(ids, documents, metadatas, distances):
        rows.append({
            "id": record_id,
            "document": doc,
            "metadata": metadata,
            "distance": distance,
            "record_type": record_type,
        })

    return rows


def search(question: str, top_k_per_type: int = 3):
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_collection(name=COLLECTION_NAME)

    record_types = infer_record_types(question)

    print()
    print("Auto-selected record types:", record_types)

    all_results = []

    for record_type in record_types:
        try:
            all_results.extend(
                search_one_type(
                    collection=collection,
                    question=question,
                    record_type=record_type,
                    top_k=top_k_per_type,
                )
            )
        except Exception as e:
            print(f"Skipping {record_type}: {e}")

    all_results.sort(key=lambda x: x["distance"])

    print()
    print("=" * 80)
    print("QUESTION:")
    print(question)
    print("=" * 80)

    for i, item in enumerate(all_results[:10], start=1):
        print()
        print(f"RESULT {i}")
        print(f"ID: {item['id']}")
        print(f"Record type: {item['record_type']}")
        print(f"Distance: {item['distance']}")
        print(f"Metadata: {item['metadata']}")
        print("-" * 80)
        print(item["document"][:1000])


if __name__ == "__main__":
    question = input("Ask a maintenance question: ")
    search(question, top_k_per_type=3)