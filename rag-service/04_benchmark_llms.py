import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

import chromadb
import pandas as pd
import requests


# =========================
# Config
# =========================

CHROMA_PATH = "vector_store/chroma"
COLLECTION_NAME = "maintenance_records"

EMBED_MODEL = "nomic-embed-text"

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

QUESTIONS_PATH = Path("data/rag_benchmark_questions.json")

RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")
RESULTS_PATH = Path(f"results/llm_benchmark_results_{RUN_ID}.csv")
SUMMARY_PATH = Path(f"results/llm_benchmark_summary_{RUN_ID}.csv")

TOP_K_PER_TYPE = 3
MAX_CONTEXT_RECORDS = 10

MODELS = [
    "qwen3:1.7b",
    "qwen3:4b",
    "qwen3:8b",
    "phi4-mini:3.8b",
    "gemma3:4b",
]


# =========================
# Chroma
# =========================

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_collection(name=COLLECTION_NAME)


# =========================
# Ollama helpers
# =========================

def ollama_embed(text: str) -> List[float]:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBED_MODEL,
            "prompt": text,
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def ollama_generate(model: str, prompt: str) -> Dict[str, Any]:
    start = time.time()

    response = requests.post(
        OLLAMA_GENERATE_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0
            }
        },
        timeout=900,
    )

    elapsed = time.time() - start
    response.raise_for_status()

    data = response.json()

    return {
        "answer": data.get("response", ""),
        "generation_time_seconds": elapsed,
        "eval_count": data.get("eval_count"),
        "eval_duration": data.get("eval_duration"),
        "prompt_eval_count": data.get("prompt_eval_count"),
        "prompt_eval_duration": data.get("prompt_eval_duration"),
        "total_duration": data.get("total_duration"),
        "load_duration": data.get("load_duration"),
    }


# =========================
# Routing logic
# =========================

def add_once(items: List[str], value: str):
    if value not in items:
        items.append(value)


def infer_record_types(question: str) -> List[str]:
    q = question.lower()
    record_types: List[str] = []

    if any(word in q for word in [
        "delay", "delayed", "waiting", "blocked", "unavailable",
        "spare part", "stock", "below minimum", "out of stock",
        "not available", "hold", "on hold"
    ]):
        add_once(record_types, "tasks")
        add_once(record_types, "work_orders")

    if any(word in q for word in [
        "claim", "claims", "reported", "severity", "rejected",
        "qualified", "qualification", "complaint", "request",
        "reported issue"
    ]):
        add_once(record_types, "claims")

    if any(word in q for word in [
        "work order", "wo", "repair", "maintenance", "completed",
        "cancelled", "canceled", "assigned", "scheduled",
        "validated", "closed"
    ]):
        add_once(record_types, "work_orders")

    if any(word in q for word in [
        "task", "tasks", "subtask", "technician",
        "corrective action", "blocked reason", "failure reason"
    ]):
        add_once(record_types, "tasks")

    if any(word in q for word in [
        "equipment", "asset", "machine", "pump", "ventilator",
        "autoclave", "compressor", "monitor", "refrigerator",
        "chiller", "ups", "analyzer", "surgical light",
        "infusion pump"
    ]):
        add_once(record_types, "equipment")
        add_once(record_types, "claims")
        add_once(record_types, "work_orders")

    if any(word in q for word in [
        "cancelled", "canceled", "cancellation", "why was"
    ]):
        add_once(record_types, "work_orders")

    if not record_types:
        record_types = ["claims", "work_orders", "tasks", "equipment"]

    return record_types


# =========================
# Retrieval
# =========================

def search_one_type(
    question_embedding: List[float],
    record_type: str,
    top_k: int
) -> List[Dict[str, Any]]:
    result = collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        where={"record_type": record_type},
    )

    rows = []

    ids = result["ids"][0]
    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]

    for record_id, document, metadata, distance in zip(
        ids,
        documents,
        metadatas,
        distances,
    ):
        rows.append({
            "id": record_id,
            "document": document,
            "metadata": metadata,
            "distance": float(distance),
            "record_type": record_type,
        })

    return rows


