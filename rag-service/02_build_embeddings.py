import json
from pathlib import Path
from collections import Counter

import chromadb
import requests
from tqdm import tqdm


RECORDS_PATH = Path("output/records.jsonl")
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


def load_records():
    if not RECORDS_PATH.exists():
        raise FileNotFoundError(
            f"Missing {RECORDS_PATH}. Run Step 2 first to create output/records.jsonl."
        )

    with RECORDS_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def select_balanced_records(all_records, per_type=200):
    records = []

    for record_type in ["claims", "work_orders", "tasks", "equipment"]:
        selected = [r for r in all_records if r["record_type"] == record_type]
        records.extend(selected[:per_type])

    return records


def main():
    all_records = list(load_records())

    if not all_records:
        raise ValueError("No records found in output/records.jsonl")

    print(f"Loaded {len(all_records)} total records.")

    records = select_balanced_records(all_records, per_type=200)

    if not records:
        raise ValueError("No balanced records selected.")

    print("Balanced record counts:")
    print(Counter(r["record_type"] for r in records))

    client = chromadb.PersistentClient(path=CHROMA_PATH)

    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"Deleted old collection: {COLLECTION_NAME}")
    except Exception:
        pass

    collection = client.get_or_create_collection(name=COLLECTION_NAME)

    ids = []
    documents = []
    metadatas = []
    embeddings = []

    for record in tqdm(records, desc="Creating embeddings"):
        record_id = record["id"]
        content = record["content"]
        metadata = record.get("metadata", {})

        embedding = ollama_embed(content)

        ids.append(record_id)
        documents.append(content)
        metadatas.append(metadata)
        embeddings.append(embedding)

    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )

    print()
    print(f"Indexed {len(ids)} records into Chroma.")
    print(f"Chroma path: {CHROMA_PATH}")
    print(f"Collection: {COLLECTION_NAME}")


if __name__ == "__main__":
    main()