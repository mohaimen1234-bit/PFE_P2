import requests
import csv
import json
import time
from statistics import mean
from pathlib import Path


API_URL = "http://127.0.0.1:8000/ask"
MODEL = "qwen3:1.7b"

RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

CSV_PATH = RESULTS_DIR / "distance_calibration_results.csv"
JSON_PATH = RESULTS_DIR / "distance_calibration_results.json"


TEST_CASES = [
    # ------------------------------------------------------------
    # Known-good / specific RAG questions
    # These should retrieve clear related records.
    # ------------------------------------------------------------
    {
        "id": "rag_good_001",
        "expected_quality": "good",
        "question": "Why was the surgical light work order cancelled?",
        "expected_route": "RAG"
    },
    {
        "id": "rag_good_002",
        "expected_quality": "good",
        "question": "What happened with the surgical light work order?",
        "expected_route": "RAG"
    },
    {
        "id": "rag_good_003",
        "expected_quality": "good",
        "question": "Explain the cancellation reason for the surgical light work order.",
        "expected_route": "RAG"
    },

    # ------------------------------------------------------------
    # Specific maintenance semantic questions
    # These may be RAG or HYBRID depending on your router.
    # ------------------------------------------------------------
    {
        "id": "semantic_001",
        "expected_quality": "medium",
        "question": "Which records mention oxygen sensor drift?",
        "expected_route": None
    },
    {
        "id": "semantic_002",
        "expected_quality": "medium",
        "question": "Which records mention pump seal leakage?",
        "expected_route": None
    },
    {
        "id": "semantic_003",
        "expected_quality": "medium",
        "question": "Which records mention compressor overheating?",
        "expected_route": None
    },

    # ------------------------------------------------------------
    # Broad questions
    # These are useful to see if RAG returns weak context.
    # ------------------------------------------------------------
    {
        "id": "broad_001",
        "expected_quality": "weak",
        "question": "Why equipments are failing?",
        "expected_route": "RAG"
    },
    {
        "id": "broad_002",
        "expected_quality": "weak",
        "question": "Why are machines having problems?",
        "expected_route": "RAG"
    },
    {
        "id": "broad_003",
        "expected_quality": "weak",
        "question": "What are the common maintenance problems?",
        "expected_route": None
    },

    # ------------------------------------------------------------
    # SQL questions
    # These usually have no Chroma distances because they do not use RAG.
    # They are included to confirm SQL stays SQL.
    # ------------------------------------------------------------
    {
        "id": "sql_001",
        "expected_quality": "sql",
        "question": "Which spare parts are below minimum stock?",
        "expected_route": "SQL"
    },
    {
        "id": "sql_002",
        "expected_quality": "sql",
        "question": "Show work orders by status.",
        "expected_route": "SQL"
    },

    # ------------------------------------------------------------
    # Hybrid questions
    # These may return many sources. Their distances may not mean the same
    # as pure RAG, depending on your implementation.
    # ------------------------------------------------------------
    {
        "id": "hybrid_001",
        "expected_quality": "hybrid",
        "question": "Why do the top 3 equipment have the most claims?",
        "expected_route": "HYBRID"
    },
    {
        "id": "hybrid_002",
        "expected_quality": "hybrid",
        "question": "Why are overdue work orders delayed?",
        "expected_route": "HYBRID"
    },
    {
        "id": "hybrid_003",
        "expected_quality": "hybrid",
        "question": "Why are spare parts below minimum stock affecting maintenance?",
        "expected_route": "HYBRID"
    },

    # ------------------------------------------------------------
    # Unrelated questions
    # These should not get good relevant sources.
    # If they retrieve low distances, your retrieval threshold is unsafe.
    # ------------------------------------------------------------
    {
        "id": "bad_001",
        "expected_quality": "bad",
        "question": "Why did the football team lose the match?",
        "expected_route": None
    },
    {
        "id": "bad_002",
        "expected_quality": "bad",
        "question": "Explain the history of ancient Rome.",
        "expected_route": None
    },
    {
        "id": "bad_003",
        "expected_quality": "bad",
        "question": "What is the best recipe for chocolate cake?",
        "expected_route": None
    }
]


def call_api(question):
    payload = {
        "question": question,
        "debug": True,
        "model": MODEL
    }

    start = time.time()

    response = requests.post(
        API_URL,
        json=payload,
        timeout=400
    )

    elapsed = time.time() - start
    response.raise_for_status()

    data = response.json()
    data["_client_elapsed_seconds"] = round(elapsed, 3)

    return data


