import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
import pandas as pd
import requests


# ============================================================
# Final LLM benchmark
# Embedding fixed: nomic-embed-text
# Collection fixed: maintenance_records_nomic
# Models: 5 local LLMs
# Questions: 100 semantic RAG questions
# ============================================================

CHROMA_PATH = "vector_store/chroma"
QUESTIONS_PATH = Path("data/rag_benchmark_questions.json")
RESULTS_DIR = Path("results")

RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")

EMBEDDING_NAME = "nomic"
EMBEDDING_MODEL = "nomic-embed-text"
COLLECTION_NAME = "maintenance_records_nomic"

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

TOP_K_PER_TYPE = 3
MAX_CONTEXT_RECORDS = 10

MODELS = [
    "qwen3:1.7b",
    "qwen3:4b",
    "qwen3:8b",
    "phi4-mini:3.8b",
    "gemma3:4b",
]


def load_questions() -> List[Dict[str, Any]]:
    if not QUESTIONS_PATH.exists():
        raise FileNotFoundError(
            f"Missing {QUESTIONS_PATH}. Put the 100-question JSON there."
        )

    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    if not isinstance(questions, list):
        raise ValueError("Question file must contain a JSON list.")

    return questions


def add_once(items: List[str], value: str):
    if value not in items:
        items.append(value)


def infer_record_types(question: str) -> List[str]:
    q = question.lower()
    record_types: List[str] = []

    if any(w in q for w in [
        "delay", "delayed", "waiting", "blocked", "unavailable",
        "spare part", "stock", "below minimum", "out of stock",
        "not available", "hold", "on hold"
    ]):
        add_once(record_types, "tasks")
        add_once(record_types, "work_orders")

    if any(w in q for w in [
        "claim", "claims", "reported", "severity", "rejected",
        "qualified", "qualification", "complaint", "request",
        "reported issue"
    ]):
        add_once(record_types, "claims")

    if any(w in q for w in [
        "work order", "wo", "repair", "maintenance", "completed",
        "cancelled", "canceled", "assigned", "scheduled",
        "validated", "closed"
    ]):
        add_once(record_types, "work_orders")

    if any(w in q for w in [
        "task", "tasks", "subtask", "technician",
        "corrective action", "blocked reason", "failure reason"
    ]):
        add_once(record_types, "tasks")

    if any(w in q for w in [
        "equipment", "asset", "machine", "pump", "ventilator",
        "autoclave", "compressor", "monitor", "refrigerator",
        "chiller", "ups", "analyzer", "surgical light",
        "infusion pump"
    ]):
        add_once(record_types, "equipment")
        add_once(record_types, "claims")
        add_once(record_types, "work_orders")

    if any(w in q for w in [
        "cancelled", "canceled", "cancellation", "why was"
    ]):
        add_once(record_types, "work_orders")

    if not record_types:
        record_types = ["claims", "work_orders", "tasks", "equipment"]

    return record_types


def ollama_embed(text: str) -> List[float]:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBEDDING_MODEL,
            "prompt": text,
        },
        timeout=180,
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


def search_one_type(
    collection,
    question_embedding: List[float],
    record_type: str,
    top_k: int,
) -> List[Dict[str, Any]]:
    result = collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        where={"record_type": record_type},
    )

    rows = []

    for record_id, document, metadata, distance in zip(
        result["ids"][0],
        result["documents"][0],
        result["metadatas"][0],
        result["distances"][0],
    ):
        rows.append({
            "id": record_id,
            "document": document,
            "metadata": metadata,
            "distance": float(distance),
            "record_type": record_type,
        })

    return rows


