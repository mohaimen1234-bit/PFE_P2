import math
from functools import lru_cache
from typing import Dict, List, Tuple

import requests


# ============================================================
# Bilingual intent router for CMMS AI assistant
# ============================================================
# Public functions used by rag_api.py:
# - classify_question(question)
# - detect_route(question)
# - detect_sql_intent(question)
#
# Design:
# 1. Strong SQL/HYBRID rule overrides run first.
#    This avoids slow embedding-router cold starts for obvious questions.
# 2. Embedding router handles flexible/semantic phrasing.
# 3. Fallback keyword logic handles Ollama embedding failures.
# 4. This router NEVER generates SQL.
# ============================================================


OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"


# ============================================================
# Intent registry for semantic fallback
# ============================================================

INTENTS: Dict[str, Dict] = {
    # -------------------------
    # SQL intents
    # -------------------------
    "top_equipment_by_claims": {
        "route": "SQL",
        "examples": [
            "What are the top equipment with the most claims?",
            "Show the top 3 equipment by claim count.",
            "Which equipment has the most claims?",
            "Which assets have the most complaints?",
            "Top equipment by number of claims.",
            "Quels équipements ont le plus de réclamations ?",
            "Montre les 3 équipements avec le plus de réclamations.",
            "Quels actifs ont le plus de plaintes ?",
            "Top des équipements par nombre de réclamations.",
        ],
    },
    "count_open_work_orders": {
        "route": "SQL",
        "examples": [
            "How many open work orders are there?",
            "Count open work orders.",
            "Number of active work orders.",
            "How many work orders are not closed?",
            "Combien d’ordres de travail sont ouverts ?",
            "Nombre d’ordres de travail actifs.",
            "Combien d’OT ne sont pas fermés ?",
            "Compter les ordres de travail ouverts.",
        ],
    },
    "count_open_claims": {
        "route": "SQL",
        "examples": [
            "How many open claims are there?",
            "Count open claims.",
            "Number of unresolved claims.",
            "How many claims are not closed?",
            "Combien de réclamations sont ouvertes ?",
            "Nombre de réclamations non résolues.",
            "Combien de réclamations ne sont pas fermées ?",
            "Compter les réclamations ouvertes.",
        ],
    },
    "spare_parts_below_min_stock": {
        "route": "SQL",
        "examples": [
            "Which spare parts are below minimum stock?",
            "Show low stock spare parts.",
            "Which parts are under the minimum stock level?",
            "List spare parts with insufficient stock.",
            "Quelles pièces sont sous le stock minimum ?",
            "Afficher les pièces en stock faible.",
            "Quelles pièces de rechange sont en dessous du niveau minimum ?",
            "Lister les pièces avec stock insuffisant.",
        ],
    },
    "overdue_work_orders": {
        "route": "SQL",
        "examples": [
            "Which work orders are overdue?",
            "Show overdue work orders.",
            "List delayed work orders.",
            "Which work orders passed their due date?",
            "Quels ordres de travail sont en retard ?",
            "Afficher les OT en retard.",
            "Lister les ordres de travail dépassés.",
            "Quels ordres de travail ont dépassé la date limite ?",
        ],
    },
    "work_orders_by_status": {
        "route": "SQL",
        "examples": [
            "Show work orders by status.",
            "Count work orders by status.",
            "Break down work orders by status.",
            "Work order status summary.",
            "Afficher les ordres de travail par statut.",
            "Compter les OT par statut.",
            "Résumé des ordres de travail par statut.",
            "Répartition des ordres de travail par statut.",
        ],
    },
    "claims_by_priority": {
        "route": "SQL",
        "examples": [
            "Show claims by priority.",
            "Count claims by priority.",
            "Break down claims by priority.",
            "Claim priority summary.",
            "Afficher les réclamations par priorité.",
            "Compter les réclamations par priorité.",
            "Résumé des réclamations par priorité.",
            "Répartition des réclamations par priorité.",
        ],
    },

    # -------------------------
    # HYBRID intents
    # -------------------------
    "top_equipment_by_claims_explanation": {
        "route": "HYBRID",
        "maps_to_sql_intent": "top_equipment_by_claims",
        "examples": [
            "Why do the top 3 equipment have the most claims?",
            "Explain the top 3 equipment with the most claims.",
            "What are the causes behind the top equipment by claim count?",
            "Why are the most claimed equipment problematic?",
            "Explain why these equipment have many claims.",
            "Pourquoi les 3 équipements principaux ont-ils le plus de réclamations ?",
            "Explique les équipements avec le plus de réclamations.",
            "Quelles sont les causes derrière les équipements les plus réclamés ?",
            "Pourquoi ces équipements ont-ils beaucoup de réclamations ?",
        ],
    },
    "overdue_work_orders_explanation": {
        "route": "HYBRID",
        "maps_to_sql_intent": "overdue_work_orders",
        "examples": [
            "Why are overdue work orders delayed?",
            "Why are the overdue work orders late?",
            "Explain why work orders are overdue.",
            "What are the reasons behind delayed work orders?",
            "Why are delayed work orders not completed?",
            "What causes overdue maintenance work orders?",
            "Explain the delay reasons for overdue work orders.",
            "Why are work orders delayed?",
            "Why are overdue work orders blocked?",
            "Pourquoi les ordres de travail en retard sont-ils retardés ?",
            "Pourquoi les OT en retard sont-ils bloqués ?",
            "Explique pourquoi les ordres de travail sont en retard.",
            "Quelles sont les raisons du retard des ordres de travail ?",
            "Pourquoi les interventions de maintenance sont-elles en retard ?",
        ],
    },
    "low_stock_parts_impact": {
        "route": "HYBRID",
        "maps_to_sql_intent": "spare_parts_below_min_stock",
        "examples": [
            "Why are spare parts below minimum stock affecting maintenance?",
            "How are low stock spare parts impacting maintenance?",
            "Explain the maintenance impact of low stock spare parts.",
            "Are spare parts below minimum stock causing delays?",
            "Why do low stock parts affect work orders?",
            "What maintenance problems are caused by low stock parts?",
            "Why are spare parts affecting maintenance?",
            "How do spare part shortages impact work orders?",
            "Pourquoi les pièces sous le stock minimum affectent-elles la maintenance ?",
            "Comment le stock faible des pièces impacte-t-il la maintenance ?",
            "Explique l’impact des pièces en stock faible sur les interventions.",
            "Les pièces sous le stock minimum causent-elles des retards ?",
            "Pourquoi le manque de pièces affecte les ordres de travail ?",
        ],
    },

    # -------------------------
    # RAG semantic fallback
    # -------------------------
    "rag_semantic": {
        "route": "RAG",
        "examples": [
            "Why was this work order cancelled?",
            "What happened with this equipment?",
            "Explain the issue reported in this claim.",
            "What was done to fix the task?",
            "Why is this task blocked?",
            "Summarize the maintenance history for this asset.",
            "Pourquoi cet ordre de travail a-t-il été annulé ?",
            "Que s’est-il passé avec cet équipement ?",
            "Explique le problème signalé dans cette réclamation.",
            "Pourquoi cette tâche est-elle bloquée ?",
            "Résume l’historique de maintenance de cet actif.",
        ],
    },
    # -------------------------
    # NEW Analytics Intents
    # -------------------------
    "meter_readings_analysis": {
        "route": "SQL",
        "examples": [
            "Show meter history for equipment 101.",
            "What are the recent meter readings for asset 50?",
            "Meter readings trend for machine X.",
            "Historique des relevés de compteur pour l'équipement 101.",
            "Quels sont les derniers relevés pour l'actif 50?",
        ],
    },
    "maintenance_plans_analysis": {
        "route": "SQL",
        "examples": [
            "Show upcoming maintenance plans.",
            "What are the active maintenance plans?",
            "List scheduled maintenance for next month.",
            "Afficher les plans de maintenance à venir.",
            "Quels sont les plans de maintenance actifs?",
        ],
    },
    "inventory_valuation": {
        "route": "SQL",
        "examples": [
            "What is the total value of our inventory?",
            "Show inventory value by category.",
            "Total stock value per supplier.",
            "Quelle est la valeur totale de notre inventaire?",
            "Afficher la valeur de l'inventaire par catégorie.",
        ],
    },
    "department_comparison": {
        "route": "SQL",
        "examples": [
            "Compare Radiology vs Laboratory maintenance costs.",
            "Comparison of work orders between ICU and Emergency.",
            "Which department has higher costs: Cardiology or ICU?",
            "Comparer les coûts de maintenance de la Radiologie et du Laboratoire.",
            "Comparaison des ordres de travail entre les soins intensifs et les urgences.",
        ],
    },
}


