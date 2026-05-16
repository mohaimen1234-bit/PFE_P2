import logging
import re
import time
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("rag_api")

import chromadb
import requests
from fastapi import FastAPI
from pydantic import BaseModel

from router import classify_question, detect_route, detect_sql_intent
from query_planner import (
    plan_generic_question, plan_rag_question,
    extract_equipment_id, extract_entity_name, extract_limit
)

from security_guard import (
    is_restricted_question,
    redact_rows,
    restricted_response,
    sql_result_has_error,
)


from sql_analytics import (
    lookup_work_order_by_id,
    lookup_claim_by_id,
    lookup_equipment_by_id,
    lookup_task_by_id,
    lookup_spare_part_by_id,
    lookup_spare_part_by_sku,
    generic_count_departments,
    generic_count_equipment,
    generic_count_work_orders,
    generic_count_claims,
    generic_count_tasks,
    generic_count_spare_parts,
    generic_count_technicians,
    generic_count_open_work_orders,
    generic_count_open_claims,
    generic_count_completed_tasks,
    generic_count_status_work_orders,
    generic_count_status_claims,
    generic_count_status_tasks,
    generic_count_status_equipment,
    generic_list_all_equipment,
    generic_count_priority_work_orders,
    generic_count_priority_claims,
    generic_count_priority_tasks,
    generic_count_work_orders_date_range,
    generic_count_claims_date_range,
    generic_list_work_orders_date_range,
    generic_completed_work_orders_date_range,
    generic_maintenance_cost_date_range,
    generic_department_maintenance_cost,
    generic_work_orders_by_department,
    generic_claims_by_department,
    generic_overdue_work_orders_by_department,
    generic_critical_work_orders_by_department,
    generic_technician_completed_tasks,
    generic_technician_completed_work_orders,
    generic_open_work_orders_by_technician,
    generic_overdue_work_orders_by_technician,
    generic_avg_repair_time_by_technician,
    generic_avg_repair_time_by_category,
    generic_supplier_spare_part_cost,
    generic_work_orders_by_priority,
    generic_claims_by_priority,
    generic_cost_by_priority,
    generic_cost_by_status,
    generic_average_work_order_cost,
    generic_cost_by_work_order_type,
    generic_list_status_work_orders,
    generic_list_status_claims,
    generic_list_priority_work_orders,
    generic_list_priority_claims,
    generic_list_open_work_orders,
    generic_list_open_claims,
    generic_list_overdue_work_orders,
    generic_list_blocked_tasks,
    generic_list_tasks_by_technician,
    generic_list_low_stock_parts,
    generic_list_out_of_stock_parts,
    generic_list_parts_near_expiry,
    generic_list_work_orders_blocked_by_parts,
    generic_list_actual_cost_exceeded_estimate,
    generic_top_equipment_by_work_orders,
    generic_top_equipment_by_cost,
    generic_top_equipment_by_critical_work_orders,
    generic_equipment_repeated_failures,
    generic_equipment_replacement_candidates,
    generic_top_used_spare_parts,
    generic_top_expensive_spare_parts,
    generic_supplier_by_part_usage,
    generic_stock_value_by_category,
    generic_monthly_work_order_trend,
    generic_monthly_claim_trend,
    generic_monthly_maintenance_cost_trend,
    generic_monthly_maintenance_cost_by_category,
    generic_monthly_part_usage_trend,
    generic_meter_readings_by_equipment,
    generic_upcoming_maintenance_plans,
    generic_inventory_valuation,
    generic_department_cost_comparison,
    generic_highest_cost_departments_causes,
)


from sql_tools import (
    blocked_tasks,
    cancelled_work_orders,
    claims_by_priority,
    count_open_claims,
    count_open_work_orders,
    get_related_records_for_equipment,
    get_related_records_for_low_stock_parts,
    get_related_records_for_work_orders,
    high_priority_claims,
    overdue_work_orders,
    spare_parts_below_min_stock,
    top_equipment_by_claims,
    work_orders_by_status,

    # Generic Option A helpers
    generic_critical_work_order_causes,
    generic_equipment_failure_causes,
    get_generic_related_records_for_work_orders,
)


# ============================================================
# Configuration
# ============================================================

CHROMA_PATH = "vector_store/chroma"

# Current working collection.
# Later, after full rebuild, you can switch to:
# COLLECTION_NAME = "maintenance_records_nomic"
COLLECTION_NAME = "maintenance_records_nomic"

DEFAULT_EMBED_MODEL = "nomic-embed-text"
DEFAULT_LLM_MODEL = "qwen3:1.7b"

import os
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_EMBED_URL = f"{OLLAMA_HOST}/api/embeddings"
OLLAMA_GENERATE_URL = f"{OLLAMA_HOST}/api/generate"

DEFAULT_TOP_K_PER_TYPE = 2
MAX_CONTEXT_RECORDS = 5

# Calibrated from your distance smoke test:
# strong/specific: ~190-260
# known good RAG: ~270-295
# weak broad: ~327
# unrelated: ~438+
STRONG_DISTANCE = 260.0
GOOD_DISTANCE = 310.0
WEAK_DISTANCE = 380.0


# ============================================================
# FastAPI app
# ============================================================

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app):
    """Lifespan handler: warm up the embedding model BEFORE accepting requests.

    nomic-embed-text needs ~220 s to cold-load on this machine.  By sending
    a keep_alive=30m warmup call here we guarantee the model is resident in
    Ollama memory before the very first /ask request arrives.
    """
    import asyncio
    loop = asyncio.get_event_loop()

    def _warmup():
        try:
            print(f"[startup] Warming up embedding model: {DEFAULT_EMBED_MODEL} …", flush=True)
            t0 = time.time()
            resp = requests.post(
                OLLAMA_EMBED_URL,
                json={"model": DEFAULT_EMBED_MODEL, "prompt": "warmup", "keep_alive": "30m"},
                timeout=300,
            )
            resp.raise_for_status()
            print(f"[startup] Embedding warmup done in {time.time()-t0:.1f}s", flush=True)

            # Warm up the router examples cache too
            # print("[startup] Background warmup: Loading router intent classification...", flush=True)
            # t1 = time.time()
            # classify_question("warmup")
            # print(f"[startup] Background warmup: Router ready in {time.time()-t1:.1f}s", flush=True)
            pass

        except Exception as exc:
            print(f"[startup] Warmup failed (non-fatal): {exc}", flush=True)

    # Run warmup in background so server starts instantly
    loop.run_in_executor(None, _warmup)
    yield  # server starts accepting requests NOW


app = FastAPI(
    title="Maintenance SQL + RAG API",
    description="Secured CMMS assistant using SQL templates + Chroma RAG + Ollama",
    version="3.0.0",
    lifespan=lifespan,
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
    route: str
    sql_intent: Optional[str] = None
    sql_result: Optional[List[Dict[str, Any]]] = None
    sources: List[str]
    selected_record_types: List[str]
    model: str
    latency_seconds: float
    debug_sources: Optional[List[SourceItem]] = None


class SyncRequest(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]


# ============================================================
# Chroma connection
# ============================================================

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_collection(name=COLLECTION_NAME)


# ============================================================
# Ollama helpers
# ============================================================

def clean_model_answer(answer: str) -> str:
    if not answer:
        return ""

    answer = re.sub(
        r"<think>.*?</think>",
        "",
        answer,
        flags=re.DOTALL | re.IGNORECASE,
    )

    answer = answer.replace("<think>", "")
    answer = answer.replace("</think>", "")
    answer = answer.replace("/no_think", "")

    return answer.strip()


def is_bad_model_answer(answer: str) -> bool:
    if not answer or not answer.strip():
        return True

    stripped = answer.strip()
    text = stripped.lower()

    bad_markers = [
        "okay, let's tackle",
        "let's tackle",
        "i need to look",
        "the user is asking",
        "first, i need",
        "looking at the provided",
        "terraria",
        "minecraft",
        "浙江",
        "大学",
        "医院",
        "กำลัง",
        "Ϙ",
        "しだい",
    ]

    if any(marker in text for marker in bad_markers):
        return True

    first_chars = stripped[:5]

    # Reject unexpected Japanese-leading output.
    if any("\u3040" <= ch <= "\u30ff" for ch in first_chars):
        return True

    # Reject unexpected Chinese-leading output.
    if any("\u4e00" <= ch <= "\u9fff" for ch in first_chars):
        return True

    # Reject mostly non-Latin output for this English/French CMMS assistant.
    latin_chars = sum(1 for ch in answer if "a" <= ch.lower() <= "z")
    total_letters = sum(1 for ch in answer if ch.isalpha())

    if total_letters > 30 and latin_chars / max(total_letters, 1) < 0.5:
        return True

    return False


def ollama_embed(text: str, embed_model: str = DEFAULT_EMBED_MODEL) -> List[float]:
    t0 = time.time()
    print("[TIMER] ollama_embed start")

    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": embed_model,
            "prompt": text,
            "keep_alive": "30m",
        },
        timeout=300,
    )

    response.raise_for_status()

    elapsed = time.time() - t0
    print(f"[TIMER] ollama_embed done: {elapsed:.3f}s")

    return response.json()["embedding"]


def ollama_generate(prompt: str, model: str) -> str:
    print(f"[TIMER] ollama_generate start | prompt_chars={len(prompt)}")
    t0 = time.time()

    response = requests.post(
        OLLAMA_GENERATE_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "30m",
            "options": {
                "temperature": 0,
                "num_predict": 400,
                "num_ctx": 8192,
            },
        },
        timeout=300,
    )

    response.raise_for_status()

    elapsed = time.time() - t0
    print(f"[TIMER] ollama_generate done: {elapsed:.3f}s")

    raw_answer = response.json().get("response", "")
    return clean_model_answer(raw_answer)


# (startup warmup is now handled by the lifespan context manager above)



# ============================================================
# Language helper
# ============================================================

def is_french_question(question: str) -> bool:
    q = question.lower()

    french_markers = [
        "quel",
        "quelle",
        "quels",
        "quelles",
        "combien",
        "pourquoi",
        "comment",
        "pièce",
        "piece",
        "pièces",
        "pieces",
        "équipement",
        "equipement",
        "équipements",
        "equipements",
        "réclamation",
        "reclamation",
        "réclamations",
        "reclamations",
        "ordre de travail",
        "ordres de travail",
        "stock minimum",
        "stock faible",
        "en retard",
        "statut",
        "priorité",
        "priorite",
    ]

    return any(marker in q for marker in french_markers)


# ============================================================
# RAG record-type selection
# ============================================================

def add_once(items: List[str], value: str):
    if value not in items:
        items.append(value)


def infer_record_types(question: str) -> List[str]:
    q = question.lower()
    record_types: List[str] = []

    if any(word in q for word in [
        "delay",
        "delayed",
        "waiting",
        "blocked",
        "unavailable",
        "spare part",
        "stock",
        "below minimum",
        "out of stock",
        "not available",
        "hold",
        "on hold",
        "retard",
        "bloqué",
        "bloquee",
        "bloque",
        "indisponible",
        "pièce",
        "piece",
        "stock faible",
        "stock minimum",
    ]):
        add_once(record_types, "tasks")
        add_once(record_types, "work_orders")

    if any(word in q for word in [
        "claim",
        "claims",
        "reported",
        "severity",
        "rejected",
        "qualified",
        "qualification",
        "complaint",
        "request",
        "reported issue",
        "réclamation",
        "reclamation",
        "réclamations",
        "reclamations",
        "plainte",
        "signalé",
        "signale",
    ]):
        add_once(record_types, "claims")

    if any(word in q for word in [
        "work order",
        "work orders",
        "wo",
        "repair",
        "maintenance",
        "completed",
        "cancelled",
        "canceled",
        "assigned",
        "scheduled",
        "validated",
        "closed",
        "ordre de travail",
        "ordres de travail",
        "ot",
        "réparation",
        "reparation",
        "annulé",
        "annule",
        "planifié",
        "planifie",
    ]):
        add_once(record_types, "work_orders")

    if any(word in q for word in [
        "task",
        "tasks",
        "subtask",
        "technician",
        "corrective action",
        "blocked reason",
        "failure reason",
        "tâche",
        "tache",
        "tâches",
        "taches",
        "technicien",
    ]):
        add_once(record_types, "tasks")

    if any(word in q for word in [
        "equipment",
        "equipments",
        "asset",
        "machine",
        "pump",
        "ventilator",
        "autoclave",
        "compressor",
        "monitor",
        "refrigerator",
        "chiller",
        "ups",
        "analyzer",
        "surgical light",
        "infusion pump",
        "endoscope",
        "équipement",
        "equipement",
        "équipements",
        "equipements",
        "actif",
        "actifs",
        "pompe",
        "ventilateur",
        "moniteur",
    ]):
        add_once(record_types, "equipment")
        add_once(record_types, "claims")
        add_once(record_types, "work_orders")

    if any(word in q for word in [
        "cancelled",
        "canceled",
        "cancellation",
        "why was",
        "annulé",
        "annule",
        "annulation",
        "pourquoi",
    ]):
        add_once(record_types, "work_orders")

    if not record_types:
        record_types = ["claims", "work_orders", "tasks", "equipment"]

    return record_types