def extract_distances(debug_sources):
    distances = []

    for source in debug_sources or []:
        distance = source.get("distance")
        if isinstance(distance, (int, float)):
            distances.append(float(distance))

    return distances


def summarize_distances(distances):
    if not distances:
        return {
            "best_distance": None,
            "avg_distance": None,
            "worst_distance": None,
            "source_count_with_distance": 0
        }

    return {
        "best_distance": min(distances),
        "avg_distance": mean(distances),
        "worst_distance": max(distances),
        "source_count_with_distance": len(distances)
    }


def classify_by_distance(best_distance):
    """
    Temporary classification.
    You will adjust these after reviewing the CSV.
    """

    if best_distance is None:
        return "no_distance"

    if best_distance <= 250:
        return "strong"

    if best_distance <= 380:
        return "weak"

    return "bad"


def main():
    rows = []
    full_results = []

    print("=" * 100)
    print("CMMS AI distance calibration smoke test")
    print("=" * 100)
    print(f"API: {API_URL}")
    print(f"Model: {MODEL}")
    print()

    for test in TEST_CASES:
        print("-" * 100)
        print(f"{test['id']} | expected_quality={test['expected_quality']}")
        print(f"Question: {test['question']}")

        try:
            data = call_api(test["question"])

            debug_sources = data.get("debug_sources") or []
            distances = extract_distances(debug_sources)
            distance_summary = summarize_distances(distances)

            best_distance = distance_summary["best_distance"]
            distance_class = classify_by_distance(best_distance)

            source_ids = data.get("sources") or []

            row = {
                "id": test["id"],
                "expected_quality": test["expected_quality"],
                "question": test["question"],
                "expected_route": test["expected_route"],
                "actual_route": data.get("route"),
                "sql_intent": data.get("sql_intent"),
                "answer_preview": (data.get("answer") or "")[:250].replace("\n", " "),
                "sources_count": len(source_ids),
                "sources": ", ".join(source_ids),
                "best_distance": best_distance,
                "avg_distance": distance_summary["avg_distance"],
                "worst_distance": distance_summary["worst_distance"],
                "source_count_with_distance": distance_summary["source_count_with_distance"],
                "distance_class_temp": distance_class,
                "api_latency_seconds": data.get("latency_seconds"),
                "client_elapsed_seconds": data.get("_client_elapsed_seconds"),
            }

            rows.append(row)

            full_results.append({
                "test": test,
                "response": data,
                "distance_summary": distance_summary,
                "distance_class_temp": distance_class
            })

            print(f"Route: {row['actual_route']}")
            print(f"Sources count: {row['sources_count']}")
            print(f"Best distance: {row['best_distance']}")
            print(f"Avg distance: {row['avg_distance']}")
            print(f"Worst distance: {row['worst_distance']}")
            print(f"Temporary distance class: {row['distance_class_temp']}")
            print(f"Latency: {row['api_latency_seconds']}s")
            print(f"Answer preview: {row['answer_preview']}")

        except Exception as e:
            print(f"ERROR: {e}")

            rows.append({
                "id": test["id"],
                "expected_quality": test["expected_quality"],
                "question": test["question"],
                "expected_route": test["expected_route"],
                "actual_route": "ERROR",
                "sql_intent": None,
                "answer_preview": str(e),
                "sources_count": 0,
                "sources": "",
                "best_distance": None,
                "avg_distance": None,
                "worst_distance": None,
                "source_count_with_distance": 0,
                "distance_class_temp": "error",
                "api_latency_seconds": None,
                "client_elapsed_seconds": None,
            })

    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    with JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(full_results, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 100)
    print("Summary by expected quality")
    print("=" * 100)

    groups = {}

    for row in rows:
        key = row["expected_quality"]
        groups.setdefault(key, []).append(row)

    for quality, items in groups.items():
        numeric_best = [
            item["best_distance"]
            for item in items
            if isinstance(item["best_distance"], (int, float))
        ]

        print()
        print(f"{quality.upper()}")
        print(f"Questions: {len(items)}")

        if numeric_best:
            print(f"Best distance min: {min(numeric_best):.3f}")
            print(f"Best distance avg: {mean(numeric_best):.3f}")
            print(f"Best distance max: {max(numeric_best):.3f}")
        else:
            print("No distances found.")

    print()
    print("=" * 100)
    print("Saved files")
    print("=" * 100)
    print(f"CSV:  {CSV_PATH}")
    print(f"JSON: {JSON_PATH}")

    print()
    print("Next:")
    print("Open the CSV and compare good/medium/weak/bad questions.")
    print("Use the distance gap to choose STRONG_DISTANCE and WEAK_DISTANCE.")


if __name__ == "__main__":
    main()