SUPPORTED_SQL_INTENTS = {
    "top_equipment_by_claims",
    "count_open_work_orders",
    "count_open_claims",
    "spare_parts_below_min_stock",
    "overdue_work_orders",
    "work_orders_by_status",
    "claims_by_priority",
    "meter_readings_analysis",
    "maintenance_plans_analysis",
    "inventory_valuation",
    "department_comparison",
}


SUPPORTED_HYBRID_INTENTS = {
    "top_equipment_by_claims_explanation",
    "overdue_work_orders_explanation",
    "low_stock_parts_impact",
}


ROUTE_CONFIDENCE_THRESHOLD = 0.58


# ============================================================
# Text helpers
# ============================================================

def _has_any(q: str, words: List[str]) -> bool:
    return any(word in q for word in words)


def _normalize(question: str) -> str:
    return question.lower().strip()


# ============================================================
# Strong rule overrides
# ============================================================

def _strong_route_override(question: str) -> Dict:
    """
    Fast deterministic routing for obvious SQL/HYBRID questions.

    This function intentionally runs BEFORE the embedding router.
    It prevents slow first-request embedding initialization for simple SQL questions.
    """

    q = _normalize(question)

    explanation_words = [
        "why",
        "explain",
        "reason",
        "reasons",
        "cause",
        "causes",
        "impact",
        "affect",
        "affecting",
        "how",
        "pourquoi",
        "explique",
        "raisons",
        "causes",
        "impacte",
        "impact",
        "affectent",
        "comment",
    ]

    equipment_words = [
        "equipment",
        "asset",
        "assets",
        "machine",
        "machines",
        "équipement",
        "equipement",
        "équipements",
        "equipements",
        "actif",
        "actifs",
    ]

    claim_words = [
        "claim",
        "claims",
        "complaint",
        "complaints",
        "réclamation",
        "reclamation",
        "réclamations",
        "reclamations",
        "plainte",
        "plaintes",
    ]

    top_words = [
        "top",
        "most",
        "highest",
        "plus",
        "principaux",
        "principal",
        "les plus",
        "le plus",
    ]

    work_order_words = [
        "work order",
        "work orders",
        "wo",
        "ordre de travail",
        "ordres de travail",
        "ot",
        "intervention",
        "interventions",
    ]

    overdue_words = [
        "overdue",
        "delayed",
        "delay",
        "late",
        "blocked",
        "en retard",
        "retard",
        "bloqué",
        "bloque",
        "bloqués",
        "bloques",
    ]

    spare_part_words = [
        "spare",
        "spare part",
        "spare parts",
        "part",
        "parts",
        "pièce",
        "piece",
        "pièces",
        "pieces",
    ]

    low_stock_words = [
        "low stock",
        "below minimum",
        "minimum stock",
        "stock minimum",
        "stock faible",
        "sous le stock",
        "shortage",
        "shortages",
        "manque",
        "rupture",
    ]

    maintenance_words = [
        "maintenance",
        "work order",
        "work orders",
        "wo",
        "repair",
        "repairs",
        "intervention",
        "interventions",
        "ordre de travail",
        "ordres de travail",
        "ot",
    ]

    status_words = [
        "status",
        "statut",
        "by status",
        "par statut",
    ]

    priority_words = [
        "priority",
        "priorité",
        "priorite",
        "by priority",
        "par priorité",
        "par priorite",
    ]

    count_words = [
        "how many",
        "count",
        "number of",
        "combien",
        "nombre de",
    ]

    open_words = [
        "open",
        "opened",
        "active",
        "not closed",
        "ouverts",
        "ouvertes",
        "actifs",
        "non fermés",
        "non ferme",
    ]

    # -------------------------
    # HYBRID overrides first
    # -------------------------

    if (
        _has_any(q, explanation_words)
        and _has_any(q, top_words)
        and _has_any(q, equipment_words)
        and _has_any(q, claim_words)
    ):
        return {
            "intent": "top_equipment_by_claims_explanation",
            "route": "HYBRID",
            "confidence": 1.0,
            "matched_example": "strong_hybrid_top_equipment",
            "method": "strong_override",
        }

    if (
        _has_any(q, explanation_words)
        and _has_any(q, overdue_words)
        and _has_any(q, work_order_words)
    ):
        return {
            "intent": "overdue_work_orders_explanation",
            "route": "HYBRID",
            "confidence": 1.0,
            "matched_example": "strong_hybrid_overdue",
            "method": "strong_override",
        }

    if (
        _has_any(q, explanation_words)
        and _has_any(q, spare_part_words)
        and _has_any(q, low_stock_words)
        and (
            _has_any(q, maintenance_words)
            or "affect" in q
            or "impact" in q
            or "delay" in q
            or "retard" in q
        )
    ):
        return {
            "intent": "low_stock_parts_impact",
            "route": "HYBRID",
            "confidence": 1.0,
            "matched_example": "strong_hybrid_low_stock_impact",
            "method": "strong_override",
        }

    # -------------------------
    # SQL overrides
    # -------------------------

    # Low-stock spare parts list
    if (
        _has_any(q, spare_part_words)
        and _has_any(q, low_stock_words)
    ):
        return {
            "intent": "spare_parts_below_min_stock",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_low_stock_parts",
            "method": "strong_override",
        }

    # Work orders by status
    if (
        _has_any(q, work_order_words)
        and _has_any(q, status_words)
    ):
        return {
            "intent": "work_orders_by_status",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_work_orders_by_status",
            "method": "strong_override",
        }

    # Claims by priority
    if (
        _has_any(q, claim_words)
        and _has_any(q, priority_words)
    ):
        return {
            "intent": "claims_by_priority",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_claims_by_priority",
            "method": "strong_override",
        }

    # Count open work orders
    if (
        _has_any(q, count_words)
        and _has_any(q, open_words)
        and _has_any(q, work_order_words)
    ):
        return {
            "intent": "count_open_work_orders",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_count_open_work_orders",
            "method": "strong_override",
        }

    # Count open claims
    if (
        _has_any(q, count_words)
        and _has_any(q, open_words)
        and _has_any(q, claim_words)
    ):
        return {
            "intent": "count_open_claims",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_count_open_claims",
            "method": "strong_override",
        }

    # Top equipment by claims list, not explanation
    if (
        _has_any(q, top_words)
        and _has_any(q, equipment_words)
        and _has_any(q, claim_words)
    ):
        return {
            "intent": "top_equipment_by_claims",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_top_equipment_by_claims",
            "method": "strong_override",
        }

    # Overdue work orders list, not explanation
    if (
        _has_any(q, overdue_words)
        and _has_any(q, work_order_words)
    ):
        return {
            "intent": "overdue_work_orders",
            "route": "SQL",
            "confidence": 1.0,
            "matched_example": "strong_sql_overdue_work_orders",
            "method": "strong_override",
        }

    return {}


