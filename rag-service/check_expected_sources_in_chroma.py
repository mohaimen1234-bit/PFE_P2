import json
from pathlib import Path
from collections import defaultdict

import chromadb


QUESTIONS_PATH = Path("data/rag_benchmark_questions.json")
CHROMA_PATH = "vector_store/chroma"

COLLECTIONS = [
    "maintenance_records_nomic",
    "maintenance_records_bge_m3",
    "maintenance_records_e5_large",
    "maintenance_records_minilm",
]


def load_expected_sources():
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    expected_sources = set()

    for q in questions:
        sources = q.get("expected_sources", [])

        if isinstance(sources, str):
            sources = [s.strip() for s in sources.split(",") if s.strip()]

        for source in sources:
            if source:
                expected_sources.add(source)

    return sorted(expected_sources)


def main():
    expected_sources = load_expected_sources()

    print(f"Total unique expected sources: {len(expected_sources)}")
    print()

    client = chromadb.PersistentClient(path=CHROMA_PATH)

    for collection_name in COLLECTIONS:
        print("=" * 100)
        print(f"Collection: {collection_name}")
        print("=" * 100)

        collection = client.get_collection(collection_name)

        existing = set()
        missing = []

        # Chroma get() can fetch by IDs directly.
        result = collection.get(ids=expected_sources)

        returned_ids = set(result.get("ids", []))

        for source_id in expected_sources:
            if source_id in returned_ids:
                existing.add(source_id)
            else:
                missing.append(source_id)

        coverage = len(existing) / len(expected_sources) if expected_sources else 0

        print(f"Collection count: {collection.count()}")
        print(f"Expected sources found: {len(existing)} / {len(expected_sources)}")
        print(f"Coverage: {coverage:.2%}")

        if missing:
            print()
            print("Missing expected sources:")
            for source_id in missing:
                print("-", source_id)
        else:
            print("No missing expected sources.")

        print()


if __name__ == "__main__":
    main()