def retrieve_context(question: str) -> Dict[str, Any]:
    retrieval_start = time.time()

    selected_record_types = infer_record_types(question)
    question_embedding = ollama_embed(question)

    all_results = []

    for record_type in selected_record_types:
        try:
            all_results.extend(
                search_one_type(
                    question_embedding=question_embedding,
                    record_type=record_type,
                    top_k=TOP_K_PER_TYPE,
                )
            )
        except Exception as e:
            print(f"Skipping {record_type}: {e}")

    all_results.sort(key=lambda x: x["distance"])
    top_results = all_results[:MAX_CONTEXT_RECORDS]

    context_parts = []
    source_ids = []

    for item in top_results:
        source_id = item["id"]
        source_ids.append(source_id)

        context_parts.append(
            f"Source ID: {source_id}\n"
            f"Record type: {item['record_type']}\n"
            f"Distance: {item['distance']}\n"
            f"Metadata: {item['metadata']}\n"
            f"Record content:\n{item['document']}"
        )

    retrieval_time = time.time() - retrieval_start

    return {
        "context": "\n\n---\n\n".join(context_parts),
        "sources": source_ids,
        "selected_record_types": selected_record_types,
        "retrieval_time_seconds": retrieval_time,
    }


# =========================
# Prompt
# =========================

def build_prompt(question: str, context: str, sources: List[str]) -> str:
    sources_text = ", ".join(sources)

    return f"""
You are a CMMS maintenance database assistant.

You must answer using ONLY the provided database context.

Rules:
1. Do not invent IDs, dates, names, causes, statuses, costs, spare parts, or technicians.
2. If the answer is not directly supported by the context, say:
   "I do not have enough information in the database."
3. Always cite the exact Source ID strings you used.
4. Do not cite only the numeric ID. Use the full source ID, such as work_orders_136 or tasks_155.
5. Keep the answer practical and concise for maintenance staff.
6. If multiple records support the answer, summarize the pattern and cite all relevant Source IDs.

Available source IDs:
{sources_text}

Database context:
{context}

User question:
{question}

Answer:
""".strip()


# =========================
# Scoring helpers
# =========================

def keyword_score(answer: str, expected_keywords: List[str]) -> float:
    if not expected_keywords:
        return 0.0

    answer_lower = answer.lower()
    hits = 0

    for keyword in expected_keywords:
        if keyword.lower() in answer_lower:
            hits += 1

    return hits / len(expected_keywords)


def source_score(answer: str, expected_sources: List[str]) -> float:
    if not expected_sources:
        return 0.0

    hits = 0

    for source in expected_sources:
        if source in answer:
            hits += 1

    return hits / len(expected_sources)


def must_not_include_violations(answer: str, forbidden_terms: List[str]) -> int:
    if not forbidden_terms:
        return 0

    answer_lower = answer.lower()
    count = 0

    for term in forbidden_terms:
        if term.lower() in answer_lower:
            count += 1

    return count


def has_not_enough_info(answer: str) -> bool:
    return "do not have enough information" in answer.lower()


def expected_not_enough_info(question_item: Dict[str, Any]) -> bool:
    return question_item.get("expected_answer_type") == "not_enough_information"


def tokens_per_second(eval_count: Optional[int], eval_duration: Optional[int]) -> Optional[float]:
    if not eval_count or not eval_duration:
        return None

    seconds = eval_duration / 1_000_000_000

    if seconds <= 0:
        return None

    return eval_count / seconds


def score_not_enough_correct(
    not_enough: bool,
    not_enough_expected: bool
) -> Optional[bool]:
    if not_enough_expected:
        return not_enough
    return None