# ============================================================
# Embedding + similarity
# ============================================================

def _ollama_embed(text: str) -> List[float]:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBED_MODEL,
            "prompt": text,
            "keep_alive": "30m",
        },
        timeout=300,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y

    if norm_a <= 0 or norm_b <= 0:
        return 0.0

    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


@lru_cache(maxsize=512)
def _embed_cached(text: str) -> Tuple[float, ...]:
    return tuple(_ollama_embed(text))


def _get_text_embedding(text: str) -> List[float]:
    return list(_embed_cached(text.strip()))


@lru_cache(maxsize=1)
def _example_index_cached() -> Tuple[Tuple[str, str, str, Tuple[float, ...]], ...]:
    rows = []

    for intent, config in INTENTS.items():
        for example in config["examples"]:
            try:
                embedding = tuple(_get_text_embedding(example))
                rows.append((intent, config["route"], example, embedding))
            except Exception:
                pass

    return tuple(rows)


def _classify_with_embeddings(question: str) -> Dict:
    question_embedding = _get_text_embedding(question)

    best_intent = "rag_semantic"
    best_route = "RAG"
    best_score = -1.0
    best_example = ""

    for intent, route, example, example_embedding_tuple in _example_index_cached():
        score = _cosine_similarity(question_embedding, list(example_embedding_tuple))

        if score > best_score:
            best_score = score
            best_intent = intent
            best_route = route
            best_example = example

    return {
        "intent": best_intent,
        "route": best_route,
        "confidence": best_score,
        "matched_example": best_example,
    }