# ============================================================
# Unified Response Templating
# ============================================================

def _extract_field_from_record(record: Dict[str, Any], *field_names: str) -> str:
    """Extracts a field from a record, checking top-level first, then metadata dict."""
    for field in field_names:
        val = record.get(field)
        if val and str(val).strip():
            return str(val).strip()
    # Check inside metadata dict (ChromaDB raw results)
    meta = record.get("metadata", {})
    if isinstance(meta, dict):
        for field in field_names:
            val = meta.get(field)
            if val and str(val).strip():
                return str(val).strip()
    return ""


def _extract_name_from_document(document: str) -> str:
    """Extracts a readable name/title from the document text blob."""
    if not document:
        return ""
    # Try to extract title from "title: XXX" patterns
    import re
    m = re.search(r'title:\s*(.+?)(?:\s+description:|\s+status:|\s+priority:|\s*$)', document, re.IGNORECASE)
    if m:
        title = m.group(1).strip()
        if len(title) > 120:
            title = title[:117] + "..."
        return title
    # Fallback: first 100 chars of document
    clean = document.replace("\r", " ").replace("\n", " ").strip()
    clean = re.sub(r'\s+', ' ', clean)
    if len(clean) > 120:
        return clean[:117] + "..."
    return clean


def format_record_for_template(record: Dict[str, Any], record_type: str) -> str:
    """Formats a single record into the Supporting information item style.
    Works with both SQL result dicts and ChromaDB raw_result dicts."""
    sid = _extract_field_from_record(record, "source_id", "id") or "N/A"

    # Name: try structured fields, then parse from document blob
    name = _extract_field_from_record(record, "equipment_name", "title", "name")
    if not name:
        name = _extract_name_from_document(record.get("document", ""))
    if not name:
        name = sid  # Last resort, use the ID itself
    if len(name) > 120:
        name = name[:117] + "..."

    status = _extract_field_from_record(record, "status") or "—"
    priority = _extract_field_from_record(record, "priority") or "—"
    date = _extract_field_from_record(record, "due_date", "created_at", "reading_date") or "—"

    note = _extract_field_from_record(record, "notes", "description", "failure_reason", "qualification_notes", "predictive_outcome_notes")
    if not note:
        # Try extracting a useful snippet from the document
        doc = record.get("document", "")
        if doc:
            import re
            m = re.search(r'description:\s*(.+?)(?:\s+(?:status|priority|due_date|location):|\s*$)', doc, re.IGNORECASE)
            if m:
                note = m.group(1).strip()
    if not note:
        note = "—"
    if len(note) > 180:
        note = note[:177] + "..."

    return f"• **{sid}** — {name}\n  Status: {status} | Priority: {priority} | Date: {date}\n  Note: {note}"


def build_no_data_answer(question: str, found_id: Optional[str] = None) -> str:
    fr = is_french_question(question)
    if fr:
        search_note = f" pour « {found_id} »" if found_id else ""
        return (
            f"Je n'ai pas trouvé suffisamment d'informations{search_note} dans la base de données "
            f"pour répondre à votre question.\n\n"
            f"Cela peut signifier que l'enregistrement manque de notes techniques détaillées, "
            f"de raisons de retard ou de journaux de maintenance liés.\n\n"
            f"**Action recommandée :** Vérifiez si des notes supplémentaires ou des mises à jour "
            f"sont disponibles pour cet actif ou cet ordre de travail."
        )
    else:
        search_note = f" for \"{found_id}\"" if found_id else ""
        return (
            f"I could not find enough information{search_note} in the database "
            f"to answer your question.\n\n"
            f"This may mean the record lacks detailed technician notes, "
            f"delay reasons, or linked maintenance logs.\n\n"
            f"**Recommended action:** Check whether additional notes, vendor updates, "
            f"or status-change logs are available for this asset or work order."
        )


def build_victoria_structured_answer(
    direct_answer: str,
    explanation: str,
    records: List[Dict[str, Any]],
    summary: str,
    recommendation: str,
    fr: bool = False
) -> str:
    """Unified Victoria answer builder — natural prose, no bracket labels."""
    lines = []
    lines.append(direct_answer)
    lines.append("")
    lines.append(explanation)
    lines.append("")

    if records:
        lines.append(f"**{'Informations de support' if fr else 'Supporting information'}:**")
        lines.append("")
        for i, rec in enumerate(records[:5], 1):
            lines.append(f"{i}. {format_record_for_template(rec, rec.get('record_type', 'unknown'))}")
            lines.append("")

    if summary:
        lines.append(f"**{'Résumé' if fr else 'Summary'}:** {summary}")
        lines.append("")
    if recommendation:
        lines.append(f"**{'Action recommandée' if fr else 'Recommended action'}:** {recommendation}")

    return "\n".join(lines).strip()


# ============================================================
# RAG retrieval
# ============================================================

