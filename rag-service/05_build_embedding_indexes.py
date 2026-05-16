import json
import time
from pathlib import Path
from typing import Any, Dict, List

import chromadb
import requests
from tqdm import tqdm


# ============================================================
# Production Chroma index builder
# ============================================================
# Purpose:
# - Build the final production Chroma collection from output/records.jsonl.
# - Use only the selected production embedding model.
# - Do not benchmark multiple embeddings.
# - Do not apply per-type sampling limits.
#
# Final production collection:
# - maintenance_records_nomic
#
# Run:
#   python 05_build_embedding_indexes.py
# ============================================================


# =========================
# Config
# =========================

RECORDS_PATH = Path("output/records.jsonl")
RESULTS_DIR = Path("results")
CHROMA_PATH = "vector_store/chroma"

COLLECTION_NAME = "maintenance_records_nomic"
EMBED_MODEL = "nomic-embed-text"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"

BATCH_SIZE = 100

# If True, deletes and rebuilds the collection from scratch.
# Recommended after changing 01_extract_records.py.
RECREATE_COLLECTION = True


# =========================
# Safety
# =========================

SENSITIVE_FIELD_KEYWORDS = [
    "password",
    "passwd",
    "hash",
    "token",
    "secret",
    "api_key",
    "apikey",
    "jwt",
    "credential",
    "credentials",
    "salt",
    "reset",
    "verification",
    "auth",
]


BLOCKED_RECORD_TYPES = {
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "color_settings",
    "flyway_schema_history",
}


def contains_sensitive_key(value: Any) -> bool:
    if isinstance(value, dict):
        for key, nested_value in value.items():
            key_lower = str(key).lower()
            if any(word in key_lower for word in SENSITIVE_FIELD_KEYWORDS):
                return True
            if contains_sensitive_key(nested_value):
                return True

    if isinstance(value, list):
        return any(contains_sensitive_key(item) for item in value)

    return False


def is_safe_record(record: Dict[str, Any]) -> bool:
    record_type = record.get("record_type", "")

    if record_type in BLOCKED_RECORD_TYPES:
        return False

    if contains_sensitive_key(record.get("metadata", {})):
        return False

    return True


# =========================
# Loading
# =========================

def load_records() -> List[Dict[str, Any]]:
    if not RECORDS_PATH.exists():
        raise FileNotFoundError(
            f"Missing {RECORDS_PATH}. Run 01_extract_records.py first."
        )

    records = []

    with RECORDS_PATH.open("r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()

            if not line:
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON on line {line_number}: {e}") from e

            required_fields = ["id", "record_type", "record_id", "content", "metadata"]
            missing = [field for field in required_fields if field not in record]

            if missing:
                raise ValueError(
                    f"Record on line {line_number} is missing required fields: {missing}"
                )

            if not is_safe_record(record):
                print(f"Skipping unsafe record: {record.get('id')}")
                continue

            content = str(record.get("content", "")).strip()
            if not content:
                print(f"Skipping empty-content record: {record.get('id')}")
                continue

            records.append(record)

    if not records:
        raise ValueError("No safe records found to index.")

    return records


def summarize_records(records: List[Dict[str, Any]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}

    for record in records:
        record_type = record.get("record_type", "unknown")
        counts[record_type] = counts.get(record_type, 0) + 1

    return counts


# =========================
# Metadata cleanup
# =========================

def clean_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    clean = {}

    for key, value in metadata.items():
        if value is None:
            clean[key] = ""
        elif isinstance(value, (str, int, float, bool)):
            clean[key] = value
        else:
            clean[key] = str(value)

    return clean


# =========================
# Ollama embedding
# =========================

def check_ollama_available():
    try:
        response = requests.post(
            OLLAMA_EMBED_URL,
            json={
                "model": EMBED_MODEL,
                "prompt": "health check",
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()

        if "embedding" not in data:
            raise RuntimeError(f"Ollama response did not contain embedding: {data}")

    except Exception as e:
        raise RuntimeError(
            "Ollama embedding endpoint is not available. "
            "Make sure Ollama is running and the model is pulled:\n"
            f"  ollama pull {EMBED_MODEL}\n"
            "  ollama serve\n"
            f"Original error: {e}"
        ) from e


def embed_text(text: str) -> List[float]:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBED_MODEL,
            "prompt": text,
        },
        timeout=180,
    )
    response.raise_for_status()

    data = response.json()

    if "embedding" not in data:
        raise RuntimeError(f"Ollama response did not contain embedding: {data}")

    return data["embedding"]


# =========================
# Chroma
# =========================

def create_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    if RECREATE_COLLECTION:
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"Deleted old collection: {COLLECTION_NAME}")
        except Exception:
            pass

    collection = client.get_or_create_collection(name=COLLECTION_NAME)

    return client, collection


def add_batch(collection, batch: List[Dict[str, Any]]):
    ids = []
    documents = []
    metadatas = []
    embeddings = []

    for record in batch:
        record_id = record["id"]
        content = record["content"]
        metadata = clean_metadata(record.get("metadata", {}))

        embedding = embed_text(content)

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


def chunk_records(records: List[Dict[str, Any]], batch_size: int):
    for i in range(0, len(records), batch_size):
        yield records[i:i + batch_size]


# =========================
# Main
# =========================

def main():
    start = time.time()
    RESULTS_DIR.mkdir(exist_ok=True)

    print("=" * 100)
    print("Production Chroma index build")
    print("=" * 100)
    print(f"Records path: {RECORDS_PATH}")
    print(f"Chroma path: {CHROMA_PATH}")
    print(f"Collection: {COLLECTION_NAME}")
    print(f"Embedding model: {EMBED_MODEL}")
    print(f"Recreate collection: {RECREATE_COLLECTION}")
    print()

    check_ollama_available()

    records = load_records()
    counts = summarize_records(records)

    print(f"Loaded safe records: {len(records)}")
    print("Record counts:")
    for record_type, count in sorted(counts.items()):
        print(f"- {record_type}: {count}")

    print()
    client, collection = create_collection()

    batches = list(chunk_records(records, BATCH_SIZE))

    indexed_count = 0

    for batch in tqdm(batches, desc="Indexing batches"):
        add_batch(collection, batch)
        indexed_count += len(batch)

    elapsed = time.time() - start

    final_count = collection.count()

    summary = {
        "collection": COLLECTION_NAME,
        "embedding_model": EMBED_MODEL,
        "records_path": str(RECORDS_PATH),
        "chroma_path": CHROMA_PATH,
        "records_loaded": len(records),
        "records_indexed": indexed_count,
        "collection_count": final_count,
        "record_type_counts": counts,
        "elapsed_seconds": round(elapsed, 3),
        "batch_size": BATCH_SIZE,
        "recreate_collection": RECREATE_COLLECTION,
    }

    summary_path = RESULTS_DIR / "production_chroma_index_summary.json"
    summary_path.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print()
    print("=" * 100)
    print("Index build complete")
    print("=" * 100)
    print(f"Indexed records: {indexed_count}")
    print(f"Collection count: {final_count}")
    print(f"Elapsed seconds: {elapsed:.2f}")
    print(f"Summary saved to: {summary_path}")
    print()
    print("Next:")
    print("Run FastAPI and test /ask.")
    print("  uvicorn rag_api:app --reload --port 8000")


if __name__ == "__main__":
    main()