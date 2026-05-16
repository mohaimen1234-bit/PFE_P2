import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
import pandas as pd
import requests
from sentence_transformers import SentenceTransformer


CHROMA_PATH = "vector_store/chroma"
QUESTIONS_PATH = Path("data/rag_benchmark_questions.json")
RESULTS_DIR = Path("results")
RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")

EMBEDDINGS = [
    {"name": "nomic", "type": "ollama", "model": "nomic-embed-text", "collection": "maintenance_records_nomic"},
    {"name": "bge_m3", "type": "ollama", "model": "bge-m3", "collection": "maintenance_records_bge_m3"},
    {"name": "e5_large", "type": "sentence_transformers", "model": "intfloat/multilingual-e5-large", "collection": "maintenance_records_e5_large"},
    {"name": "minilm", "type": "sentence_transformers", "model": "sentence-transformers/all-MiniLM-L6-v2", "collection": "maintenance_records_minilm"},
]

FINAL_LLM_MODELS = ["qwen3:1.7b", "qwen3:8b", "gemma3:4b"]

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

TOP_K_PER_TYPE_RETRIEVAL_BENCH = 5
TOP_K_PER_TYPE_LLM_BENCH = 3
MAX_CONTEXT_RECORDS = 10

_st_cache: Dict[str, SentenceTransformer] = {}


def load_questions() -> List[Dict[str, Any]]:
    if not QUESTIONS_PATH.exists():
        raise FileNotFoundError(f"Missing {QUESTIONS_PATH}. Put the 100-question JSON there.")
    return json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))


def add_once(items: List[str], value: str):
    if value not in items:
        items.append(value)


def infer_record_types(question: str) -> List[str]:
    q = question.lower()
    record_types: List[str] = []

    if any(w in q for w in ["delay", "delayed", "waiting", "blocked", "unavailable", "spare part", "stock", "below minimum", "out of stock", "not available", "hold", "on hold"]):
        add_once(record_types, "tasks")
        add_once(record_types, "work_orders")

    if any(w in q for w in ["claim", "claims", "reported", "severity", "rejected", "qualified", "qualification", "complaint", "request", "reported issue"]):
        add_once(record_types, "claims")

    if any(w in q for w in ["work order", "wo", "repair", "maintenance", "completed", "cancelled", "canceled", "assigned", "scheduled", "validated", "closed"]):
        add_once(record_types, "work_orders")

    if any(w in q for w in ["task", "tasks", "subtask", "technician", "corrective action", "blocked reason", "failure reason"]):
        add_once(record_types, "tasks")

    if any(w in q for w in ["equipment", "asset", "machine", "pump", "ventilator", "autoclave", "compressor", "monitor", "refrigerator", "chiller", "ups", "analyzer", "surgical light", "infusion pump"]):
        add_once(record_types, "equipment")
        add_once(record_types, "claims")
        add_once(record_types, "work_orders")

    if any(w in q for w in ["cancelled", "canceled", "cancellation", "why was"]):
        add_once(record_types, "work_orders")

    return record_types or ["claims", "work_orders", "tasks", "equipment"]


def embed_ollama(text: str, model: str) -> List[float]:
    response = requests.post(OLLAMA_EMBED_URL, json={"model": model, "prompt": text}, timeout=180)
    response.raise_for_status()
    return response.json()["embedding"]


def embed_sentence_transformer(text: str, model_name: str) -> List[float]:
    if model_name not in _st_cache:
        print(f"Loading sentence-transformers model: {model_name}")
        _st_cache[model_name] = SentenceTransformer(model_name)
    if "multilingual-e5" in model_name.lower():
        text = f"query: {text}"
    embedding = _st_cache[model_name].encode(text, normalize_embeddings=True, show_progress_bar=False)
    return embedding.tolist()


def embed_query(question: str, emb: Dict[str, Any]) -> List[float]:
    if emb["type"] == "ollama":
        return embed_ollama(question, emb["model"])
    return embed_sentence_transformer(question, emb["model"])


def get_collection(client, collection_name: str):
    try:
        return client.get_collection(collection_name)
    except Exception as e:
        raise RuntimeError(f"Missing collection {collection_name}. Run 05_build_embedding_indexes.py first.") from e