def search_one_type(
    question_embedding: List[float],
    record_type: str,
    top_k: int,
    equipment_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    if equipment_id is not None:
        where_clause = {
            "$and": [
                {"record_type": record_type},
                {"equipment_id": equipment_id}
            ]
        }
    else:
        where_clause = {"record_type": record_type}

    print(f"[DEBUG] Chroma Query: type={record_type}, filter={where_clause}")
    
    result = collection.query(
        query_embeddings=[question_embedding],
        n_results=top_k,
        where=where_clause,
    )
    
    ids = result["ids"][0] if result["ids"] else []
    metadatas = result["metadatas"][0] if result["metadatas"] else []
    documents = result["documents"][0] if result["documents"] else []
    distances = result["distances"][0] if result["distances"] else []
    
    # FALLBACK: If filtering by integer ID found nothing, try filtering by string ID
    if not ids:
        if equipment_id is not None:
            where_clause = {
                "$and": [
                    {"record_type": record_type},
                    {"equipment_id": str(equipment_id)}
                ]
            }
            print(f"[DEBUG] Fallback to string filter: {where_clause}")
            result = collection.query(
                query_embeddings=[question_embedding],
                n_results=top_k,
                where=where_clause,
            )
            ids = result["ids"][0] if result["ids"] else []
            metadatas = result["metadatas"][0] if result["metadatas"] else []
            documents = result["documents"][0] if result["documents"] else []
            distances = result["distances"][0] if result["distances"] else []
    
    # FALLBACK 2: Metadata-only get if query found nothing
    if not ids:
        if equipment_id is not None:
            print(f"[DEBUG] Metadata-only fallback for equipment_id={equipment_id}")
            res_get = collection.get(where=where_clause, limit=top_k)
            ids = res_get["ids"] if res_get["ids"] else []
            metadatas = res_get["metadatas"] if res_get["metadatas"] else []
            documents = res_get["documents"] if res_get["documents"] else []
            # For metadata get, we don't have distances, so we assign a neutral good distance
            distances = [200.0] * len(ids)

    print(f"[DEBUG] Chroma found {len(ids)} results for {record_type}")

    rows = []
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


def get_retrieval_confidence(best_distance: Optional[float]) -> str:
    if best_distance is None:
        return "none"

    if best_distance <= STRONG_DISTANCE:
        return "strong"

    if best_distance <= GOOD_DISTANCE:
        return "good"

    if best_distance <= WEAK_DISTANCE:
        return "weak"

    return "none"


def retrieve_context(question: str, top_k_per_type: int) -> Dict[str, Any]:
    t0 = time.time()
    print("[TIMER] retrieve_context start")

    selected_record_types = infer_record_types(question)

    t_embed = time.time()
    question_embedding = ollama_embed(question)
    print(f"[TIMER] question embedding total: {time.time() - t_embed:.3f}s")

    equipment_id = extract_equipment_id(question)
    print(f"[DEBUG] retrieve_context: equipment_id={equipment_id}")

    all_results = []

    t_chroma = time.time()

    for record_type in selected_record_types:
        try:
            results = search_one_type(
                question_embedding=question_embedding,
                record_type=record_type,
                top_k=top_k_per_type,
                equipment_id=equipment_id,
            )
            print(f"[DEBUG] type {record_type} found {len(results)} results")
            all_results.extend(results)
        except Exception as e:
            print(f"Skipping record type {record_type}: {e}")

    if not all_results:
        print("[DEBUG] all_results is empty")
        return [], "none"

    print(f"[TIMER] chroma queries total: {time.time() - t_chroma:.3f}s")

    all_results.sort(key=lambda x: x["distance"])

    best_distance = all_results[0]["distance"] if all_results else None
    retrieval_confidence = get_retrieval_confidence(best_distance)

    # LOOSEN THRESHOLD for specific equipment queries.
    # If we filtered by ID, we trust the metadata relevance even if semantic distance is high.
    effective_threshold = WEAK_DISTANCE
    if equipment_id is not None:
        effective_threshold = 500.0 # High enough to capture almost anything in the filtered set
        print(f"[DEBUG] Loosened threshold to {effective_threshold}")
        if all_results and retrieval_confidence == "weak":
            retrieval_confidence = "acceptable" # Upgrade confidence because we matched metadata exactly

    # Keep only acceptable/weak-or-better context.
    filtered_results = [
        item for item in all_results
        if item["distance"] <= effective_threshold
    ]
    print(f"[DEBUG] filtered_results count: {len(filtered_results)}")

    top_results = filtered_results[:MAX_CONTEXT_RECORDS]

    context_parts = []
    source_ids = []

    if equipment_id is not None:
        try:
            sql_asset = lookup_equipment_by_id(equipment_id)
            if sql_asset and len(sql_asset) > 0:
                asset_data = sql_asset[0]
                asset_str = ", ".join(f"{k}: {v}" for k, v in asset_data.items() if v is not None)
                context_parts.append(
                    f"[DATABASE GROUNDING]\n"
                    f"The user is asking about the following verified asset:\n"
                    f"{asset_str}\n"
                    f"Please relate the following vector records to this asset."
                )
        except Exception as e:
            print(f"[DEBUG] Error fetching SQL grounding for equipment {equipment_id}: {e}")

    for item in top_results:
        source_id = item["id"]
        source_ids.append(source_id)

        safe_metadata = redact_rows([item.get("metadata", {})])[0]

        context_parts.append(
            f"Source ID: {source_id}\n"
            f"Record type: {item['record_type']}\n"
            f"Distance: {item['distance']}\n"
            f"Metadata: {safe_metadata}\n"
            f"Record content:\n{item['document']}"
        )

    print(f"[TIMER] retrieve_context done: {time.time() - t0:.3f}s")

    return {
        "context": "\n\n---\n\n".join(context_parts),
        "sources": source_ids,
        "selected_record_types": selected_record_types,
        "raw_results": top_results,
        "all_results": all_results[:MAX_CONTEXT_RECORDS],
        "retrieval_confidence": retrieval_confidence,
        "best_distance": best_distance,
    }


# ============================================================
# SQL helpers
# ============================================================

def run_sql_intent(intent: str) -> List[Dict[str, Any]]:
    try:
        if intent == "top_equipment_by_claims":
            return top_equipment_by_claims(3)

        if intent == "count_open_work_orders":
            return count_open_work_orders()

        if intent == "count_open_claims":
            return count_open_claims()

        if intent == "spare_parts_below_min_stock":
            return spare_parts_below_min_stock()

        if intent == "overdue_work_orders":
            return overdue_work_orders()

        if intent == "work_orders_by_status":
            return work_orders_by_status()

        if intent == "claims_by_priority":
            return claims_by_priority()

        if intent == "blocked_tasks":
            return blocked_tasks()

        if intent == "cancelled_work_orders":
            return cancelled_work_orders()

        if intent == "high_priority_claims":
            return high_priority_claims()

        if intent == "meter_readings_analysis":
            return generic_meter_readings_by_equipment()

        if intent == "maintenance_plans_analysis":
            return generic_upcoming_maintenance_plans()

        if intent == "inventory_valuation":
            return generic_inventory_valuation()

        if intent == "department_comparison":
            return generic_department_cost_comparison()

        return [{"error": f"Unknown SQL intent: {intent}"}]

    except Exception as e:
        return [{"error": str(e)}]


def collect_source_ids_from_related(related_records: Dict[str, Any]) -> List[str]:
    source_ids = []

    for rows in related_records.values():
        if not isinstance(rows, list):
            continue

        for row in rows:
            if not isinstance(row, dict):
                continue

            source_id = row.get("source_id")
            if source_id and source_id not in source_ids:
                source_ids.append(source_id)

    return source_ids


def collect_source_ids_from_sql(sql_result: List[Dict[str, Any]]) -> List[str]:
    source_ids = []

    for row in sql_result:
        source_id = row.get("source_id")
        if source_id and source_id not in source_ids:
            source_ids.append(source_id)

    return source_ids


def redact_related_records(related_records: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: redact_rows(value) if isinstance(value, list) else value
        for key, value in related_records.items()
    }


# ============================================================
# Direct SQL answer formatter
# ============================================================

def format_sql_answer(
    question: str,
    sql_intent: str,
    sql_result: List[Dict[str, Any]],
) -> str:
    fr = is_french_question(question)

    if not sql_result:
        if fr:
            return "Aucun enregistrement correspondant n’a été trouvé dans la base de données."
        return "No matching records were found in the database."

    if sql_intent == "department_comparison":
        return format_sql_comparison_answer(question, sql_result)

    if sql_intent in ["count_open_work_orders", "count_open_claims"]:
        value = list(sql_result[0].values())[0] if sql_result else 0
        if fr:
            return f"Le résultat est {value}. Réponse basée sur la base de données."
        return f"The result is {value}. Answer based on the database query result."

    return format_conversational_summary(sql_result[:40], fr)

# Evidence builders
# ============================================================

def highlight_id(text: str) -> str:
    """Wraps technical IDs like claims_536 or WO_123 in brackets."""
    if not text: return ""
    import re
    # Match patterns like claims_123, work_orders_123, tasks_123, WO_123, CL_123, asset_123
    pattern = r"\b(claims_\d+|work_orders_\d+|tasks_\d+|WO_\d+|CL_\d+|asset_\d+)\b"
    # Just wrap in brackets, don't bold here, we'll bold where we use it
    return re.sub(pattern, r"[\1]", text, flags=re.IGNORECASE)

def format_conversational_summary(data: List[Dict[str, Any]], fr: bool = False) -> str:
    if not data:
        return ""
    
    # Handle single row (usually a count or a single lookup)
    if len(data) == 1:
        row = data[0]
        
        # Check for costs first
        if "total_maintenance_cost" in row:
            cost = row["total_maintenance_cost"]
            if fr:
                return f"Le coût total de maintenance est de **${cost:,.2f}**."
            return f"The total maintenance cost is **${cost:,.2f}**."
            
        if "average_maintenance_cost" in row:
            cost = row["average_maintenance_cost"]
            if fr:
                return f"Le coût moyen de maintenance est de **${cost:,.2f}**."
            return f"The average maintenance cost is **${cost:,.2f}**."

        # Special case for counts
        for k, v in row.items():
            if "count" in k.lower():
                entity = k.lower().replace("_count", "").replace("generic_", "").replace("_", " ")
                if fr:
                    return f"Il y a actuellement **{v}** {entity} enregistré(s) dans le système."
                return f"There are currently **{v}** {entity} recorded in the system."

        # Narrative single lookup
        if "part_id" in row or "sku" in row:
            name = row.get("name") or row.get("sku")
            stock = row.get("quantity_in_stock", 0)
            min_stock = row.get("min_stock_level", 0)
            loc = row.get("location", "N/A")
            sup = row.get("supplier", "N/A")
            sid = row.get("source_id") or f"spare_parts_{row.get('part_id')}"
            if fr:
                return f"**{name}** — Stock actuel: **{stock}**, Stock minimum: **{min_stock}**, Emplacement: **{loc}**, Fournisseur: **{sup}**. Source: {sid}"
            return f"**{name}** — Current stock: **{stock}**, minimum stock: **{min_stock}**, location: **{loc}**, supplier: **{sup}**. Source: {sid}"

        parts = []
        for k, v in row.items():
            if k in ["source_id", "id", "equipment_id", "wo_id", "claim_id", "task_id"]:
                continue
            label = str(k).replace("_", " ").lower()
            val = highlight_id(str(v))
            parts.append(f"{label} is **{val}**")
        
        main_sentence = ", ".join(parts)
        if fr:
            return f"D'après les registres, {main_sentence.replace('is', 'est')}."
        return f"According to the records, {main_sentence}."

    # Handle lists
    narrative_lines = []
    # Increased limit to 15 as requested
    for row in data[:15]:
        # Special case for status/priority distributions
        if ("status" in row or "priority" in row) and any("count" in k.lower() for k in row.keys()):
            label_key = "status" if "status" in row else "priority"
            label_val = row.get(label_key)
            count_val = next((v for k, v in row.items() if "count" in k.lower()), 0)
            if fr:
                narrative_lines.append(f"• **{count_val}** sont en {label_key} **{label_val}**")
            else:
                narrative_lines.append(f"• **{count_val}** are in **{label_val}** {label_key}")
            continue

        # Specialized Spare Parts Narrative
        if "part_id" in row or "sku" in row:
            name = row.get("name") or row.get("sku")
            stock = row.get("quantity_in_stock", 0)
            min_stock = row.get("min_stock_level", 0)
            loc = row.get("location", "N/A")
            sup = row.get("supplier", "N/A")
            sid = row.get("source_id") or f"spare_parts_{row.get('part_id')}"
            expiry = row.get("expiry_date")
            expiry_str = f", expiry date: {expiry}" if expiry else ""
            
            if fr:
                line = f"• **{name}** — Stock actuel: **{stock}**, stock minimum: {min_stock}, emplacement: {loc}, fournisseur: {sup}{expiry_str.replace('expiry date', 'date d expiration')}. Source: {sid}"
            else:
                line = f"• **{name}** — Current stock: **{stock}**, minimum stock: {min_stock}, location: {loc}, supplier: {sup}{expiry_str}. Source: {sid}"
            narrative_lines.append(line)
            continue

        # General Narrative (Equipment, Work Orders, etc.)
        name = row.get("equipment_name") or row.get("title") or row.get("name") or row.get("sku") or row.get("status") or row.get("priority")
        sid = row.get("source_id") or row.get("id")
        
        details = []
        # Key fields we want to show in narrative
        relevant_keys = [
            "status", "priority", "category", "classification", "due_date", 
            "location", "asset_code", "wo_type", "criticality"
        ]
        
        for k in relevant_keys:
            v = row.get(k)
            if v is None or str(v).strip() == "" or v == 0:
                continue
            label = str(k).replace("_", " ").lower()
            val = highlight_id(str(v))
            details.append(f"{label}: **{val}**")
        
        if name:
            name_text = highlight_id(str(name))
            line = f"• **{name_text}**"
            if details:
                line += f" — {', '.join(details)}"
            if sid:
                line += f". Source: {sid}"
            narrative_lines.append(line)
        else:
            line = ", ".join([f"{str(k).replace('_', ' ').title()} is **{highlight_id(str(v))}**" for k, v in row.items()])
            narrative_lines.append(f"• {line}")

    return "\n".join(narrative_lines)

def clean_record_content(text: str) -> str:
    """Removes technical labels and redundant info from indexed document strings."""
    if not text:
        return ""
    
    # Remove common labels like "Record type: ...", "Record ID: ...", "title: ...", etc.
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        lower_line = line.lower()
        if any(lower_line.startswith(prefix) for prefix in ["record type:", "record id:", "source id:", "metadata:", "distance:", "record content:"]):
            continue
        
        # Remove label prefixes like "title: ", "description: "
        for label in ["title:", "description:", "qualification_notes:", "predictive_outcome:", "predictive_outcome_notes:", "blocked_reason:", "failure_reason:"]:
            if lower_line.startswith(label):
                line = line[len(label):].strip()
                break
        
        if line.strip():
            cleaned_lines.append(line.strip())
            
    return " ".join(cleaned_lines)

def dict_list_to_markdown(data: List[Dict[str, Any]]) -> str:
    if not data:
        return ""
    headers = list(data[0].keys())
    header_line = "| " + " | ".join([str(h).replace("_", " ").title() for h in headers]) + " |"
    separator_line = "|" + "|".join(["---" for _ in headers]) + "|"
    lines = [header_line, separator_line]
    for row in data:
        row_values = []
        for h in headers:
            val = row.get(h, "")
            row_values.append(str(val))
        lines.append("| " + " | ".join(row_values) + " |")
    return "\n".join(lines)

def clean_text_value(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


def build_top_equipment_evidence(
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    lines = []

    claims_by_equipment = {}
    work_orders_by_equipment = {}
    tasks_by_equipment = {}

    for row in related_records.get("claims", []):
        equipment_id = row.get("equipment_id")
        claims_by_equipment.setdefault(equipment_id, []).append(row)

    for row in related_records.get("work_orders", []):
        equipment_id = row.get("equipment_id")
        work_orders_by_equipment.setdefault(equipment_id, []).append(row)

    for row in related_records.get("tasks", []):
        equipment_id = row.get("equipment_id")
        tasks_by_equipment.setdefault(equipment_id, []).append(row)

    lines.append("Top equipment by claim count:")

    for index, equipment in enumerate(sql_result, start=1):
        equipment_id = equipment.get("equipment_id")
        equipment_name = equipment.get("equipment_name")
        asset_code = equipment.get("asset_code")
        claim_count = equipment.get("claim_count")
        classification = equipment.get("classification", "")
        category = equipment.get("category", "")
        model = equipment.get("model", "")
        criticality = equipment.get("criticality", "")
        location = equipment.get("location", "")

        lines.append("")
        lines.append(
            f"{index}. EQUIPMENT: {equipment_name} "
            f"| equipment_id={equipment_id} "
            f"| asset_code={asset_code} "
            f"| classification={classification} "
            f"| category={category} "
            f"| model={model} "
            f"| criticality={criticality} "
            f"| location={location} "
            f"| claim_count={claim_count}"
        )

        lines.append("Related claims for this equipment:")
        claims = claims_by_equipment.get(equipment_id, [])
        if claims:
            for row in claims:
                lines.append(
                    f"- {row.get('source_id')} | "
                    f"priority={row.get('priority')} | "
                    f"status={row.get('status')} | "
                    f"title={row.get('title')} | "
                    f"description={row.get('description')}"
                )
        else:
            lines.append("- No related claims were fetched for this equipment.")

        lines.append("Related work orders for this equipment:")
        work_orders = work_orders_by_equipment.get(equipment_id, [])
        if work_orders:
            for row in work_orders:
                lines.append(
                    f"- {row.get('source_id')} | "
                    f"priority={row.get('priority')} | "
                    f"status={row.get('status')} | "
                    f"title={row.get('title')} | "
                    f"description={row.get('description')} | "
                    f"predictive_outcome={row.get('predictive_outcome')} | "
                    f"predictive_notes={row.get('predictive_outcome_notes')}"
                )
        else:
            lines.append("- No related work orders were fetched for this equipment.")

        lines.append("Related tasks for this equipment:")
        tasks = tasks_by_equipment.get(equipment_id, [])
        if tasks:
            for row in tasks:
                lines.append(
                    f"- {row.get('source_id')} | "
                    f"priority={row.get('priority')} | "
                    f"status={row.get('status')} | "
                    f"title={row.get('title')} | "
                    f"description={row.get('description')} | "
                    f"blocked_reason={row.get('blocked_reason') or ''} | "
                    f"failure_reason={row.get('failure_reason') or ''}"
                )
        else:
            lines.append("- No related tasks were fetched for this equipment.")

    return "\n".join(lines)


def build_overdue_work_orders_evidence(
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    lines = []

    lines.append("Overdue work orders from database query:")

    for index, row in enumerate(sql_result[:10], start=1):
        lines.append("")
        lines.append(
            f"{index}. {row.get('source_id')} | "
            f"wo_id={row.get('wo_id')} | "
            f"equipment={row.get('equipment_name')} | "
            f"classification={row.get('classification')} | "
            f"status={row.get('status')} | "
            f"priority={row.get('priority')} | "
            f"due_date={row.get('due_date')} | "
            f"predictive_outcome={row.get('predictive_outcome')} | "
            f"predictive_notes={row.get('predictive_outcome_notes')}"
        )
        lines.append(
            f"   title={row.get('title')} | "
            f"description={row.get('description')}"
        )

    lines.append("")
    lines.append("Related tasks:")
    for row in related_records.get("tasks", [])[:20]:
        lines.append(
            f"- {row.get('source_id')} | "
            f"wo_id={row.get('wo_id')} | "
            f"equipment={row.get('equipment_name')} | "
            f"status={row.get('status')} | "
            f"priority={row.get('priority')} | "
            f"blocked_reason={row.get('blocked_reason')} | "
            f"failure_reason={row.get('failure_reason')} | "
            f"title={row.get('title')} | "
            f"description={row.get('description')}"
        )

    lines.append("")
    lines.append("Related claims:")
    for row in related_records.get("claims", [])[:15]:
        lines.append(
            f"- {row.get('source_id')} | "
            f"equipment={row.get('equipment_name')} | "
            f"priority={row.get('priority')} | "
            f"status={row.get('status')} | "
            f"title={row.get('title')} | "
            f"description={row.get('description')}"
        )

    return "\n".join(lines)


def build_low_stock_parts_evidence(
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    lines = []

    lines.append("Low-stock spare parts from database query:")

    for index, row in enumerate(sql_result[:10], start=1):
        part_id = row.get("part_id")

        lines.append("")
        lines.append(
            f"{index}. spare_parts_{part_id} | "
            f"part_id={part_id} | "
            f"sku={row.get('sku')} | "
            f"name={row.get('name')} | "
            f"category={row.get('category')} | "
            f"quantity_in_stock={row.get('quantity_in_stock')} | "
            f"min_stock_level={row.get('min_stock_level')} | "
            f"location={row.get('location')} | "
            f"supplier={row.get('supplier')}"
        )

    lines.append("")
    lines.append("Related part usage:")
    for row in related_records.get("part_usage", [])[:20]:
        lines.append(
            f"- usage_id={row.get('usage_id')} | "
            f"part_id={row.get('part_id')} | "
            f"part={row.get('part_name')} | "
            f"wo_id={row.get('wo_id')} | "
            f"task_id={row.get('task_id')} | "
            f"quantity_used={row.get('quantity_used')} | "
            f"quantity_in_stock={row.get('quantity_in_stock')} | "
            f"min_stock_level={row.get('min_stock_level')} | "
            f"used_at={row.get('used_at')}"
        )

    lines.append("")
    lines.append("Related work orders:")
    for row in related_records.get("work_orders", [])[:15]:
        lines.append(
            f"- {row.get('source_id')} | "
            f"equipment={row.get('equipment_name')} | "
            f"status={row.get('status')} | "
            f"priority={row.get('priority')} | "
            f"title={row.get('title')} | "
            f"description={row.get('description')} | "
            f"predictive_outcome={row.get('predictive_outcome')} | "
            f"predictive_notes={row.get('predictive_outcome_notes')}"
        )

    lines.append("")
    lines.append("Related tasks:")
    for row in related_records.get("tasks", [])[:15]:
        lines.append(
            f"- {row.get('source_id')} | "
            f"equipment={row.get('equipment_name')} | "
            f"status={row.get('status')} | "
            f"priority={row.get('priority')} | "
            f"title={row.get('title')} | "
            f"description={row.get('description')} | "
            f"blocked_reason={row.get('blocked_reason')} | "
            f"failure_reason={row.get('failure_reason')}"
        )

    return "\n".join(lines)


def build_generic_explain_set_evidence(
    topic: str,
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    lines = []

    if topic == "critical_work_order_causes":
        lines.append("Generic plan: explain common causes of critical/high-priority work orders.")
    elif topic == "equipment_failure_causes":
        lines.append("Generic plan: explain common visible causes of equipment failures or maintenance problems.")
    else:
        lines.append("Generic plan: explain visible maintenance causes from SQL evidence.")

    lines.append("")
    lines.append("Primary work order evidence:")

    for row in sql_result[:20]:
        source_id = row.get("source_id") or f"work_orders_{row.get('wo_id')}"
        title = clean_text_value(row.get("title"))
        status = clean_text_value(row.get("status"))
        priority = clean_text_value(row.get("priority"))
        wo_type = clean_text_value(row.get("wo_type"))
        equipment_name = clean_text_value(row.get("equipment_name"))
        classification = clean_text_value(row.get("classification"))
        predictive_outcome = clean_text_value(row.get("predictive_outcome"))
        predictive_notes = clean_text_value(row.get("predictive_outcome_notes"))
        description = clean_text_value(row.get("description"))

        lines.append(
            f"- {source_id}: {title} | equipment={equipment_name} | "
            f"classification={classification} | status={status} | priority={priority} | "
            f"type={wo_type} | predictive_outcome={predictive_outcome}"
        )

        if description:
            lines.append(f"  description: {description[:350]}")

        if predictive_notes:
            lines.append(f"  predictive_notes: {predictive_notes[:250]}")

    claims = related_records.get("claims", [])
    tasks = related_records.get("tasks", [])

    if claims:
        lines.append("")
        lines.append("Related claim evidence:")

        for row in claims[:15]:
            source_id = row.get("source_id") or f"claims_{row.get('claim_id')}"
            title = clean_text_value(row.get("title"))
            priority = clean_text_value(row.get("priority"))
            status = clean_text_value(row.get("status"))
            reported = clean_text_value(row.get("reported_severity"))
            validated = clean_text_value(row.get("validated_severity"))
            description = clean_text_value(row.get("description"))
            qualification_notes = clean_text_value(row.get("qualification_notes"))

            lines.append(
                f"- {source_id}: {title} | status={status} | priority={priority} | "
                f"reported_severity={reported} | validated_severity={validated}"
            )

            if description:
                lines.append(f"  description: {description[:250]}")

            if qualification_notes:
                lines.append(f"  qualification_notes: {qualification_notes[:200]}")

    if tasks:
        lines.append("")
        lines.append("Related task evidence:")

        for row in tasks[:20]:
            source_id = row.get("source_id") or f"tasks_{row.get('task_id')}"
            title = clean_text_value(row.get("title"))
            status = clean_text_value(row.get("status"))
            priority = clean_text_value(row.get("priority"))
            blocked_reason = clean_text_value(row.get("blocked_reason"))
            failure_reason = clean_text_value(row.get("failure_reason"))
            notes = clean_text_value(row.get("notes"))

            lines.append(
                f"- {source_id}: {title} | status={status} | priority={priority}"
            )

            if blocked_reason:
                lines.append(f"  blocked_reason: {blocked_reason[:250]}")

            if failure_reason:
                lines.append(f"  failure_reason: {failure_reason[:250]}")

            if notes:
                lines.append(f"  notes: {notes[:200]}")

    return "\n".join(lines)


# ============================================================
# Deterministic HYBRID fallback answers
# ============================================================

def fallback_top_equipment_answer(
    question: str,
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    fr = is_french_question(question)

    claims_by_equipment = {}
    work_orders_by_equipment = {}
    tasks_by_equipment = {}

    for row in related_records.get("claims", []):
        claims_by_equipment.setdefault(row.get("equipment_id"), []).append(row)

    for row in related_records.get("work_orders", []):
        work_orders_by_equipment.setdefault(row.get("equipment_id"), []).append(row)

    for row in related_records.get("tasks", []):
        tasks_by_equipment.setdefault(row.get("equipment_id"), []).append(row)

    if fr:
        lines = ["Résumé des équipements avec le plus de réclamations :"]
    else:
        lines = ["Summary of equipment with the most claims:"]

    for equipment in sql_result:
        equipment_id = equipment.get("equipment_id")
        name = equipment.get("equipment_name")
        asset_code = equipment.get("asset_code")
        claim_count = equipment.get("claim_count")

        claims = claims_by_equipment.get(equipment_id, [])
        work_orders = work_orders_by_equipment.get(equipment_id, [])
        tasks = tasks_by_equipment.get(equipment_id, [])

        claim_titles = []
        source_ids = []

        for row in claims[:3]:
            title = row.get("title")
            source_id = row.get("source_id")
            if title:
                claim_titles.append(title)
            if source_id:
                source_ids.append(source_id)

        for row in work_orders[:2]:
            source_id = row.get("source_id")
            if source_id:
                source_ids.append(source_id)

        for row in tasks[:2]:
            source_id = row.get("source_id")
            if source_id:
                source_ids.append(source_id)

        if fr:
            lines.append(
                f"- {name} ({asset_code}) a {claim_count} réclamations. "
                f"Les enregistrements liés montrent principalement: "
                f"{'; '.join(claim_titles) if claim_titles else 'aucun motif clair dans les réclamations récupérées'}. "
                f"Sources: {', '.join(source_ids[:6]) if source_ids else 'aucune source'}."
            )
        else:
            lines.append(
                f"- {name} ({asset_code}) has {claim_count} claims. "
                f"Related records mainly show: "
                f"{'; '.join(claim_titles) if claim_titles else 'no clear repeated issue in the retrieved claims'}. "
                f"Sources: {', '.join(source_ids[:6]) if source_ids else 'no sources'}."
            )

    if fr:
        lines.append("")
        lines.append("La base montre les équipements les plus réclamés, mais elle ne prouve pas forcément une cause racine unique.")
    else:
        lines.append("")
        lines.append("The database shows the most-claimed equipment, but it does not necessarily prove one single root cause.")

    return "\n".join(lines)


def fallback_overdue_answer(
    question: str,
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    fr = is_french_question(question)

    blocked_tasks_list = [
        row for row in related_records.get("tasks", [])
        if row.get("blocked_reason") or row.get("status") == "BLOCKED"
    ]

    risky_work_orders = [
        row for row in sql_result
        if row.get("predictive_outcome") or row.get("predictive_outcome_notes")
    ]

    if fr:
        lines = ["Les ordres de travail sont en retard selon la base de données."]
    else:
        lines = ["The work orders are overdue according to the database."]

    if risky_work_orders:
        if fr:
            lines.append("Facteurs visibles dans les ordres de travail :")
        else:
            lines.append("Visible factors in the work orders:")

        for row in risky_work_orders[:5]:
            lines.append(
                f"- {row.get('source_id')}: {row.get('title')} | "
                f"status={row.get('status')} | due_date={row.get('due_date')} | "
                f"predictive_outcome={row.get('predictive_outcome')} | "
                f"notes={row.get('predictive_outcome_notes')}"
            )

    if blocked_tasks_list:
        if fr:
            lines.append("Tâches bloquées liées :")
        else:
            lines.append("Related blocked tasks:")

        for row in blocked_tasks_list[:5]:
            lines.append(
                f"- {row.get('source_id')}: {row.get('title')} | "
                f"blocked_reason={row.get('blocked_reason')} | "
                f"failure_reason={row.get('failure_reason')}"
            )

    if not risky_work_orders and not blocked_tasks_list:
        if fr:
            lines.append("La base indique le retard, mais ne fournit pas de raison explicite claire.")
        else:
            lines.append("The database shows the work is overdue, but does not provide a clear explicit delay reason.")

    return "\n".join(lines)


def fallback_low_stock_answer(
    question: str,
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    fr = is_french_question(question)

    if fr:
        lines = ["Les pièces suivantes sont sous le stock minimum et peuvent affecter la maintenance :"]
    else:
        lines = ["The following spare parts are below minimum stock and may affect maintenance:"]

    for row in sql_result[:10]:
        lines.append(
            f"- {row.get('sku')} — {row.get('name')} "
            f"(stock={row.get('quantity_in_stock')}, minimum={row.get('min_stock_level')})"
        )

    part_usage = related_records.get("part_usage", [])
    work_orders = related_records.get("work_orders", [])
    tasks = related_records.get("tasks", [])

    if part_usage:
        if fr:
            lines.append("")
            lines.append("Utilisation liée des pièces :")
        else:
            lines.append("")
            lines.append("Related part usage:")

        for row in part_usage[:5]:
            lines.append(
                f"- part={row.get('part_name')} | wo_id={row.get('wo_id')} | "
                f"task_id={row.get('task_id')} | quantity_used={row.get('quantity_used')}"
            )

    impacted_sources = []

    for row in work_orders[:5]:
        if row.get("source_id"):
            impacted_sources.append(row.get("source_id"))

    for row in tasks[:5]:
        if row.get("source_id"):
            impacted_sources.append(row.get("source_id"))

    if impacted_sources:
        if fr:
            lines.append("")
            lines.append(f"Sources de maintenance liées: {', '.join(impacted_sources)}.")
        else:
            lines.append("")
            lines.append(f"Related maintenance sources: {', '.join(impacted_sources)}.")
    else:
        if fr:
            lines.append("")
            lines.append("La base montre un stock faible, mais ne prouve pas un impact direct sur des tâches ou ordres de travail.")
        else:
            lines.append("")
            lines.append("The database shows low stock, but does not prove a direct impact on tasks or work orders.")

    return "\n".join(lines)


def format_sql_comparison_answer(question: str, sql_result: List[Dict[str, Any]]) -> str:
    fr = is_french_question(question)
    if not sql_result:
        return "Aucune donnée de comparaison trouvée." if fr else "No comparison data found."
    
    lines = ["### Comparison Analysis" if not fr else "### Analyse Comparative"]
    lines.append("")
    
    for row in sql_result:
        dept = row.get("department_id", "Unknown")
        count = row.get("work_order_count", 0)
        cost = row.get("total_cost", 0)
        avg = row.get("avg_cost_per_wo", 0)
        
        if fr:
            lines.append(f"- **Département {dept}**: {count} ordres de travail, Coût total: {cost}, Moyenne/OT: {avg}")
        else:
            lines.append(f"- **Department {dept}**: {count} work orders, Total Cost: {cost}, Avg/WO: {avg}")
            
    return "\n".join(lines)


def fallback_generic_explain_set_answer(
    question: str,
    topic: str,
    sql_result: List[Dict[str, Any]],
    related_records: Dict[str, Any],
) -> str:
    fr = is_french_question(question)

    category_keywords = {
        "sensor_calibration": [
            "sensor", "calibration", "calibrate", "drift", "out of range",
            "oxygen cell", "pressure sensor", "probe"
        ],
        "leak_seal": [
            "leak", "seal", "gasket", "connector", "bellows", "pressure leak"
        ],
        "temperature_cooling_pressure": [
            "temperature", "overheat", "overheating", "cooling", "fan",
            "chiller", "pressure", "condenser", "refrigerant"
        ],
        "spare_part_shortage": [
            "part_shortage", "spare part", "below minimum", "stock",
            "waiting for", "unavailable", "shortage"
        ],
        "electrical_network": [
            "ups", "power", "battery", "network", "switch", "port", "packet", "sfp"
        ],
        "mechanical_movement": [
            "occlusion", "plunger", "movement", "drive", "pump", "mechanism",
            "handle", "brake", "loose"
        ],
        "sterilization_water_treatment": [
            "autoclave", "sterilizer", "washer", "steam", "water", "ro water",
            "dosing", "detergent"
        ],
    }

    labels_en = {
        "sensor_calibration": "Sensor and calibration problems",
        "leak_seal": "Leaks and seal failures",
        "temperature_cooling_pressure": "Temperature, cooling, and pressure problems",
        "spare_part_shortage": "Spare-part shortages or stock constraints",
        "electrical_network": "Electrical, power, or network issues",
        "mechanical_movement": "Mechanical movement or component issues",
        "sterilization_water_treatment": "Sterilization or water-treatment issues",
    }

    labels_fr = {
        "sensor_calibration": "Problèmes de capteurs et de calibration",
        "leak_seal": "Fuites et défaillances de joints",
        "temperature_cooling_pressure": "Problèmes de température, refroidissement et pression",
        "spare_part_shortage": "Manque de pièces de rechange ou contraintes de stock",
        "electrical_network": "Problèmes électriques, alimentation ou réseau",
        "mechanical_movement": "Problèmes mécaniques ou de mouvement",
        "sterilization_water_treatment": "Problèmes de stérilisation ou traitement d'eau",
    }

    buckets = {key: [] for key in category_keywords.keys()}

    def combined_text(row: Dict[str, Any]) -> str:
        fields = [
            row.get("title"),
            row.get("description"),
            row.get("predictive_outcome"),
            row.get("predictive_outcome_notes"),
            row.get("blocked_reason"),
            row.get("failure_reason"),
            row.get("notes"),
            row.get("classification"),
            row.get("category"),
        ]

        return " ".join(str(value or "") for value in fields).lower()

    all_rows = []

    for row in sql_result[:30]:
        all_rows.append(("work_orders", row))

    for row in related_records.get("claims", [])[:20]:
        all_rows.append(("claims", row))

    for row in related_records.get("tasks", [])[:30]:
        all_rows.append(("tasks", row))

    for record_type, row in all_rows:
        text = combined_text(row)

        if record_type == "work_orders":
            source_id = row.get("source_id") or f"work_orders_{row.get('wo_id')}"
        elif record_type == "claims":
            source_id = row.get("source_id") or f"claims_{row.get('claim_id')}"
        else:
            source_id = row.get("source_id") or f"tasks_{row.get('task_id')}"

        title = row.get("title") or row.get("description") or ""

        for category, keywords in category_keywords.items():
            if any(keyword in text for keyword in keywords):
                if len(buckets[category]) < 5:
                    buckets[category].append(f"{source_id}: {str(title)[:120]}")

    labels = labels_fr if fr else labels_en

    lines = (
        ["Les causes visibles dans la base sont :"]
        if fr else
        ["The visible causes in the database are:"]
    )

    found_any = False

    for category, examples in buckets.items():
        if not examples:
            continue

        found_any = True
        lines.append("")
        lines.append(f"{labels[category]}:")

        for example in examples[:5]:
            lines.append(f"- {example}")

    if not found_any:
        return (
            "La base contient des ordres de travail liés, mais les causes ne sont pas clairement décrites dans les champs disponibles."
            if fr else
            "The database contains related work orders, but the available fields do not clearly state the causes."
        )

    lines.append("")
    lines.append(
        "Cette réponse est basée uniquement sur les titres, descriptions, notes prédictives, raisons de blocage et raisons d'échec disponibles."
        if fr else
        "This answer is based only on available titles, descriptions, predictive notes, blocked reasons, and failure reasons."
    )

    return "\n".join(lines)


# ============================================================
# Prompt helpers
# ============================================================

SECURITY_PROMPT_RULES = """
Security rules:
- Do not reveal passwords, password hashes, tokens, secrets, authentication data, database credentials, or internal permission mappings.
- Do not generate SQL, PHP, shell scripts, or code intended to extract, dump, modify, bypass, or exfiltrate database data.
- If the user asks for restricted data or data-extraction code, refuse briefly and redirect to maintenance-related help.
- Answer in the same language as the user question.
""".strip()


def _get_unified_system_instructions(fr: bool) -> str:
    if fr:
        return """Tu es Victoria, l'assistante IA experte du système CMMS.
Ton objectif est de fournir des réponses précises, basées sur les faits et structurées professionnellement.

CONSIGNES DE FORMAT :
- Commence directement par un résumé factuel clair.
- Explique brièvement d'où viennent les informations.
- Liste les enregistrements pertinents avec leurs détails (ID, Statut, Priorité, Date, Note).
- Termine par un résumé des tendances et une action recommandée claire.
- N'utilise JAMAIS de crochets comme [Réponse Directe] ou [Explication]. Écris naturellement.
- Utilise le gras (**texte**) pour mettre en valeur les éléments importants.

EXEMPLES :
- Comptage : "Il y a **12** ordres de travail ouverts. Répartition : **4** critiques, **5** hauts, **3** moyens."
- Pourquoi : "Les retards sont principalement dus à des manques de pièces détachées, comme documenté dans les ordres work_orders_185 et work_orders_441."
- Historique : "L'équipement CT scanner 007 a été impliqué dans **3 réclamations** liées à des vibrations du compresseur."
"""
    else:
        return """You are Victoria, the expert AI assistant for the CMMS system.
Your goal is to provide accurate, fact-based, and professionally structured answers.

FORMATTING RULES:
- Start directly with a clear factual summary.
- Briefly explain where the information was found.
- List relevant records with their details (ID, Status, Priority, Date, Note).
- End with a summary of patterns and a clear recommended action.
- NEVER use bracket labels like [Direct Answer] or [Brief explanation]. Write naturally.
- Use bold (**text**) to highlight important elements.

EXAMPLES:
- Count: "There are **12** open work orders. Breakdown: **4** critical, **5** high, **3** medium."
- Why: "The delays are primarily caused by part shortages, as documented in work_orders_185 and work_orders_441."
- History: "CT scanner 007 has been involved in **3 claims** related to compressor vibration issues."
"""



def build_top_equipment_hybrid_prompt(
    question: str,
    compact_evidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    
    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Explain why the top equipment have the most claims using the evidence below.

SPECIFIC GUIDELINES:
- Handle each equipment separately.
- Cite IDs like claims_10 or work_orders_20.
- Summary should highlight if it's a recurring technical pattern or just high usage.

EVIDENCE:
{compact_evidence}

USER QUESTION: {question}

Answer using the structured template:"""


def build_overdue_hybrid_prompt(
    question: str,
    compact_evidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    
    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Explain why these overdue work orders appear delayed using the evidence below.

SPECIFIC GUIDELINES:
- Look for PART_SHORTAGE, SLA_RISK, or BLOCKED tasks.
- Cite IDs like work_orders_185.
- Recommended action should address the specific bottleneck (e.g., "Order parts for WO-123").

EVIDENCE:
{compact_evidence}

USER QUESTION: {question}

Answer using the structured template:"""


def build_low_stock_hybrid_prompt(
    question: str,
    compact_evidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    
    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Explain the impact of low stock spare parts on maintenance tasks using the evidence below.

SPECIFIC GUIDELINES:
- Link specific SKUs to the work orders or tasks they are blocking.
- Summary should indicate the overall risk to the maintenance schedule.

EVIDENCE:
{compact_evidence}

USER QUESTION: {question}

Answer using the structured template:"""


def build_generic_explain_set_prompt(
    question: str,
    topic: str,
    compact_evidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    
    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Analyze the provided records to answer the user's explanation/why question about {topic}.

SPECIFIC GUIDELINES:
- Group evidence by category (e.g., Sensor Issues, Leaks) if applicable.
- Focus on finding root causes in descriptions and notes.

EVIDENCE:
{compact_evidence}

USER QUESTION: {question}

Answer using the structured template:"""


def build_top_equipment_prompt(
    question: str,
    compact_evidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    
    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Explain which equipment have the most claims and summarize the recurring issues found in the related records.

EVIDENCE:
{compact_evidence}

USER QUESTION: {question}

Answer using a helpful narrative summary. Be concise and professional."""


def build_overdue_prompt(
    question: str,
    compact_evidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    
    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Explain the status of overdue work orders and any visible blockers or recurring causes.

EVIDENCE:
{compact_evidence}

USER QUESTION: {question}

Answer using a helpful narrative summary. Be concise and professional."""


def build_rag_prompt(
    question: str,
    context: str,
    sources: List[str],
    retrieval_confidence: str,
) -> str:
    fr = is_french_question(question)
    system = _get_unified_system_instructions(fr)
    sources_text = ", ".join(sources)

    return f"""{system}

{SECURITY_PROMPT_RULES}

TASK: Answer the user's search or history question based ONLY on the retrieved context snippets.

RETRIEVED CONTEXT:
{context}

SOURCES: {sources_text}
CONFIDENCE: {retrieval_confidence}

USER QUESTION: {question}

Answer using the structured template:"""



# ============================================================
# Deterministic RAG extractive answers
# ============================================================

def _compact_text(value: Any, max_len: int = 1200) -> str:
    text = str(value or "").replace("\r", " ").strip()
    text = re.sub(r"\s+", " ", text)
    if len(text) > max_len:
        # Try to cut at the last space before max_len
        cut_point = text.rfind(" ", 0, max_len)
        if cut_point != -1:
            return text[:cut_point].rstrip() + "..."
        return text[:max_len].rstrip() + "..."
    return text


def _debug_sources_from_results(results: List[Dict[str, Any]]) -> List[SourceItem]:
    return [
        SourceItem(
            id=item["id"],
            record_type=item["record_type"],
            distance=item["distance"],
            metadata=redact_rows([item.get("metadata", {})])[0],
        )
        for item in results
    ]


def _line_or_sentence_matches(document: str, keywords: List[str], max_items: int = 3) -> List[str]:
    doc = str(document or "")
    chunks = []

    for raw in re.split(r"[\\n\\r]+|(?<=[.!?])\\s+", doc):
        part = raw.strip(" -:\\t")
        if not part:
            continue

        lower = part.lower()
        if any(k in lower for k in keywords):
            chunks.append(_compact_text(part, 1000))

        if len(chunks) >= max_items:
            break

    if not chunks:
        lower_doc = doc.lower()
        if any(k in lower_doc for k in keywords):
            chunks.append(_compact_text(doc, 1100))

    return chunks


def build_deterministic_rag_answer(
    question: str,
    raw_results: List[Dict[str, Any]],
) -> Optional[str]:
    q = (question or "").lower()

    is_cancellation = any(x in q for x in [
        "cancel", "cancelled", "canceled", "cancellation",
        "annul", "annulé", "annule", "annulation",
    ])

    is_symptom = any(x in q for x in [
        "symptom", "symptoms", "reported", "observed", "staff report",
        "drift", "leak", "leakage", "alarm", "warning", "not lock",
        "symptôme", "symptome", "signalé", "signale", "observé", "observe",
    ])

    is_notes = any(x in q for x in [
        "notes", "note", "what do the notes say", "what does the note say",
        "cancellation notes", "completion notes", "validation notes",
        "blocked reason", "failure reason", "predictive notes",
        "comment", "remarks", "observations",
    ])

    is_action = any(x in q for x in [
        "corrective action", "action required", "required action",
        "scope", "scope of work", "required checks", "repair plan",
        "planned action", "what was planned", "what repair was planned",
        "action corrective", "contrôles requis", "controles requis",
    ])

    is_predictive = any(x in q for x in [
        "predictive", "prediction", "failure risk", "part shortage",
        "sla risk", "risk note", "predicted", "prévision", "prevision",
    ])

    if not any([is_cancellation, is_symptom, is_notes, is_action, is_predictive]):
        return None

    if is_cancellation:
        keywords = [
            "cancellation_notes", "cancellation notes", "cancelled because",
            "canceled because", "cancelled", "canceled", "merged into",
            "higher priority",
        ]
        title = "Cancellation information found in the retrieved maintenance records:"
    elif is_symptom:
        keywords = [
            "symptoms:", "symptom", "staff reports", "reported", "observed",
            "does not lock", "drift", "leak", "leakage", "alarm", "warning",
            "fault", "pressure", "temperature",
        ]
        title = "Symptoms found in the retrieved maintenance records:"
    if is_action:
        keywords = [
            "scope:", "required checks:", "corrective action", "action required",
            "replace", "inspect", "verify", "repair", "planned action",
            "restore service",
        ]
        title = "Planned Corrective Action:"
    elif is_predictive:
        keywords = [
            "predictive_outcome", "predictive outcome", "predictive_outcome_notes",
            "predictive notes", "failure_risk", "failure risk", "part_shortage",
            "part shortage", "risk", "prediction based",
        ]
        title = "Predictive Analysis:"
    else:
        keywords = [
            "notes", "cancellation_notes", "completion_notes", "validation_notes",
            "blocked_reason", "failure_reason", "predictive_outcome_notes",
            "reason", "comment", "remarks",
        ]
        title = "Maintenance Records Evidence:"

    lines_content = []
    relevant_records = []
    used_sources = []
    added = 0

    for item in raw_results[:10]:
        source_id = item.get("id")
        document = item.get("document", "")
        matches = _line_or_sentence_matches(document, keywords, max_items=2)

        if not matches:
            continue

        used_sources.append(source_id)
        relevant_records.append(item)

        for match in matches:
            cleaned_match = clean_record_content(match)
            if cleaned_match:
                source_text = highlight_id(source_id)
                content_text = highlight_id(cleaned_match)
                lines_content.append(f"• In **{source_text}**: {content_text}")
                added += 1
            if added >= 8:
                break
        if added >= 8:
            break

    if not lines_content:
        return None

    fr = is_french_question(question)
    
    return build_victoria_structured_answer(
        direct_answer=title,
        explanation="Extracted directly from maintenance logs and technical fields in the database." if not fr else "Extrait directement des journaux de maintenance et des champs techniques de la base.",
        records=relevant_records,
        summary="\n".join(lines_content),
        recommendation="Verify the specific findings in the referenced records for further details." if not fr else "Vérifiez les résultats spécifiques dans les enregistrements référencés pour plus de détails.",
        fr=fr
    )


def try_deterministic_rag_response(
    request: AskRequest,
    start: float,
    forced_route: str,
    raw_results: List[Dict[str, Any]],
    sources: List[str],
    selected_record_types: List[str],
) -> Optional[AskResponse]:
    answer = build_deterministic_rag_answer(
        question=request.question,
        raw_results=raw_results,
    )

    if not answer:
        return None

    debug_sources = None
    if request.debug:
        debug_sources = _debug_sources_from_results(raw_results)

    return AskResponse(
        answer=answer,
        route=forced_route,
        sql_intent=None,
        sql_result=None,
        sources=sources,
        selected_record_types=selected_record_types,
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=debug_sources,
    )


# ============================================================
# Route handlers
# ============================================================

def run_generic_sql_plan(
    sql_intent: str,
    plan: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = None,
    months: Optional[int] = None,
):
    """
    Generic SQL dispatcher.

    Compatible with both call styles:
    - run_generic_sql_plan(sql_intent, plan=plan)
    - run_generic_sql_plan(sql_intent=..., limit=..., months=...)
    """
	

    if plan is None:
        plan = {}

    limit = int(plan.get("limit", limit if limit is not None else 10))
    months = int(plan.get("months", months if months is not None else 12))
    range_key = plan.get("range_key", "last_30_days")
    status = plan.get("status")
    priority = plan.get("priority")
    user_id = plan.get("user_id")
    days = int(plan.get("days", 90))
    record_id = plan.get("record_id")
    sku = plan.get("sku")

    # ============================================================
    # RECORD_LOOKUP
    # ============================================================

    if sql_intent in [
        "lookup_work_order_by_id",
        "lookup_claim_by_id",
        "lookup_equipment_by_id",
        "lookup_task_by_id",
        "lookup_spare_part_by_id",
    ]:
        if record_id is None:
            return [{
                "error": f"Missing record_id for {sql_intent}. The planner selected a record lookup but did not extract an ID."
            }]

    if sql_intent == "lookup_spare_part_by_sku":
        if not sku:
            return [{
                "error": "Missing SKU for lookup_spare_part_by_sku. The planner selected SKU lookup but did not extract a SKU."
            }]
        return lookup_spare_part_by_sku(str(sku))

    if sql_intent == "lookup_work_order_by_id":
        return lookup_work_order_by_id(int(record_id))

    if sql_intent == "lookup_claim_by_id":
        return lookup_claim_by_id(int(record_id))

    if sql_intent == "lookup_equipment_by_id":
        return lookup_equipment_by_id(int(record_id))

    if sql_intent == "lookup_task_by_id":
        return lookup_task_by_id(int(record_id))

    if sql_intent == "lookup_spare_part_by_id":
        return lookup_spare_part_by_id(int(record_id))


    

        



    # ============================================================
    # SQL_COUNT
    # ============================================================

    if sql_intent == "generic_count_departments":
        return generic_count_departments()

    if sql_intent == "generic_count_equipment":
        return generic_count_equipment()

    if sql_intent == "generic_count_work_orders":
        return generic_count_work_orders()

    if sql_intent == "generic_count_claims":
        return generic_count_claims()

    if sql_intent == "generic_count_tasks":
        return generic_count_tasks()

    if sql_intent == "generic_count_spare_parts":
        return generic_count_spare_parts()

    if sql_intent == "generic_count_technicians":
        return generic_count_technicians()

    if sql_intent == "generic_count_open_work_orders":
        return generic_count_open_work_orders()

    if sql_intent == "generic_count_open_claims":
        return generic_count_open_claims()

    if sql_intent == "generic_count_completed_tasks":
        return generic_count_completed_tasks()

    if sql_intent == "generic_count_status_work_orders":
        return generic_count_status_work_orders(status)

    if sql_intent == "generic_count_status_claims":
        return generic_count_status_claims(status)

    if sql_intent == "generic_count_status_tasks":
        return generic_count_status_tasks(status)

    if sql_intent == "generic_count_status_equipment":
        return generic_count_status_equipment()

    if sql_intent == "generic_list_all_equipment":
        return generic_list_all_equipment(limit)

    if sql_intent == "generic_count_priority_work_orders":
        return generic_count_priority_work_orders(priority)

    if sql_intent == "generic_count_priority_claims":
        return generic_count_priority_claims(priority)

    if sql_intent == "generic_count_priority_tasks":
        return generic_count_priority_tasks(priority)

    # ============================================================
    # SQL_DATE_FILTER
    # ============================================================

    if sql_intent == "generic_count_work_orders_date_range":
        return generic_count_work_orders_date_range(range_key)

    if sql_intent == "generic_count_claims_date_range":
        return generic_count_claims_date_range(range_key)

    if sql_intent == "generic_list_work_orders_date_range":
        return generic_list_work_orders_date_range(range_key, limit)

    if sql_intent == "generic_completed_work_orders_date_range":
        return generic_completed_work_orders_date_range(range_key, limit)

    if sql_intent == "generic_maintenance_cost_date_range":
        return generic_maintenance_cost_date_range(range_key)

    # ============================================================
    # SQL_AGGREGATE
    # ============================================================

    if sql_intent == "generic_department_maintenance_cost":
        return generic_department_maintenance_cost(limit)

    if sql_intent == "generic_work_orders_by_department":
        return generic_work_orders_by_department(limit)

    if sql_intent == "generic_claims_by_department":
        return generic_claims_by_department(limit)

    if sql_intent == "generic_overdue_work_orders_by_department":
        return generic_overdue_work_orders_by_department(limit)

    if sql_intent == "generic_critical_work_orders_by_department":
        return generic_critical_work_orders_by_department(limit)

    if sql_intent == "generic_technician_completed_tasks":
        return generic_technician_completed_tasks(limit)

    if sql_intent == "generic_technician_completed_work_orders":
        return generic_technician_completed_work_orders(limit)

    if sql_intent == "generic_open_work_orders_by_technician":
        return generic_open_work_orders_by_technician(limit)

    if sql_intent == "generic_overdue_work_orders_by_technician":
        return generic_overdue_work_orders_by_technician(limit)

    if sql_intent == "generic_avg_repair_time_by_technician":
        return generic_avg_repair_time_by_technician(limit)

    if sql_intent == "generic_avg_repair_time_by_category":
        return generic_avg_repair_time_by_category(limit)

    if sql_intent == "generic_supplier_spare_part_cost":
        return generic_supplier_spare_part_cost(limit)

    if sql_intent == "generic_work_orders_by_priority":
        return generic_work_orders_by_priority()

    if sql_intent == "generic_claims_by_priority":
        return generic_claims_by_priority()

    if sql_intent == "generic_cost_by_priority":
        return generic_cost_by_priority()

    if sql_intent == "generic_cost_by_status":
        return generic_cost_by_status()

    if sql_intent == "generic_average_work_order_cost":
        return generic_average_work_order_cost()

    if sql_intent == "generic_cost_by_work_order_type":
        return generic_cost_by_work_order_type()

    # ============================================================
    # SQL_FILTER_LIST
    # ============================================================

    if sql_intent == "generic_list_status_work_orders":
        return generic_list_status_work_orders(status, limit)

    if sql_intent == "generic_list_status_claims":
        return generic_list_status_claims(status, limit)

    if sql_intent == "generic_list_priority_work_orders":
        return generic_list_priority_work_orders(priority, limit)

    if sql_intent == "generic_list_priority_claims":
        return generic_list_priority_claims(priority, limit)

    if sql_intent == "generic_list_open_work_orders":
        return generic_list_open_work_orders(limit)

    if sql_intent == "generic_list_open_claims":
        return generic_list_open_claims(limit)

    if sql_intent == "generic_list_overdue_work_orders":
        return generic_list_overdue_work_orders(limit)

    if sql_intent == "generic_list_blocked_tasks":
        return generic_list_blocked_tasks(limit)

    if sql_intent == "generic_list_tasks_by_technician":
        return generic_list_tasks_by_technician(user_id, limit)

    if sql_intent == "generic_list_low_stock_parts":
        return generic_list_low_stock_parts(limit)

    if sql_intent == "generic_list_out_of_stock_parts":
        return generic_list_out_of_stock_parts(limit)

    if sql_intent == "generic_list_parts_near_expiry":
        return generic_list_parts_near_expiry(days, limit)

    if sql_intent == "generic_list_work_orders_blocked_by_parts":
        return generic_list_work_orders_blocked_by_parts(limit)

    if sql_intent == "generic_list_actual_cost_exceeded_estimate":
        return generic_list_actual_cost_exceeded_estimate(limit)

    # ============================================================
    # SQL_TOP_N
    # ============================================================

    if sql_intent == "generic_top_equipment_by_work_orders":
        return generic_top_equipment_by_work_orders(limit)

    if sql_intent == "generic_top_equipment_by_cost":
        return generic_top_equipment_by_cost(limit)

    if sql_intent == "generic_top_equipment_by_critical_work_orders":
        return generic_top_equipment_by_critical_work_orders(limit)

    if sql_intent == "generic_equipment_repeated_failures":
        return generic_equipment_repeated_failures(limit)

    if sql_intent == "generic_equipment_replacement_candidates":
        return generic_equipment_replacement_candidates(limit)

    if sql_intent == "generic_top_used_spare_parts":
        return generic_top_used_spare_parts(limit)

    if sql_intent == "generic_top_expensive_spare_parts":
        return generic_top_expensive_spare_parts(limit)

    if sql_intent == "generic_supplier_by_part_usage":
        return generic_supplier_by_part_usage(limit)

    if sql_intent == "generic_stock_value_by_category":
        return generic_stock_value_by_category(limit)



    # ============================================================
    # SQL_TIME_SERIES
    # ============================================================

    if sql_intent == "generic_monthly_work_order_trend":
        return generic_monthly_work_order_trend(months)

    if sql_intent == "generic_monthly_claim_trend":
        return generic_monthly_claim_trend(months)

    if sql_intent == "generic_monthly_maintenance_cost_trend":
        return generic_monthly_maintenance_cost_trend(months)

    if sql_intent == "generic_monthly_maintenance_cost_by_category":
        return generic_monthly_maintenance_cost_by_category(months)

    if sql_intent == "generic_monthly_part_usage_trend":
        return generic_monthly_part_usage_trend(months)

    # ============================================================
    # SQL_NEW_ANALYTICS (Meters, Plans, Inventory, Comparison)
    # ============================================================

    if sql_intent == "generic_meter_readings_by_equipment":
        return generic_meter_readings_by_equipment(limit)

    if sql_intent == "generic_upcoming_maintenance_plans":
        return generic_upcoming_maintenance_plans(limit)

    if sql_intent == "generic_inventory_valuation":
        return generic_inventory_valuation(limit)

    if sql_intent == "generic_department_cost_comparison":
        return generic_department_cost_comparison(limit, range_key)

    return [{"error": f"Unsupported generic SQL intent: {sql_intent}"}]

def format_generic_sql_answer(
    question: str,
    sql_intent: str,
    sql_result: List[Dict[str, Any]],
) -> str:
    fr = is_french_question(question)

    if not sql_result:
        return "Aucun résultat trouvé." if fr else "No matching records were found."

    if sql_result_has_error(sql_result):
        return f"I could not complete this analytics query: {sql_result[0].get('error')}"

    if sql_intent.startswith("generic_count_"):
        if len(sql_result) == 1:
            row = sql_result[0]
            parts = [f"the **{str(key).replace('_', ' ').title()}** is **{value}**" for key, value in row.items()]
            return "According to the database, " + ", ".join(parts) + "."
        else:
            return format_conversational_summary(sql_result, fr)

    if sql_intent.startswith("lookup_"):
        row = sql_result[0]
        parts = []
        for key, value in row.items():
            if value is None or str(value).strip() == "":
                continue
            parts.append(f"the **{str(key).replace('_', ' ').title()}** is **{highlight_id(str(value))}**")
        return "I found the following details: " + ", ".join(parts) + "."

    if sql_intent == "generic_meter_readings_by_equipment":
        lines = []
        for row in sql_result[:10]:
            lines.append(f"• **{row.get('equipment_name')}**: {row.get('meter_name')} recorded at **{row.get('reading_value')}** on {row.get('reading_date')}.")
        return "\n".join(lines)

    if sql_intent == "generic_upcoming_maintenance_plans":
        lines = []
        for row in sql_result[:10]:
            lines.append(f"• **{row.get('plan_name')}** for {row.get('equipment_name')} is due on **{row.get('next_due_date')}**.")
        return "\n".join(lines)

    if sql_intent == "generic_inventory_valuation":
        lines = []
        for row in sql_result[:10]:
            lines.append(f"• **{row.get('category')}**: {row.get('items_count')} items valued at **${row.get('category_value')}**.")
        return "\n".join(lines)

    if sql_intent == "generic_department_cost_comparison":
        lines = []
        for row in sql_result[:10]:
            lines.append(f"• **Dept {row.get('department_id')}**: Total cost of **${row.get('total_cost')}** over {row.get('work_order_count')} orders.")
        return "\n".join(lines)

    return format_conversational_summary(sql_result[:30], fr)


def handle_chitchat_route(request: AskRequest, start: float) -> AskResponse:
    # Just a quick, stateless LLM call for friendly chat. No RAG needed.
    prompt = f"The user said: '{request.question}'. Respond warmly, naturally, and briefly (1-2 sentences). You are a helpful AI assistant for a Maintenance Management System (CMMS)."
    
    try:
        response = requests.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": request.model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.7},
            },
            timeout=30,
        )
        response.raise_for_status()
        answer = response.json().get("response", "Hello! How can I help you with maintenance today?").strip()
    except Exception as e:
        answer = "Hello! How can I help you with your maintenance system today?"

    return AskResponse(
        answer=answer,
        route="CHITCHAT",
        sql_intent=None,
        sql_result=None,
        sources=[],
        selected_record_types=[],
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_generic_sql_route(
    request: AskRequest,
    start: float,
    plan: Dict[str, Any],
) -> AskResponse:
    sql_intent = plan.get("sql_intent", "generic_sql")

    if plan.get("plan") == "RECORD_LOOKUP":
        if sql_intent == "lookup_spare_part_by_sku":
            if not plan.get("sku"):
                return handle_rag_route(
                    request=request,
                    start=start,
                    forced_route="RAG",
                )
        else:
            if plan.get("record_id") is None:
                return handle_rag_route(
                    request=request,
                    start=start,
                    forced_route="RAG",
                )

    sql_result = run_generic_sql_plan(
        sql_intent=sql_intent,
        plan=plan,
    )

    sql_result = redact_rows(sql_result)

    answer = format_generic_sql_answer(
        question=request.question,
        sql_intent=sql_intent,
        sql_result=sql_result,
    )

    sources = collect_source_ids_from_sql(sql_result)

    return AskResponse(
        answer=answer,
        route="SQL",
        sql_intent=sql_intent,
        sql_result=sql_result,
        sources=sources,
        selected_record_types=plan.get("selected_record_types", []),
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def make_sql_error_response(
    request: AskRequest,
    start: float,
    sql_intent: Optional[str],
    message: str,
) -> AskResponse:
    return AskResponse(
        answer=message,
        route="SQL_ERROR",
        sql_intent=sql_intent,
        sql_result=None,
        sources=[],
        selected_record_types=[],
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_sql_route(request: AskRequest, start: float) -> AskResponse:
    sql_intent = detect_sql_intent(request.question)

    if sql_intent == "unknown_sql":
        return handle_rag_route(request, start, forced_route="RAG")

    sql_result = run_sql_intent(sql_intent)
    sql_result = redact_rows(sql_result)

    if sql_result_has_error(sql_result):
        return make_sql_error_response(
            request=request,
            start=start,
            sql_intent=sql_intent,
            message=(
                "I could not complete this database query because of an internal query error. "
                "The issue should be fixed in the API SQL template, not interpreted as a maintenance finding."
            ),
        )

    answer = format_sql_answer(
        question=request.question,
        sql_intent=sql_intent,
        sql_result=sql_result,
    )

    return AskResponse(
        answer=answer,
        route="SQL",
        sql_intent=sql_intent,
        sql_result=sql_result,
        sources=[],
        selected_record_types=[],
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_top_equipment_hybrid(request: AskRequest, start: float, limit: int = 3) -> AskResponse:
    sql_intent = "top_equipment_by_claims"

    sql_result = top_equipment_by_claims(limit)
    sql_result = redact_rows(sql_result)

    if sql_result_has_error(sql_result):
        return make_sql_error_response(
            request=request,
            start=start,
            sql_intent=sql_intent,
            message=(
                "I could not complete this hybrid database query because of an internal query error. "
                "The issue should be fixed in the API SQL template, not interpreted as a maintenance finding."
            ),
        )

    equipment_ids = [
        row["equipment_id"]
        for row in sql_result
        if "equipment_id" in row
    ]

    related_records = get_related_records_for_equipment(equipment_ids)
    related_records = redact_related_records(related_records)

    hybrid_sources = collect_source_ids_from_related(related_records)

    answer_static = fallback_top_equipment_answer(
        question=request.question,
        sql_result=sql_result,
        related_records=related_records,
    )

    # --- LLM Synthesis for Hybrid Findings ---
    prompt = build_top_equipment_prompt(
        question=request.question,
        compact_evidence=answer_static,
    )
    
    answer_llm = ollama_generate(prompt, request.model)
    
    if answer_llm and len(answer_llm) > 50:
        answer = answer_llm
    else:
        answer = answer_static

    return AskResponse(
        answer=answer,
        route="HYBRID",
        sql_intent=sql_intent,
        sql_result=sql_result,
        sources=hybrid_sources,
        selected_record_types=["claims", "work_orders", "tasks"],
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_overdue_hybrid(request: AskRequest, start: float) -> AskResponse:
    sql_intent = "overdue_work_orders"

    sql_result = overdue_work_orders()
    sql_result = redact_rows(sql_result)

    if sql_result_has_error(sql_result):
        return make_sql_error_response(
            request=request,
            start=start,
            sql_intent=sql_intent,
            message=(
                "I could not complete this hybrid database query because of an internal query error. "
                "The issue should be fixed in the API SQL template, not interpreted as a maintenance finding."
            ),
        )

    wo_ids = [
        row["wo_id"]
        for row in sql_result
        if "wo_id" in row
    ]

    related_records = get_related_records_for_work_orders(wo_ids)
    related_records = redact_related_records(related_records)

    hybrid_sources = collect_source_ids_from_sql(sql_result)

    for source_id in collect_source_ids_from_related(related_records):
        if source_id not in hybrid_sources:
            hybrid_sources.append(source_id)

    answer_static = fallback_overdue_answer(
        question=request.question,
        sql_result=sql_result,
        related_records=related_records,
    )

    # --- LLM Synthesis for Hybrid Findings ---
    prompt = build_overdue_prompt(
        question=request.question,
        compact_evidence=answer_static,
    )
    
    answer_llm = ollama_generate(prompt, request.model)
    
    if answer_llm and len(answer_llm) > 50:
        answer = answer_llm
    else:
        answer = answer_static

    return AskResponse(
        answer=answer,
        route="HYBRID",
        sql_intent=sql_intent,
        sql_result=sql_result,
        sources=hybrid_sources,
        selected_record_types=["claims", "work_orders", "tasks"],
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_low_stock_hybrid(request: AskRequest, start: float) -> AskResponse:
    sql_intent = "spare_parts_below_min_stock"

    sql_result = spare_parts_below_min_stock()
    sql_result = redact_rows(sql_result)

    if sql_result_has_error(sql_result):
        return make_sql_error_response(
            request=request,
            start=start,
            sql_intent=sql_intent,
            message=(
                "I could not complete this hybrid database query because of an internal query error. "
                "The issue should be fixed in the API SQL template, not interpreted as a maintenance finding."
            ),
        )

    part_ids = [
        row["part_id"]
        for row in sql_result
        if "part_id" in row
    ]

    related_records = get_related_records_for_low_stock_parts(part_ids)
    related_records = redact_related_records(related_records)

    hybrid_sources = collect_source_ids_from_related(related_records)

    for row in sql_result:
        part_id = row.get("part_id")

        if part_id is not None:
            source_id = f"spare_parts_{part_id}"

            if source_id not in hybrid_sources:
                hybrid_sources.append(source_id)

    answer_static = fallback_low_stock_answer(
        question=request.question,
        sql_result=sql_result,
        related_records=related_records,
    )

    # --- LLM Synthesis for Hybrid Findings ---
    prompt = build_low_stock_hybrid_prompt(
        question=request.question,
        compact_evidence=answer_static,
    )
    
    answer_llm = ollama_generate(prompt, request.model)
    
    if answer_llm and len(answer_llm) > 50:
        answer = answer_llm
    else:
        answer = answer_static

    return AskResponse(
        answer=answer,
        route="HYBRID",
        sql_intent=sql_intent,
        sql_result=sql_result,
        sources=hybrid_sources,
        selected_record_types=["spare_parts", "part_usage", "work_orders", "tasks"],
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_generic_explain_set_hybrid(
    request: AskRequest,
    start: float,
    plan: Dict[str, Any],
) -> AskResponse:
    topic = plan.get("topic", "unknown")
    sql_intent = plan.get("sql_intent", "generic_explain_set")
    limit = int(plan.get("limit", 30))

    if topic == "critical_work_order_causes":
        sql_result = generic_critical_work_order_causes(limit)
    elif topic == "equipment_failure_causes":
        sql_result = generic_equipment_failure_causes(limit)
    elif topic == "highest_cost_departments_causes":
        sql_result = generic_highest_cost_departments_causes(limit)
    else:
        return handle_rag_route(request, start, forced_route="RAG")

    sql_result = redact_rows(sql_result)

    if sql_result_has_error(sql_result):
        return make_sql_error_response(
            request=request,
            start=start,
            sql_intent=sql_intent,
            message=(
                "I could not complete this generic hybrid database query because of an internal query error. "
                "The issue should be fixed in the API SQL template, not interpreted as a maintenance finding."
            ),
        )

    wo_ids = [
        row["wo_id"]
        for row in sql_result
        if "wo_id" in row and row["wo_id"] is not None
    ]

    related_records = get_generic_related_records_for_work_orders(wo_ids)
    related_records = redact_related_records(related_records)

    hybrid_sources = collect_source_ids_from_sql(sql_result)

    for source_id in collect_source_ids_from_related(related_records):
        if source_id not in hybrid_sources:
            hybrid_sources.append(source_id)

    answer_static = fallback_generic_explain_set_answer(
        question=request.question,
        topic=topic,
        sql_result=sql_result,
        related_records=related_records,
    )

    # --- LLM Synthesis for Hybrid Findings ---
    prompt = build_generic_explain_set_prompt(
        question=request.question,
        topic=topic,
        compact_evidence=answer_static,
    )
    
    answer_llm = ollama_generate(prompt, request.model)
    
    if answer_llm and len(answer_llm) > 50:
        answer = answer_llm
    else:
        answer = answer_static

    return AskResponse(
        answer=answer,
        route="HYBRID",
        sql_intent=sql_intent,
        sql_result=sql_result,
        sources=hybrid_sources,
        selected_record_types=plan.get(
            "selected_record_types",
            ["work_orders", "claims", "tasks", "equipment"],
        ),
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=None,
    )


def handle_hybrid_route(request: AskRequest, start: float) -> AskResponse:
    generic_plan = plan_generic_question(request.question)

    if generic_plan and generic_plan.get("route") == "HYBRID":
        if generic_plan.get("plan") == "HYBRID_LOW_STOCK":
            return handle_low_stock_hybrid(request, start)
        if generic_plan.get("plan") == "HYBRID_EXPLAIN_TOP_CLAIMS":
            limit = generic_plan.get("limit", 5)
            return handle_top_equipment_hybrid(request, start, limit=limit)
        return handle_generic_explain_set_hybrid(
            request=request,
            start=start,
            plan=generic_plan,
        )

    if generic_plan and generic_plan.get("route") == "RAG":
        return handle_rag_route(
            request=request,
            start=start,
            forced_route="RAG",
        )

    decision = classify_question(request.question)
    intent = decision.get("intent", "")

    question_lower = request.question.lower()

    if intent == "top_equipment_by_claims_explanation":
        limit = extract_limit(request.question, default=3)
        return handle_top_equipment_hybrid(request, start, limit=limit)

    if intent == "overdue_work_orders_explanation":
        return handle_overdue_hybrid(request, start)

    if intent == "low_stock_parts_impact":
        return handle_low_stock_hybrid(request, start)

    if "overdue" in question_lower or "en retard" in question_lower:
        return handle_overdue_hybrid(request, start)

    # Prefer simple SQL for pure listing/counting questions
    simple_stock_query = any(x in question_lower for x in [
        "what part", "which part", "list part", "show part",
        "how many part", "count part", "out of stock"
    ])
    
    if simple_stock_query:
        return handle_sql_route(request, start)

    if (
        "low stock" in question_lower
        or "below minimum" in question_lower
        or "stock faible" in question_lower
        or "stock minimum" in question_lower
        or "sous le stock" in question_lower
    ):
        return handle_low_stock_hybrid(request, start)

    return handle_rag_route(request, start, forced_route="RAG")


def handle_rag_route(
    request: AskRequest,
    start: float,
    forced_route: str = "RAG",
) -> AskResponse:
    retrieved = retrieve_context(
        question=request.question,
        top_k_per_type=request.top_k_per_type,
    )

    context = retrieved["context"]
    sources = retrieved["sources"]
    selected_record_types = retrieved["selected_record_types"]
    raw_results = retrieved["raw_results"]
    all_results = retrieved["all_results"]
    retrieval_confidence = retrieved["retrieval_confidence"]

    if not context or retrieval_confidence == "none":
        debug_sources = None
        if request.debug:
            debug_sources = [
                SourceItem(
                    id=item["id"],
                    record_type=item["record_type"],
                    distance=item["distance"],
                    metadata=redact_rows([item["metadata"]])[0],
                )
                for item in all_results
            ]

        # Use unified No Data answer
        answer = build_no_data_answer(request.question)

        return AskResponse(
            answer=answer,
            route=forced_route,
            sql_intent=None,
            sql_result=None,
            sources=[],
            selected_record_types=selected_record_types,
            model=request.model,
            latency_seconds=round(time.time() - start, 3),
            debug_sources=debug_sources,
        )

    q = request.question.lower()

    mention_query = (
        "which records mention" in q
        or "records mention" in q
        or "show records mentioning" in q
        or "find records about" in q
        or ("mention" in q and ("records" in q or "work orders" in q or "claims" in q))
    )

    if mention_query:
        fr = is_french_question(request.question)
        
        answer = build_victoria_structured_answer(
            direct_answer=f"I found {len(raw_results)} records matching your query." if not fr else f"J'ai trouvé {len(raw_results)} enregistrements correspondant à votre recherche.",
            explanation="Extracted from the vector database using semantic search." if not fr else "Extrait de la base de données vectorielle par recherche sémantique.",
            records=raw_results,
            summary="The records found provide direct mentions of the requested topic." if not fr else "Les enregistrements trouvés mentionnent directement le sujet demandé.",
            recommendation="Review the specific records listed above for more details." if not fr else "Consultez les enregistrements spécifiques listés ci-dessus pour plus de détails.",
            fr=fr
        )

        debug_sources = None
        if request.debug:
            debug_sources = [
                SourceItem(
                    id=item["id"],
                    record_type=item["record_type"],
                    distance=item["distance"],
                    metadata=redact_rows([item["metadata"]])[0],
                )
                for item in raw_results
            ]

        return AskResponse(
            answer=answer,
            route=forced_route,
            sql_intent=None,
            sql_result=None,
            sources=sources,
            selected_record_types=selected_record_types,
            model=request.model,
            latency_seconds=round(time.time() - start, 3),
            debug_sources=debug_sources,
        )


    # --- Semantic Synthesis Path (LLM) ---
    is_semantic = any(x in q for x in [
        "action", "corrective", "repair", "fix", "how to", "plan",
        "symptom", "observed", "reported", "notes", "comment", "remark",
        "predictive", "risk", "why", "cause", "reason",
    ])

    if is_semantic and retrieval_confidence != "weak":
        t_p = time.time()
        prompt = build_rag_prompt(
            question=request.question,
            context=context,
            sources=sources,
            retrieval_confidence=retrieval_confidence,
        )
        print(f"[TIMER] build_rag_prompt done: {time.time() - t_p:.3f}s")
        
        answer = ollama_generate(prompt, request.model)
        
        t_res = time.time()
        
        if answer and len(answer) > 20:
            debug_sources = None
            if request.debug:
                debug_sources = _debug_sources_from_results(raw_results)

            resp = AskResponse(
                answer=answer,
                route=forced_route,
                sql_intent=None,
                sql_result=None,
                sources=sources,
                selected_record_types=selected_record_types,
                model=request.model,
                latency_seconds=round(time.time() - start, 3),
                debug_sources=debug_sources,
            )
            print(f"[TIMER] AskResponse created: {time.time() - t_res:.3f}s")
            return resp
        else:
            logger.warning("LLM answer too short or empty, falling back to deterministic.")

    # --- Deterministic Fallback ---
    deterministic_response = try_deterministic_rag_response(
        request=request,
        start=start,
        forced_route=forced_route,
        raw_results=raw_results,
        sources=sources,
        selected_record_types=selected_record_types,
    )

    if deterministic_response is not None:
        return deterministic_response

    # --- Fast extractive fallback ---
    answer = build_deterministic_rag_answer(
        question=request.question,
        raw_results=raw_results,
    )

    if not answer:
        fr = is_french_question(request.question)
        answer = build_victoria_structured_answer(
            direct_answer="I found several relevant maintenance records but no single specific answer." if not fr else "J'ai trouvé plusieurs enregistrements de maintenance pertinents mais pas de réponse spécifique unique.",
            explanation="Summarized from top matches in the vector database." if not fr else "Résumé à partir des meilleurs résultats de la base vectorielle.",
            records=raw_results,
            summary="The retrieved records describe various maintenance activities or issues related to your query." if not fr else "Les enregistrements récupérés décrivent diverses activités de maintenance ou problèmes liés à votre demande.",
            recommendation="Review the technical notes in the records above for specific instructions." if not fr else "Consultez les notes techniques dans les enregistrements ci-dessus pour des instructions spécifiques.",
            fr=fr
        )

    if not answer or not answer.strip():
        answer = build_no_data_answer(request.question)

    debug_sources = None

    if request.debug:
        debug_sources = [
            SourceItem(
                id=item["id"],
                record_type=item["record_type"],
                distance=item["distance"],
                metadata=redact_rows([item["metadata"]])[0],
            )
            for item in raw_results
        ]

    return AskResponse(
        answer=answer,
        route=forced_route,
        sql_intent=None,
        sql_result=None,
        sources=sources,
        selected_record_types=selected_record_types,
        model=request.model,
        latency_seconds=round(time.time() - start, 3),
        debug_sources=debug_sources,
    )


# ============================================================
# API endpoints
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Maintenance SQL + RAG API is running",
        "default_llm_model": DEFAULT_LLM_MODEL,
        "embedding_model": DEFAULT_EMBED_MODEL,
        "collection": COLLECTION_NAME,
    }


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest):
    start = time.time()
    logger.info(f"Incoming ask request: {request.question[:100]}...")

    response = None

    if is_restricted_question(request.question):
        response = AskResponse(
            answer=restricted_response(request.question),
            route="SECURITY_BLOCK",
            sql_intent=None,
            sql_result=None,
            sources=[],
            selected_record_types=[],
            model=request.model,
            latency_seconds=round(time.time() - start, 3),
            debug_sources=None,
        )
    else:
        generic_plan = plan_generic_question(request.question)

        if generic_plan and generic_plan.get("route") == "SQL":
            response = handle_generic_sql_route(
                request=request,
                start=start,
                plan=generic_plan,
            )
        elif generic_plan and generic_plan.get("route") == "HYBRID":
            if generic_plan.get("plan") == "HYBRID_LOW_STOCK":
                response = handle_low_stock_hybrid(request, start)
            elif generic_plan.get("plan") == "HYBRID_EXPLAIN_TOP_CLAIMS":
                limit = generic_plan.get("limit", 5)
                response = handle_top_equipment_hybrid(request, start, limit=limit)
            else:
                response = handle_generic_explain_set_hybrid(
                    request=request,
                    start=start,
                    plan=generic_plan,
                )
        elif generic_plan and generic_plan.get("route") == "RAG":
            response = handle_rag_route(request, start, forced_route="RAG")
        elif generic_plan and generic_plan.get("route") == "CHITCHAT":
            response = handle_chitchat_route(request, start)
        else:
            route = detect_route(request.question)

            if route == "SQL":
                response = handle_sql_route(request, start)
            elif route == "HYBRID":
                response = handle_hybrid_route(request, start)
            else:
                response = handle_rag_route(request, start, forced_route="RAG")

    logger.info(f"Request completed. Route: {response.route}, Intent: {response.sql_intent}, Latency: {response.latency_seconds}s")
    return response

@app.post("/sync-record")
def sync_record(request: SyncRequest):
    """
    Real-time synchronization endpoint for Spring Boot.
    Allows adding or updating a record in the Chroma vector store.
    """
    logger.info(f"Incoming sync request for record: {request.id}")
    try:
        embedding = ollama_embed(request.content)
        collection.upsert(
            ids=[request.id],
            documents=[request.content],
            metadatas=[request.metadata],
            embeddings=[embedding]
        )
        logger.info(f"Successfully synced record: {request.id}")
        return {"status": "success", "id": request.id}
    except Exception as e:
        logger.error(f"Sync failed for {request.id}: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/sync-status")
def sync_status():
    """
    Returns the current state of the vector database.
    """
    try:
        count = collection.count()
        return {
            "status": "ok",
            "collection_name": COLLECTION_NAME,
            "record_count": count,
            "path": CHROMA_PATH
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