def calculate_overall_auto_score(
    keyword_score_value: float,
    source_score_value: float,
    violation_count: int,
    not_enough: bool,
    not_enough_expected: bool
) -> float:
    hallucination_score = 1.0 if violation_count == 0 else 0.0

    if not_enough_expected:
        not_enough_score = 1.0 if not_enough else 0.0
        return round(
            0.20 * keyword_score_value +
            0.20 * source_score_value +
            0.30 * hallucination_score +
            0.30 * not_enough_score,
            3
        )

    # Penalize unsupported "not enough info" on normal questions.
    not_enough_penalty = 0.0 if not_enough else 1.0

    return round(
        0.40 * keyword_score_value +
        0.35 * source_score_value +
        0.15 * hallucination_score +
        0.10 * not_enough_penalty,
        3
    )


# =========================
# Summary helper
# =========================

def save_summary(df: pd.DataFrame):
    summary = df.groupby("model").agg(
        completed_answers=("answer", "count"),
        avg_total_latency=("total_latency_seconds", "mean"),
        avg_retrieval_time=("retrieval_time_seconds", "mean"),
        avg_generation_time=("generation_time_seconds", "mean"),
        avg_tokens_per_second=("tokens_per_second", "mean"),
        avg_keyword_score=("keyword_score", "mean"),
        avg_source_score=("source_score", "mean"),
        avg_overall_auto_score=("overall_auto_score", "mean"),
        total_must_not_include_violations=("must_not_include_violations", "sum"),
        not_enough_rate=("not_enough_info", "mean"),
    ).reset_index()

    summary.to_csv(SUMMARY_PATH, index=False, encoding="utf-8")

    print()
    print("Current summary:")
    print(summary.to_string(index=False))


# =========================
# Main benchmark
# =========================