def search_one_type(collection, question_embedding: List[float], record_type: str, top_k: int) -> List[Dict[str, Any]]:
    result = collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        where={"record_type": record_type},
    )
    rows = []
    for record_id, doc, metadata, distance in zip(result["ids"][0], result["documents"][0], result["metadatas"][0], result["distances"][0]):
        rows.append({
            "id": record_id,
            "document": doc,
            "metadata": metadata,
            "distance": float(distance),
            "record_type": record_type,
        })
    return rows


def retrieve(client, question: str, emb: Dict[str, Any], top_k_per_type: int) -> Dict[str, Any]:
    start = time.time()
    collection = get_collection(client, emb["collection"])
    selected_types = infer_record_types(question)
    question_embedding = embed_query(question, emb)
    all_results = []
    for record_type in selected_types:
        try:
            all_results.extend(search_one_type(collection, question_embedding, record_type, top_k_per_type))
        except Exception as e:
            print(f"Skipping {record_type}: {e}")
    all_results.sort(key=lambda x: x["distance"])
    return {
        "selected_record_types": selected_types,
        "results": all_results,
        "retrieval_time_seconds": time.time() - start,
    }


def normalize_expected_sources(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return []


def best_rank(retrieved_ids: List[str], expected_sources: List[str]) -> Optional[int]:
    for i, source_id in enumerate(retrieved_ids, start=1):
        if source_id in expected_sources:
            return i
    return None


def hit_at_k(retrieved_ids: List[str], expected_sources: List[str], k: int) -> bool:
    return any(source_id in retrieved_ids[:k] for source_id in expected_sources)


def source_hit_rate(retrieved_ids: List[str], expected_sources: List[str]) -> Optional[float]:
    if not expected_sources:
        return None
    return sum(1 for s in expected_sources if s in retrieved_ids) / len(expected_sources)


def mrr(rank: Optional[int]) -> float:
    return 0.0 if rank is None else 1.0 / rank


def build_context(results: List[Dict[str, Any]]):
    top_results = results[:MAX_CONTEXT_RECORDS]
    source_ids = []
    parts = []
    for item in top_results:
        source_id = item["id"]
        source_ids.append(source_id)
        parts.append(
            f"Source ID: {source_id}\n"
            f"Record type: {item['record_type']}\n"
            f"Distance: {item['distance']}\n"
            f"Metadata: {item['metadata']}\n"
            f"Record content:\n{item['document']}"
        )
    return "\n\n---\n\n".join(parts), source_ids


def build_prompt(question: str, context: str, sources: List[str]) -> str:
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
{", ".join(sources)}

Database context:
{context}

User question:
{question}

Answer:
""".strip()


def ollama_generate(model: str, prompt: str) -> Dict[str, Any]:
    start = time.time()
    response = requests.post(
        OLLAMA_GENERATE_URL,
        json={"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0}},
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
    }


def keyword_score(answer: str, expected_keywords: List[str]) -> float:
    if not expected_keywords:
        return 0.0
    text = answer.lower()
    return sum(1 for k in expected_keywords if k.lower() in text) / len(expected_keywords)


def answer_source_score(answer: str, expected_sources: List[str]) -> float:
    if not expected_sources:
        return 1.0
    return sum(1 for s in expected_sources if s in answer) / len(expected_sources)


def must_not_include_violations(answer: str, forbidden_terms: List[str]) -> int:
    text = answer.lower()
    return sum(1 for t in forbidden_terms if t.lower() in text)


def has_not_enough_info(answer: str) -> bool:
    return "do not have enough information" in answer.lower()


def expected_not_enough_info(q: Dict[str, Any]) -> bool:
    return q.get("expected_answer_type") == "not_enough_information"


def tokens_per_second(eval_count: Optional[int], eval_duration: Optional[int]) -> Optional[float]:
    if not eval_count or not eval_duration:
        return None
    seconds = eval_duration / 1_000_000_000
    return None if seconds <= 0 else eval_count / seconds


def overall_score(keyword: float, source: float, violations: int, not_enough: bool, not_enough_expected: bool) -> float:
    hallucination_score = 1.0 if violations == 0 else 0.0
    if not_enough_expected:
        not_enough_score = 1.0 if not_enough else 0.0
        return round(0.20 * keyword + 0.20 * source + 0.30 * hallucination_score + 0.30 * not_enough_score, 3)
    not_enough_penalty_score = 0.0 if not_enough else 1.0
    return round(0.40 * keyword + 0.35 * source + 0.15 * hallucination_score + 0.10 * not_enough_penalty_score, 3)


def extract_cited_sources(answer: str) -> List[str]:
    return sorted(set(re.findall(r"\b(?:tasks|work_orders|claims|equipment)_[0-9]+\b", answer)))


def save_excel_report(xlsx_path: Path, emb_results: pd.DataFrame, emb_summary: pd.DataFrame, llm_results: pd.DataFrame, llm_summary: pd.DataFrame, config: Dict[str, Any]):
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        pd.DataFrame([config]).to_excel(writer, sheet_name="Run_Config", index=False)
        emb_summary.to_excel(writer, sheet_name="Embedding_Summary", index=False)
        emb_results.to_excel(writer, sheet_name="Embedding_Details", index=False)
        llm_summary.to_excel(writer, sheet_name="LLM_Summary", index=False)
        llm_results.to_excel(writer, sheet_name="LLM_Details", index=False)
        if not llm_results.empty:
            llm_results.sort_values("overall_auto_score", ascending=True).head(50).to_excel(writer, sheet_name="Low_Score_Review", index=False)


def run_embedding_benchmark(client, questions: List[Dict[str, Any]]):
    print("#" * 100)
    print("PHASE 1: EMBEDDING RETRIEVAL BENCHMARK")
    print("#" * 100)

    questions_with_sources = [q for q in questions if normalize_expected_sources(q.get("expected_sources"))]
    print(f"Questions with expected sources: {len(questions_with_sources)}")

    rows = []
    for emb in EMBEDDINGS:
        print(f"\nEmbedding: {emb['name']} ({emb['model']})")
        for q in questions_with_sources:
            expected_sources = normalize_expected_sources(q.get("expected_sources"))
            try:
                ret = retrieve(client, q["question"], emb, TOP_K_PER_TYPE_RETRIEVAL_BENCH)
                retrieved_ids = [r["id"] for r in ret["results"][:10]]
                rank = best_rank(retrieved_ids, expected_sources)
                rows.append({
                    "run_id": RUN_ID,
                    "question_id": q.get("id", ""),
                    "question": q["question"],
                    "benchmark_category": q.get("benchmark_category", ""),
                    "question_type": q.get("type", ""),
                    "embedding_name": emb["name"],
                    "embedding_model": emb["model"],
                    "collection": emb["collection"],
                    "selected_record_types": ",".join(ret["selected_record_types"]),
                    "expected_sources": ",".join(expected_sources),
                    "retrieved_sources_top10": ",".join(retrieved_ids),
                    "best_rank": rank,
                    "mrr": mrr(rank),
                    "hit_at_1": hit_at_k(retrieved_ids, expected_sources, 1),
                    "hit_at_3": hit_at_k(retrieved_ids, expected_sources, 3),
                    "hit_at_5": hit_at_k(retrieved_ids, expected_sources, 5),
                    "hit_at_10": hit_at_k(retrieved_ids, expected_sources, 10),
                    "expected_source_hit_rate": source_hit_rate(retrieved_ids, expected_sources),
                    "retrieval_time_seconds": round(ret["retrieval_time_seconds"], 3),
                })
            except Exception as e:
                print(f"  ERROR {q.get('id')}: {e}")
                rows.append({
                    "run_id": RUN_ID,
                    "question_id": q.get("id", ""),
                    "question": q["question"],
                    "benchmark_category": q.get("benchmark_category", ""),
                    "question_type": q.get("type", ""),
                    "embedding_name": emb["name"],
                    "embedding_model": emb["model"],
                    "collection": emb["collection"],
                    "selected_record_types": "",
                    "expected_sources": ",".join(expected_sources),
                    "retrieved_sources_top10": "",
                    "best_rank": None,
                    "mrr": 0.0,
                    "hit_at_1": False,
                    "hit_at_3": False,
                    "hit_at_5": False,
                    "hit_at_10": False,
                    "expected_source_hit_rate": 0.0,
                    "retrieval_time_seconds": None,
                    "error": str(e),
                })

            pd.DataFrame(rows).to_csv(RESULTS_DIR / f"embedding_benchmark_results_{RUN_ID}.csv", index=False, encoding="utf-8")

    df = pd.DataFrame(rows)
    summary = df.groupby(["embedding_name", "embedding_model", "collection"]).agg(
        evaluated_questions=("question_id", "count"),
        hit_at_1=("hit_at_1", "mean"),
        hit_at_3=("hit_at_3", "mean"),
        hit_at_5=("hit_at_5", "mean"),
        hit_at_10=("hit_at_10", "mean"),
        avg_mrr=("mrr", "mean"),
        avg_expected_source_hit_rate=("expected_source_hit_rate", "mean"),
        avg_retrieval_time_seconds=("retrieval_time_seconds", "mean"),
    ).reset_index()

    summary["embedding_decision_score"] = (
        0.35 * summary["hit_at_5"] +
        0.25 * summary["avg_expected_source_hit_rate"] +
        0.20 * summary["hit_at_3"] +
        0.15 * summary["avg_mrr"] +
        0.05 * summary["hit_at_10"]
    ).round(4)

    summary = summary.sort_values("embedding_decision_score", ascending=False)
    best_embedding = next(e for e in EMBEDDINGS if e["name"] == summary.iloc[0]["embedding_name"])

    df.to_csv(RESULTS_DIR / f"embedding_benchmark_results_{RUN_ID}.csv", index=False, encoding="utf-8")
    summary.to_csv(RESULTS_DIR / f"embedding_benchmark_summary_{RUN_ID}.csv", index=False, encoding="utf-8")

    print("\nEmbedding summary:")
    print(summary.to_string(index=False))
    print(f"\nBest embedding selected: {best_embedding['name']} ({best_embedding['model']})")

    return df, summary, best_embedding


def run_final_llm_benchmark(client, questions: List[Dict[str, Any]], best_embedding: Dict[str, Any]):
    print("#" * 100)
    print("PHASE 2: FINAL LLM BENCHMARK WITH BEST EMBEDDING")
    print("#" * 100)

    rows = []
    for q in questions:
        print(f"\n{q.get('id', '')}: {q['question']}")
        try:
            ret = retrieve(client, q["question"], best_embedding, TOP_K_PER_TYPE_LLM_BENCH)
            context, retrieved_sources = build_context(ret["results"])
            prompt = build_prompt(q["question"], context, retrieved_sources)
        except Exception as e:
            print(f"Retrieval error: {e}")
            ret = None
            context = ""
            retrieved_sources = []
            prompt = ""

        for model in FINAL_LLM_MODELS:
            print(f"  Testing {model}...")
            start = time.time()
            try:
                if not prompt:
                    raise RuntimeError("No prompt because retrieval failed.")
                result = ollama_generate(model, prompt)
                answer = result["answer"]

                expected_keywords = q.get("expected_keywords", [])
                expected_sources = normalize_expected_sources(q.get("expected_sources"))
                forbidden_terms = q.get("must_not_include", [])

                kw = keyword_score(answer, expected_keywords)
                src = answer_source_score(answer, expected_sources)
                violations = must_not_include_violations(answer, forbidden_terms)
                not_enough = has_not_enough_info(answer)
                not_enough_expected = expected_not_enough_info(q)
                score = overall_score(kw, src, violations, not_enough, not_enough_expected)
                tps = tokens_per_second(result.get("eval_count"), result.get("eval_duration"))

                cited_sources = extract_cited_sources(answer)
                invalid_cited_sources = [s for s in cited_sources if s not in retrieved_sources]
                total_latency = time.time() - start + (ret["retrieval_time_seconds"] if ret else 0)

                rows.append({
                    "run_id": RUN_ID,
                    "question_id": q.get("id", ""),
                    "question": q["question"],
                    "benchmark_category": q.get("benchmark_category", ""),
                    "question_type": q.get("type", ""),
                    "expected_answer_type": q.get("expected_answer_type", ""),
                    "model": model,
                    "embedding_name": best_embedding["name"],
                    "embedding_model": best_embedding["model"],
                    "embedding_collection": best_embedding["collection"],
                    "selected_record_types": ",".join(ret["selected_record_types"]) if ret else "",
                    "retrieved_sources": ",".join(retrieved_sources),
                    "expected_sources": ",".join(expected_sources),
                    "cited_sources": ",".join(cited_sources),
                    "invalid_cited_sources": ",".join(invalid_cited_sources),
                    "expected_keywords": "|".join(expected_keywords),
                    "must_not_include": "|".join(forbidden_terms),
                    "retrieval_time_seconds": round(ret["retrieval_time_seconds"], 3) if ret else None,
                    "generation_time_seconds": round(result["generation_time_seconds"], 3),
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
                print(f"    score={score:.3f} total={total_latency:.1f}s")
            except KeyboardInterrupt:
                print("Interrupted. Saving partial results...")
                pd.DataFrame(rows).to_csv(RESULTS_DIR / f"final_llm_benchmark_results_{RUN_ID}.csv", index=False, encoding="utf-8")
                raise
            except Exception as e:
                print(f"    ERROR: {e}")
                rows.append({
                    "run_id": RUN_ID,
                    "question_id": q.get("id", ""),
                    "question": q["question"],
                    "benchmark_category": q.get("benchmark_category", ""),
                    "question_type": q.get("type", ""),
                    "expected_answer_type": q.get("expected_answer_type", ""),
                    "model": model,
                    "embedding_name": best_embedding["name"],
                    "embedding_model": best_embedding["model"],
                    "embedding_collection": best_embedding["collection"],
                    "answer": f"ERROR: {e}",
                    "overall_auto_score": 0.0,
                })

            pd.DataFrame(rows).to_csv(RESULTS_DIR / f"final_llm_benchmark_results_{RUN_ID}.csv", index=False, encoding="utf-8")

    llm_results = pd.DataFrame(rows)
    llm_summary = llm_results.groupby("model").agg(
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

    llm_results.to_csv(RESULTS_DIR / f"final_llm_benchmark_results_{RUN_ID}.csv", index=False, encoding="utf-8")
    llm_summary.to_csv(RESULTS_DIR / f"final_llm_benchmark_summary_{RUN_ID}.csv", index=False, encoding="utf-8")

    print("\nFinal LLM summary:")
    print(llm_summary.to_string(index=False))
    return llm_results, llm_summary


def main():
    RESULTS_DIR.mkdir(exist_ok=True)

    print(f"Run ID: {RUN_ID}")
    print(f"Questions file: {QUESTIONS_PATH}")
    print(f"Final LLM models: {FINAL_LLM_MODELS}")

    questions = load_questions()
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    emb_results, emb_summary, best_embedding = run_embedding_benchmark(client, questions)
    llm_results, llm_summary = run_final_llm_benchmark(client, questions, best_embedding)

    config = {
        "run_id": RUN_ID,
        "questions_file": str(QUESTIONS_PATH),
        "number_of_questions": len(questions),
        "best_embedding_name": best_embedding["name"],
        "best_embedding_model": best_embedding["model"],
        "best_embedding_collection": best_embedding["collection"],
        "llm_models": ", ".join(FINAL_LLM_MODELS),
        "top_k_per_type_retrieval_bench": TOP_K_PER_TYPE_RETRIEVAL_BENCH,
        "top_k_per_type_llm_bench": TOP_K_PER_TYPE_LLM_BENCH,
        "max_context_records": MAX_CONTEXT_RECORDS,
    }

    xlsx_path = RESULTS_DIR / f"overnight_embedding_and_final_llm_report_{RUN_ID}.xlsx"
    save_excel_report(xlsx_path, emb_results, emb_summary, llm_results, llm_summary, config)

    print("\nDONE")
    print(f"Excel report: {xlsx_path}")
    print(f"Embedding results: {RESULTS_DIR / f'embedding_benchmark_results_{RUN_ID}.csv'}")
    print(f"Embedding summary: {RESULTS_DIR / f'embedding_benchmark_summary_{RUN_ID}.csv'}")
    print(f"Final LLM results: {RESULTS_DIR / f'final_llm_benchmark_results_{RUN_ID}.csv'}")
    print(f"Final LLM summary: {RESULTS_DIR / f'final_llm_benchmark_summary_{RUN_ID}.csv'}")


if __name__ == "__main__":
    main()