# ============================================================
# Fallback keyword logic
# ============================================================

def _fallback_detect_route(question: str) -> str:
    q = _normalize(question)

    override = _strong_route_override(question)
    if override:
        return override["route"]

    sql_words = [
        "how many",
        "count",
        "number of",
        "top",
        "most",
        "least",
        "average",
        "total",
        "by status",
        "by priority",
        "below minimum",
        "low stock",
        "overdue",
        "combien",
        "nombre de",
        "le plus",
        "les plus",
        "par statut",
        "par priorité",
        "par priorite",
        "stock minimum",
        "stock faible",
        "en retard",
    ]

    if any(word in q for word in sql_words):
        return "SQL"

    return "RAG"


def _fallback_detect_sql_intent(question: str) -> str:
    override = _strong_route_override(question)
    if override and override.get("route") in {"SQL", "HYBRID"}:
        intent = override.get("intent")

        if intent in SUPPORTED_HYBRID_INTENTS:
            mapped = INTENTS[intent].get("maps_to_sql_intent")
            if mapped in SUPPORTED_SQL_INTENTS:
                return mapped

        if intent in SUPPORTED_SQL_INTENTS:
            return intent

    q = _normalize(question)

    equipment_words = [
        "equipment",
        "asset",
        "équipement",
        "equipement",
        "équipements",
        "equipements",
        "actif",
        "actifs",
    ]
    claim_words = [
        "claim",
        "claims",
        "réclamation",
        "reclamation",
        "réclamations",
        "reclamations",
        "plainte",
        "plaintes",
    ]
    work_order_words = [
        "work order",
        "work orders",
        "wo",
        "ordre de travail",
        "ordres de travail",
        "ot",
    ]
    part_words = [
        "spare",
        "part",
        "parts",
        "stock",
        "pièce",
        "piece",
        "pièces",
        "pieces",
    ]

    if (
        ("top" in q or "most" in q or "plus" in q)
        and any(w in q for w in equipment_words)
        and any(w in q for w in claim_words)
    ):
        return "top_equipment_by_claims"

    if (
        ("how many" in q or "count" in q or "number of" in q or "combien" in q or "nombre de" in q)
        and any(w in q for w in work_order_words)
    ):
        return "count_open_work_orders"

    if (
        ("how many" in q or "count" in q or "number of" in q or "combien" in q or "nombre de" in q)
        and any(w in q for w in claim_words)
    ):
        return "count_open_claims"

    if any(w in q for w in part_words) and (
        "below minimum" in q
        or "low stock" in q
        or "minimum stock" in q
        or "stock minimum" in q
        or "stock faible" in q
        or "sous le stock" in q
    ):
        return "spare_parts_below_min_stock"

    if ("overdue" in q or "en retard" in q) and any(w in q for w in work_order_words):
        return "overdue_work_orders"

    if any(w in q for w in work_order_words) and ("status" in q or "statut" in q):
        return "work_orders_by_status"

    if any(w in q for w in claim_words) and ("priority" in q or "priorité" in q or "priorite" in q):
        return "claims_by_priority"

    return "unknown_sql"


