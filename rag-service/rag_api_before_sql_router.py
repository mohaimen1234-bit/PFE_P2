import time
from typing import List, Dict, Any, Optional

import chromadb
import requests
from fastapi import FastAPI
from pydantic import BaseModel


# =========================
# Configuration
# =========================

CHROMA_PATH = "vector_store/chroma"
COLLECTION_NAME = "maintenance_records_nomic"

DEFAULT_EMBED_MODEL = "nomic-embed-text"
DEFAULT_LLM_MODEL = "qwen3:1.7b"

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

DEFAULT_TOP_K_PER_TYPE = 3
MAX_CONTEXT_RECORDS = 10


# =========================
# FastAPI app
# =========================

app = FastAPI(
    title="Maintenance RAG API",
    description="FastAPI service for CMMS RAG using Ollama + Chroma",
    version="1.1.0",
)


class AskRequest(BaseModel):
    question: str
    top_k_per_type: int = DEFAULT_TOP_K_PER_TYPE
    model: str = DEFAULT_LLM_MODEL
    debug: bool = False


class SourceItem(BaseModel):
    id: str
    record_type: str
    distance: float
    metadata: Dict[str, Any]


class AskResponse(BaseModel):
    answer: str
    sources: List[str]
    selected_record_types: List[str]
    model: str
    latency_seconds: float
    debug_sources: Optional[List[SourceItem]] = None


# =========================
# Chroma connection
# =========================

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_collection(name=COLLECTION_NAME)


# =========================
# Ollama helpers
# =========================

def ollama_embed(text: str, embed_model: str = DEFAULT_EMBED_MODEL) -> List[float]:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": embed_model,
            "prompt": text,
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def ollama_generate(prompt: str, model: str) -> str:
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
        timeout=300,
    )
    response.raise_for_status()
    return response.json()["response"]


# =========================
# Routing logic
# =========================

def add_once(items: List[str], value: str):
    if value not in items:
        items.append(value)


def infer_record_types(question: str) -> List[str]:
    q = question.lower()
    record_types: List[str] = []

    # Delay / blocked / spare part questions
    # In your data, delay reasons are often in tasks.blocked_reason.
    if any(word in q for word in [
        "delay", "delayed", "waiting", "blocked", "unavailable",
        "spare part", "stock", "below minimum", "out of stock",
        "not available", "hold", "on hold"
    ]):
        add_once(record_types, "tasks")
        add_once(record_types, "work_orders")

    # Claim questions
    if any(word in q for word in [
        "claim", "claims", "reported", "severity", "rejected",
        "qualified", "qualification", "complaint", "request",
        "reported issue"
    ]):
        add_once(record_types, "claims")

    # Work order questions
    if any(word in q for word in [
        "work order", "wo", "repair", "maintenance", "completed",
        "cancelled", "canceled", "assigned", "scheduled",
        "validated", "closed"
    ]):
        add_once(record_types, "work_orders")

    # Task questions
    if any(word in q for word in [
        "task", "tasks", "subtask", "technician",
        "corrective action", "blocked reason", "failure reason"
    ]):
        add_once(record_types, "tasks")

    # Equipment questions
    if any(word in q for word in [
        "equipment", "asset", "machine", "pump", "ventilator",
        "autoclave", "compressor", "monitor", "refrigerator",
        "chiller", "ups", "analyzer", "surgical light",
        "infusion pump"
    ]):
        add_once(record_types, "equipment")
        add_once(record_types, "claims")
        add_once(record_types, "work_orders")

    # Cancellation questions should focus on work orders.
    if any(word in q for word in [
        "cancelled", "canceled", "cancellation", "why was"
    ]):
        add_once(record_types, "work_orders")

    # Default broad search
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


def retrieve_context(question: str, top_k_per_type: int) -> Dict[str, Any]:
    selected_record_types = infer_record_types(question)
    question_embedding = ollama_embed(question)

    all_results = []

    for record_type in selected_record_types:
        try:
            results = search_one_type(
                question_embedding=question_embedding,
                record_type=record_type,
                top_k=top_k_per_type,
            )
            all_results.extend(results)
        except Exception as e:
            print(f"Skipping record type {record_type}: {e}")

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

    context = "\n\n---\n\n".join(context_parts)

    return {
        "context": context,
        "sources": source_ids,
        "selected_record_types": selected_record_types,
        "raw_results": top_results,
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
   Example: "Source: work_orders_136"
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
# API endpoints
# =========================

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Maintenance RAG API is running",
        "default_llm_model": DEFAULT_LLM_MODEL,
        "embedding_model": DEFAULT_EMBED_MODEL,
        "collection": COLLECTION_NAME,
    }


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    start = time.time()

    retrieved = retrieve_context(
        question=request.question,
        top_k_per_type=request.top_k_per_type,
    )

    context = retrieved["context"]
    sources = retrieved["sources"]
    selected_record_types = retrieved["selected_record_types"]
    raw_results = retrieved["raw_results"]

    if not context:
        return AskResponse(
            answer="I do not have enough information in the database.",
            sources=[],
            selected_record_types=selected_record_types,
            model=request.model,
            latency_seconds=round(time.time() - start, 3),
            debug_sources=[] if request.debug else None,
        )

    prompt = build_prompt(
        question=request.question,
        context=context,
        sources=sources,
    )

    answer = ollama_generate(
        prompt=prompt,
        model=request.model,
    )

    debug_sources = None
    if request.debug:
        debug_sources = [
            SourceItem(
                id=item["id"],
                record_type=item["record_type"],
                distance=item["distance"],
                metadata=item["metadata"],
            )
            for item in raw_results
        ]

    return AskResponse(
        answer=answer,
        sources=sources,
        selected_record_types=selected_record_types,
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=debug_sources,
    )