def main():
    RESULTS_PATH.parent.mkdir(exist_ok=True)

    if not QUESTIONS_PATH.exists():
        raise FileNotFoundError(
            f"Missing {QUESTIONS_PATH}. Put rag_benchmark_questions.json inside the data folder."
        )

    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    print(f"Benchmark run ID: {RUN_ID}")
    print(f"Questions: {len(questions)}")
    print(f"Models: {MODELS}")
    print(f"Results file: {RESULTS_PATH}")
    print(f"Summary file: {SUMMARY_PATH}")

    rows = []

    for question_item in questions:
        question_id = question_item["id"]
        question = question_item["question"]

        print()
        print("=" * 80)
        print(f"{question_id}: {question}")
        print("=" * 80)

        retrieval_start = time.time()
        retrieved = retrieve_context(question)
        retrieval_time = time.time() - retrieval_start

        context = retrieved["context"]
        sources = retrieved["sources"]
        selected_record_types = retrieved["selected_record_types"]

        prompt = build_prompt(question, context, sources)

        for model in MODELS:
            print(f"Testing {model}...")

            run_start = time.time()

            try:
                result = ollama_generate(model, prompt)

                answer = result["answer"]
                generation_time = result["generation_time_seconds"]
                total_latency = time.time() - run_start + retrieval_time

                expected_keywords = question_item.get("expected_keywords", [])
                expected_sources = question_item.get("expected_sources", [])
                forbidden_terms = question_item.get("must_not_include", [])

                keyword_score_value = keyword_score(answer, expected_keywords)
                source_score_value = source_score(answer, expected_sources)
                violation_count = must_not_include_violations(answer, forbidden_terms)

                not_enough = has_not_enough_info(answer)
                not_enough_expected = expected_not_enough_info(question_item)
                not_enough_correct = score_not_enough_correct(
                    not_enough=not_enough,
                    not_enough_expected=not_enough_expected,
                )

                tps = tokens_per_second(
                    result.get("eval_count"),
                    result.get("eval_duration"),
                )

                overall_score = calculate_overall_auto_score(
                    keyword_score_value=keyword_score_value,
                    source_score_value=source_score_value,
                    violation_count=violation_count,
                    not_enough=not_enough,
                    not_enough_expected=not_enough_expected,
                )

                rows.append({
                    "run_id": RUN_ID,
                    "question_id": question_id,
                    "question": question,
                    "question_type": question_item.get("type", ""),
                    "expected_answer_type": question_item.get("expected_answer_type", ""),
                    "model": model,
                    "embedding_model": EMBED_MODEL,
                    "top_k_per_type": TOP_K_PER_TYPE,
                    "max_context_records": MAX_CONTEXT_RECORDS,
                    "selected_record_types": ",".join(selected_record_types),
                    "retrieved_sources": ",".join(sources),
                    "expected_sources": ",".join(expected_sources),
                    "expected_keywords": "|".join(expected_keywords),
                    "must_not_include": "|".join(forbidden_terms),
                    "retrieval_time_seconds": round(retrieval_time, 3),
                    "generation_time_seconds": round(generation_time, 3),
                    "total_latency_seconds": round(total_latency, 3),
                    "eval_count": result.get("eval_count"),
                    "eval_duration": result.get("eval_duration"),
                    "prompt_eval_count": result.get("prompt_eval_count"),
                    "prompt_eval_duration": result.get("prompt_eval_duration"),
                    "tokens_per_second": round(tps, 3) if tps is not None else None,
                    "keyword_score": round(keyword_score_value, 3),
                    "source_score": round(source_score_value, 3),
                    "must_not_include_violations": violation_count,
                    "not_enough_info": not_enough,
                    "not_enough_info_expected": not_enough_expected,
                    "not_enough_info_correct": not_enough_correct,
                    "overall_auto_score": overall_score,
                    "answer": answer,
                })

                print(
                    f"  total={total_latency:.2f}s "
                    f"gen={generation_time:.2f}s "
                    f"score={overall_score:.3f} "
                    f"kw={keyword_score_value:.2f} "
                    f"src={source_score_value:.2f} "
                    f"viol={violation_count}"
                )

            except KeyboardInterrupt:
                print()
                print("Benchmark interrupted by user. Saving partial results...")
                df = pd.DataFrame(rows)
                df.to_csv(RESULTS_PATH, index=False, encoding="utf-8")
                if not df.empty:
                    save_summary(df)
                print(f"Partial results saved to {RESULTS_PATH}")
                raise

            except Exception as e:
                total_latency = time.time() - run_start + retrieval_time

                rows.append({
                    "run_id": RUN_ID,
                    "question_id": question_id,
                    "question": question,
                    "question_type": question_item.get("type", ""),
                    "expected_answer_type": question_item.get("expected_answer_type", ""),
                    "model": model,
                    "embedding_model": EMBED_MODEL,
                    "top_k_per_type": TOP_K_PER_TYPE,
                    "max_context_records": MAX_CONTEXT_RECORDS,
                    "selected_record_types": ",".join(selected_record_types),
                    "retrieved_sources": ",".join(sources),
                    "expected_sources": ",".join(question_item.get("expected_sources", [])),
                    "expected_keywords": "|".join(question_item.get("expected_keywords", [])),
                    "must_not_include": "|".join(question_item.get("must_not_include", [])),
                    "retrieval_time_seconds": round(retrieval_time, 3),
                    "generation_time_seconds": None,
                    "total_latency_seconds": round(total_latency, 3),
                    "eval_count": None,
                    "eval_duration": None,
                    "prompt_eval_count": None,
                    "prompt_eval_duration": None,
                    "tokens_per_second": None,
                    "keyword_score": 0.0,
                    "source_score": 0.0,
                    "must_not_include_violations": None,
                    "not_enough_info": None,
                    "not_enough_info_expected": expected_not_enough_info(question_item),
                    "not_enough_info_correct": None,
                    "overall_auto_score": 0.0,
                    "answer": f"ERROR: {e}",
                })

                print(f"  ERROR: {e}")

            # Save after every model answer.
            df = pd.DataFrame(rows)
            df.to_csv(RESULTS_PATH, index=False, encoding="utf-8")
            save_summary(df)

    df = pd.DataFrame(rows)
    df.to_csv(RESULTS_PATH, index=False, encoding="utf-8")
    save_summary(df)

    print()
    print("Benchmark complete.")
    print(f"Saved results to {RESULTS_PATH}")
    print(f"Saved summary to {SUMMARY_PATH}")


if __name__ == "__main__":
    main()