# ============================================================
# Public API used by rag_api.py
# ============================================================

@lru_cache(maxsize=512)
def classify_question(question: str) -> Dict:
    question = question.strip()

    if not question:
        return {
            "intent": "rag_semantic",
            "route": "RAG",
            "confidence": 0.0,
            "matched_example": "",
            "method": "empty",
        }

    # Fast deterministic path first.
    override = _strong_route_override(question)
    if override:
        return override

    # Slower semantic path only when no obvious rule matches.
    try:
        result = _classify_with_embeddings(question)
        result["method"] = "embedding"

        if result["route"] == "HYBRID" and result["intent"] not in SUPPORTED_HYBRID_INTENTS:
            result["route"] = "RAG"
            result["intent"] = "rag_semantic"

        if result["confidence"] < ROUTE_CONFIDENCE_THRESHOLD:
            fallback_route = _fallback_detect_route(question)

            if fallback_route == "SQL":
                fallback_intent = _fallback_detect_sql_intent(question)
            elif fallback_route == "HYBRID":
                fallback_override = _strong_route_override(question)
                fallback_intent = fallback_override.get("intent", "rag_semantic")
            else:
                fallback_intent = "rag_semantic"

            return {
                "intent": fallback_intent,
                "route": fallback_route,
                "confidence": result["confidence"],
                "matched_example": result["matched_example"],
                "method": "fallback_low_confidence",
            }

        return result

    except Exception:
        fallback_route = _fallback_detect_route(question)

        if fallback_route == "SQL":
            fallback_intent = _fallback_detect_sql_intent(question)
        elif fallback_route == "HYBRID":
            fallback_override = _strong_route_override(question)
            fallback_intent = fallback_override.get("intent", "rag_semantic")
        else:
            fallback_intent = "rag_semantic"

        return {
            "intent": fallback_intent,
            "route": fallback_route,
            "confidence": 0.0,
            "matched_example": "",
            "method": "fallback_error",
        }


def detect_route(question: str):
    result = classify_question(question)

    route = result["route"]

    if route == "SQL":
        intent = detect_sql_intent(question)
        if intent == "unknown_sql":
            return "RAG"

    return route


def detect_sql_intent(question: str):
    result = classify_question(question)
    intent = result["intent"]

    if intent in SUPPORTED_HYBRID_INTENTS:
        mapped = INTENTS[intent].get("maps_to_sql_intent")
        if mapped in SUPPORTED_SQL_INTENTS:
            return mapped

    if intent in SUPPORTED_SQL_INTENTS:
        return intent

    fallback_intent = _fallback_detect_sql_intent(question)

    if fallback_intent in SUPPORTED_SQL_INTENTS:
        return fallback_intent

    return "unknown_sql"