def retrieve_context(client, question: str) -> Dict[str, Any]:
    start = time.time()

    collection = client.get_collection(COLLECTION_NAME)
    selected_record_types = infer_record_types(question)
    question_embedding = ollama_embed(question)

    all_results = []

    for record_type in selected_record_types:
        try:
            all_results.extend(
                search_one_type(
                    collection=collection,
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

    return {
        "context": "\n\n---\n\n".join(context_parts),
        "sources": source_ids,
        "selected_record_types": selected_record_types,
        "retrieval_time_seconds": time.time() - start,
    }


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


def normalize_expected_sources(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return []


def keyword_score(answer: str, expected_keywords: List[str]) -> float:
    if not expected_keywords:
        return 0.0

    text = answer.lower()
    hits = 0

    for keyword in expected_keywords:
        if keyword.lower() in text:
            hits += 1

    return hits / len(expected_keywords)


def source_score(answer: str, expected_sources: List[str]) -> float:
    if not expected_sources:
        return 1.0

    hits = 0

    for source in expected_sources:
        if source in answer:
            hits += 1

    return hits / len(expected_sources)


def must_not_include_violations(answer: str, forbidden_terms: List[str]) -> int:
    text = answer.lower()
    count = 0

    for term in forbidden_terms:
        if term.lower() in text:
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


def overall_score(
    keyword: float,
    source: float,
    violations: int,
    not_enough: bool,
    not_enough_expected: bool,
) -> float:
    hallucination_score = 1.0 if violations == 0 else 0.0

    if not_enough_expected:
        not_enough_score = 1.0 if not_enough else 0.0
        return round(
            0.20 * keyword +
            0.20 * source +
            0.30 * hallucination_score +
            0.30 * not_enough_score,
            3,
        )

    not_enough_penalty_score = 0.0 if not_enough else 1.0

    return round(
        0.40 * keyword +
        0.35 * source +
        0.15 * hallucination_score +
        0.10 * not_enough_penalty_score,
        3,
    )


def extract_cited_sources(answer: str) -> List[str]:
    return sorted(set(re.findall(
        r"\b(?:tasks|work_orders|claims|equipment)_[0-9]+\b",
        answer
    )))


def save_outputs(
    rows: List[Dict[str, Any]],
    results_path: Path,
    summary_path: Path,
    excel_path: Path,
):
    df = pd.DataFrame(rows)
    df.to_csv(results_path, index=False, encoding="utf-8")

    if df.empty:
        return

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
    ).reset_index().sort_values("avg_overall_auto_score", ascending=False)

    summary.to_csv(summary_path, index=False, encoding="utf-8")

    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        pd.DataFrame([{
            "run_id": RUN_ID,
            "questions_path": str(QUESTIONS_PATH),
            "embedding_name": EMBEDDING_NAME,
            "embedding_model": EMBEDDING_MODEL,
            "collection": COLLECTION_NAME,
            "models": ", ".join(MODELS),
            "top_k_per_type": TOP_K_PER_TYPE,
            "max_context_records": MAX_CONTEXT_RECORDS,
            "question_count": df["question_id"].nunique(),
        }]).to_excel(writer, sheet_name="Run_Config", index=False)

        summary.to_excel(writer, sheet_name="Model_Summary", index=False)

        category_summary = df.groupby(["model", "benchmark_category"]).agg(
            questions=("question_id", "count"),
            avg_score=("overall_auto_score", "mean"),
            avg_latency=("total_latency_seconds", "mean"),
        ).reset_index()
        category_summary.to_excel(writer, sheet_name="Category_Summary", index=False)

        type_summary = df.groupby(["model", "question_type"]).agg(
            questions=("question_id", "count"),
            avg_score=("overall_auto_score", "mean"),
            avg_latency=("total_latency_seconds", "mean"),
        ).reset_index()
        type_summary.to_excel(writer, sheet_name="Question_Type_Summary", index=False)

        df.sort_values("overall_auto_score", ascending=True).head(75).to_excel(
            writer,
            sheet_name="Low_Score_Review",
            index=False,
        )

        manual_review_cols = [
            "question_id",
            "question",
            "model",
            "answer",
            "retrieved_sources",
            "expected_sources",
            "overall_auto_score",
            "manual_accuracy_0_1",
            "manual_hallucination_0_1",
            "manual_citation_quality_0_1",
            "manual_notes",
        ]

        manual_df = df[manual_review_cols].copy()
        manual_df.to_excel(writer, sheet_name="Manual_Review", index=False)

        df.to_excel(writer, sheet_name="Detailed_Results", index=False)


def main():
    RESULTS_DIR.mkdir(exist_ok=True)

    questions = load_questions()
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    results_path = RESULTS_DIR / f"final_llm_nomic_results_{RUN_ID}.csv"
    summary_path = RESULTS_DIR / f"final_llm_nomic_summary_{RUN_ID}.csv"
    excel_path = RESULTS_DIR / f"final_llm_nomic_report_{RUN_ID}.xlsx"

    print(f"Run ID: {RUN_ID}")
    print(f"Questions: {len(questions)}")
    print(f"Embedding: {EMBEDDING_MODEL}")
    print(f"Collection: {COLLECTION_NAME}")
    print(f"Models: {MODELS}")
    print(f"Results: {results_path}")
    print(f"Excel: {excel_path}")

    rows = []

    for question_item in questions:
        question_id = question_item.get("id", "")
        question = question_item["question"]

        print()
        print("=" * 100)
        print(f"{question_id}: {question}")
        print("=" * 100)

        try:
            retrieved = retrieve_context(client, question)
            context = retrieved["context"]
            retrieved_sources = retrieved["sources"]
            selected_record_types = retrieved["selected_record_types"]
            retrieval_time = retrieved["retrieval_time_seconds"]
            prompt = build_prompt(question, context, retrieved_sources)

        except Exception as e:
            print(f"Retrieval error: {e}")
            context = ""
            retrieved_sources = []
            selected_record_types = []
            retrieval_time = None
            prompt = ""

        for model in MODELS:
            print(f"Testing {model}...")

            run_start = time.time()

            try:
                if not prompt:
                    raise RuntimeError("No prompt because retrieval failed.")

                result = ollama_generate(model, prompt)
                answer = result["answer"]

                expected_keywords = question_item.get("expected_keywords", [])
                expected_sources = normalize_expected_sources(question_item.get("expected_sources"))
                forbidden_terms = question_item.get("must_not_include", [])

                kw = keyword_score(answer, expected_keywords)
                src = source_score(answer, expected_sources)
                violations = must_not_include_violations(answer, forbidden_terms)

                not_enough = has_not_enough_info(answer)
                not_enough_expected = expected_not_enough_info(question_item)

                score = overall_score(
                    keyword=kw,
                    source=src,
                    violations=violations,
                    not_enough=not_enough,
                    not_enough_expected=not_enough_expected,
                )

                tps = tokens_per_second(
                    result.get("eval_count"),
                    result.get("eval_duration"),
                )

                cited_sources = extract_cited_sources(answer)
                invalid_cited_sources = [
                    s for s in cited_sources
                    if s not in retrieved_sources
                ]

                generation_time = result["generation_time_seconds"]
                total_latency = time.time() - run_start
                if retrieval_time is not None:
                    total_latency += retrieval_time

                rows.append({
                    "run_id": RUN_ID,
                    "question_id": question_id,
                    "question": question,
                    "benchmark_category": question_item.get("benchmark_category", ""),
                    "question_type": question_item.get("type", ""),
                    "expected_answer_type": question_item.get("expected_answer_type", ""),
                    "model": model,
                    "embedding_name": EMBEDDING_NAME,
                    "embedding_model": EMBEDDING_MODEL,
                    "collection": COLLECTION_NAME,
                    "top_k_per_type": TOP_K_PER_TYPE,
                    "max_context_records": MAX_CONTEXT_RECORDS,
                    "selected_record_types": ",".join(selected_record_types),
                    "retrieved_sources": ",".join(retrieved_sources),
                    "expected_sources": ",".join(expected_sources),
                    "cited_sources": ",".join(cited_sources),
                    "invalid_cited_sources": ",".join(invalid_cited_sources),
                    "expected_keywords": "|".join(expected_keywords),
                    "must_not_include": "|".join(forbidden_terms),
                    "retrieval_time_seconds": round(retrieval_time, 3) if retrieval_time is not None else None,
                    "generation_time_seconds": round(generation_time, 3),
                    "total_latency_seconds": round(total_latency, 3),
                    "eval_count": result.get("eval_count"),
                    "eval_duration": result.get("eval_duration"),
                    "prompt_eval_count": result.get("prompt_eval_count"),
                    "prompt_eval_duration": result.get("prompt_eval_duration"),
                    "tokens_per_second": round(tps, 3) if tps is not None else None,
                    "prompt_char_count": len(prompt),
                    "context_char_count": len(context),
                    "answer_word_count": len(answer.split()),
                    "keyword_score": round(kw, 3),
                    "source_score": round(src, 3),
                    "must_not_include_violations": violations,
                    "not_enough_info": not_enough,
                    "not_enough_info_expected": not_enough_expected,
                    "not_enough_info_correct": not_enough if not_enough_expected else None,
                    "overall_auto_score": score,
                    "answer": answer,
                    "manual_accuracy_0_1": "",
                    "manual_hallucination_0_1": "",
                    "manual_citation_quality_0_1": "",
                    "manual_notes": "",
                })

                print(
                    f"  score={score:.3f} "
                    f"total={total_latency:.1f}s "
                    f"gen={generation_time:.1f}s "
                    f"kw={kw:.2f} "
                    f"src={src:.2f} "
                    f"viol={violations}"
                )

            except KeyboardInterrupt:
                print()
                print("Interrupted. Saving partial files...")
                save_outputs(rows, results_path, summary_path, excel_path)
                raise

            except Exception as e:
                print(f"  ERROR: {e}")

                rows.append({
                    "run_id": RUN_ID,
                    "question_id": question_id,
                    "question": question,
                    "benchmark_category": question_item.get("benchmark_category", ""),
                    "question_type": question_item.get("type", ""),
                    "expected_answer_type": question_item.get("expected_answer_type", ""),
                    "model": model,
                    "embedding_name": EMBEDDING_NAME,
                    "embedding_model": EMBEDDING_MODEL,
                    "collection": COLLECTION_NAME,
                    "selected_record_types": ",".join(selected_record_types),
                    "retrieved_sources": ",".join(retrieved_sources),
                    "expected_sources": ",".join(normalize_expected_sources(question_item.get("expected_sources"))),
                    "answer": f"ERROR: {e}",
                    "overall_auto_score": 0.0,
                })

            save_outputs(rows, results_path, summary_path, excel_path)

    save_outputs(rows, results_path, summary_path, excel_path)

    print()
    print("Benchmark complete.")
    print(f"Results CSV: {results_path}")
    print(f"Summary CSV: {summary_path}")
    print(f"Excel report: {excel_path}")


if __name__ == "__main__":
    main()