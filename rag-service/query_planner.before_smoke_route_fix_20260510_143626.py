import re
from typing import Any, Dict, Optional


def normalize_question(question: str) -> str:
    return (question or "").lower().strip()


def has_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def extract_user_id(question: str) -> Optional[int]:
    q = question.lower()
    patterns = [
        r"(technician|technicien|user|utilisateur)\s*(id)?\s*#?\s*(\d+)",
        r"\buser[_\s-]?id\s*#?\s*(\d+)\b",
        r"\btechnician[_\s-]?id\s*#?\s*(\d+)\b",
        r"\btechnicien[_\s-]?id\s*#?\s*(\d+)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, q)
        if match:
            return int(match.groups()[-1])
    return None


def extract_record_lookup(question: str) -> Optional[Dict[str, Any]]:
    """
    Exact record lookup. Never returns lookup unless it extracted record_id or sku.
    """
    q = question.lower().strip()

    sku_match = re.search(r"\bsku[-_\s]?(\d+)\b", q, re.IGNORECASE)
    if sku_match:
        sku = f"SKU-{sku_match.group(1)}"
        return {
            "route": "SQL",
            "plan": "RECORD_LOOKUP",
            "sql_intent": "lookup_spare_part_by_sku",
            "selected_record_types": ["spare_parts"],
            "sku": sku,
        }

    lookup_patterns = [
        {
            "pattern": r"\b(?:wo|w\.o\.|work\s*order|work\s*orders|work_orders|ordre\s*de\s*travail|ordres\s*de\s*travail|ot)\s*[-_#:]?\s*(\d+)\b",
            "intent": "lookup_work_order_by_id",
            "record_type": "work_orders",
        },
        {
            "pattern": r"\b(?:claim|claims|claim_id|claims_id|reclamation|reclamations)\s*[-_#:]?\s*(\d+)\b",
            "intent": "lookup_claim_by_id",
            "record_type": "claims",
        },
        {
            "pattern": r"\b(?:equipment|equipments|equipment_id|asset|asset_id|machine|equipement|equipements)\s*[-_#:]?\s*(\d+)\b",
            "intent": "lookup_equipment_by_id",
            "record_type": "equipment",
        },
        {
            "pattern": r"\b(?:task|tasks|task_id|tasks_id|tache|taches)\s*[-_#:]?\s*(\d+)\b",
            "intent": "lookup_task_by_id",
            "record_type": "tasks",
        },
        {
            "pattern": r"\b(?:spare\s*part|spare\s*parts|spare_parts|part|part_id|piece|pieces)\s*[-_#:]?\s*(\d+)\b",
            "intent": "lookup_spare_part_by_id",
            "record_type": "spare_parts",
        },
    ]

    for item in lookup_patterns:
        match = re.search(item["pattern"], q)
        if match:
            return {
                "route": "SQL",
                "plan": "RECORD_LOOKUP",
                "sql_intent": item["intent"],
                "selected_record_types": [item["record_type"]],
                "record_id": int(match.group(1)),
            }
    return None


def infer_range_key(q: str) -> Optional[str]:
    if any(x in q for x in ["last 30", "30 days", "last thirty", "previous 30", "past 30"]):
        return "last_30_days"
    if any(x in q for x in ["today", "this day", "aujourd"]):
        return "today"
    if any(x in q for x in ["this week", "current week", "week to date", "cette semaine"]):
        return "this_week"
    if any(x in q for x in ["last week", "previous week", "past week", "semaine derniere"]):
        return "last_week"
    if any(x in q for x in ["this month", "current month", "month to date", "ce mois"]):
        return "this_month"
    if any(x in q for x in ["last month", "previous month", "past month", "mois dernier"]):
        return "last_month"
    if any(x in q for x in ["this year", "current year", "year to date", "ytd", "cette annee"]):
        return "this_year"
    return None



def plan_rag_question(q: str) -> Optional[Dict[str, Any]]:
    """
    Semantic RAG-only routing.

    Use this for text/notes/symptom/mention questions where the answer lives in
    descriptions, cancellation notes, completion notes, validation notes,
    blocked reasons, failure reasons, or predictive notes.

    Do NOT use this for:
    - exact IDs/SKUs -> SQL RECORD_LOOKUP
    - counts/lists/top/trends/aggregates -> SQL
    - broad fleet-wide explanation -> HYBRID
    """

    analytics_words = [
        "count", "how many", "number of", "total number", "total count",
        "top", "most", "highest", "largest", "average", "avg", "trend",
        "monthly", "by month", "by status", "per status", "distribution",
        "breakdown", "break down", "cost by", "group by", "rank", "ranking",
        "combien", "nombre de", "moyenne", "par mois", "répartition", "repartition",
    ]

    broad_hybrid_phrases = [
        "why equipments are failing",
        "why equipment are failing",
        "why equipment is failing",
        "why machines are failing",
        "why machines are having problems",
        "common maintenance problems",
        "most common causes of critical work orders",
        "why are critical work orders",
        "why are overdue work orders delayed",
        "why are spare parts below minimum stock affecting maintenance",
    ]

    if has_any(q, broad_hybrid_phrases):
        return None

    if has_any(q, analytics_words):
        if not has_any(q, ["mention", "mentions", "mentioned", "records mention", "which records", "find records", "search records"]):
            return None

    cmms_words = [
        "work order", "work orders", "wo", "claim", "claims", "task", "tasks",
        "equipment", "equipments", "machine", "machines", "asset", "assets",
        "spare part", "spare parts", "part", "parts", "maintenance",
        "repair", "issue", "issues", "problem", "problems", "failure", "failures",
        "pump", "seal", "leak", "leakage", "sensor", "drift", "oxygen",
        "compressor", "overheating", "chiller", "pressure", "switch",
        "surgical light", "handle", "alarm", "warning", "calibration",
        "predictive", "stock", "shortage", "blocked", "cancelled", "canceled",
        "ordre de travail", "réclamation", "reclamation", "tâche", "tache",
        "équipement", "equipement", "pièce", "piece", "panne", "fuite",
        "capteur", "alarme", "réparation", "reparation",
    ]

    cancellation_words = [
        "cancelled", "canceled", "cancel", "cancellation", "cancelled reason",
        "cancellation reason", "closed without completion", "not completed",
        "stopped", "aborted", "abandoned", "annulé", "annule", "annulation",
        "abandonné", "abandonne", "arrêté", "arrete",
    ]

    what_happened_words = [
        "what happened", "what happened with", "what happened to", "history",
        "story", "summary", "summarize", "timeline", "case details",
        "give me the details", "what is the story", "explain what happened",
        "résumé", "resume", "historique", "détails", "details",
        "qu'est-ce qui s'est passé", "que s'est-il passé",
    ]

    symptom_words = [
        "symptom", "symptoms", "reported", "observed", "noticed", "staff reports",
        "staff reported", "issue reported", "complaint says", "drift", "leak",
        "leakage", "alarm", "warning", "fault", "failure", "not lock",
        "does not lock", "pressure alarm", "sensor drift", "temperature excursion",
        "symptôme", "symptome", "symptômes", "symptomes", "signalé", "signale",
        "observé", "observe", "alarme", "fuite", "panne",
    ]

    notes_words = [
        "notes", "note", "cancellation notes", "completion notes", "validation notes",
        "blocked reason", "failure reason", "predictive notes", "predictive note",
        "comment", "comments", "remarks", "observations", "what do the notes say",
        "what does the note say", "show notes", "notes d'annulation",
        "raison de blocage", "raison d'échec", "raison d'echec", "commentaire",
    ]

    mention_words = [
        "mention", "mentions", "mentioned", "which records mention",
        "records mention", "find records", "search records", "show records",
        "records about", "documents about", "contains", "where appears",
        "related to", "about", "any records about", "mentionne", "mentionnent",
        "contient", "chercher", "lié à", "lie a", "documents sur",
    ]

    action_words = [
        "corrective action", "action required", "required action", "scope",
        "scope of work", "required checks", "repair plan", "planned action",
        "task action", "what was planned", "what repair was planned",
        "what was the task supposed to do", "maintenance action",
        "action corrective", "contrôles requis", "controles requis",
        "intervention prévue", "intervention prevue",
    ]

    predictive_words = [
        "predictive outcome", "prediction", "predictive notes", "predictive note",
        "failure risk", "part shortage", "sla risk", "risk note", "predicted",
        "marked failure risk", "why is this sla risk", "explain the predictive",
        "prévision", "prevision", "risque", "pénurie", "penurie", "rupture",
    ]

    if has_any(q, cancellation_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_RECORD_EXPLANATION",
            "selected_record_types": ["work_orders", "claims", "tasks", "equipment"],
            "rag_focus": "cancellation",
        }

    if has_any(q, what_happened_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_RECORD_EXPLANATION",
            "selected_record_types": ["work_orders", "claims", "tasks", "equipment"],
            "rag_focus": "what_happened",
        }

    if has_any(q, symptom_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_SYMPTOM_SEARCH",
            "selected_record_types": ["claims", "work_orders", "tasks", "equipment"],
            "rag_focus": "symptoms",
        }

    if has_any(q, notes_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_NOTES_SEARCH",
            "selected_record_types": ["work_orders", "tasks", "claims"],
            "rag_focus": "notes",
        }

    if has_any(q, mention_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_MENTION_SEARCH",
            "selected_record_types": ["work_orders", "claims", "tasks", "equipment", "spare_parts"],
            "rag_focus": "mentions",
        }

    if has_any(q, action_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_ACTION_SEARCH",
            "selected_record_types": ["work_orders", "tasks", "claims"],
            "rag_focus": "actions",
        }

    if has_any(q, predictive_words) and has_any(q, cmms_words):
        return {
            "route": "RAG",
            "plan": "RAG_PREDICTIVE_NOTE_SEARCH",
            "selected_record_types": ["work_orders", "tasks", "equipment"],
            "rag_focus": "predictive_notes",
        }

    return None

def plan_generic_question(question: str) -> Optional[Dict[str, Any]]:
    q = normalize_question(question)
    if not q:
        return None

    record_lookup = extract_record_lookup(question)
    if record_lookup:
        lookup_intent = record_lookup.get("sql_intent", "")
        if lookup_intent == "lookup_spare_part_by_sku":
            if record_lookup.get("sku"):
                return record_lookup
        else:
            if record_lookup.get("record_id") is not None:
                return record_lookup

    range_key = infer_range_key(q)

    count_words = ["count", "how many", "number of", "total number", "total count", "amount of", "qty", "quantity", "combien", "nombre de"]
    list_words = ["list", "show", "display", "give me", "which", "what are", "find", "get", "view", "see", "affiche", "montre", "liste", "quelles", "quels"]
    top_words = ["top", "most", "highest", "largest", "maximum", "max", "biggest", "leading", "worst", "best", "rank", "ranking", "plus", "le plus"]
    trend_words = ["trend", "monthly", "by month", "over time", "timeline", "evolution", "history", "historical", "mensuel", "mensuelle", "par mois"]
    cost_words = ["cost", "costs", "maintenance cost", "expensive", "most expensive", "highest cost", "total cost", "average cost", "price", "spend", "spending", "expense", "budget", "financial", "money", "value", "cout", "cher", "depense", "budget", "valeur"]
    department_words = ["department", "departments", "service", "services", "unit", "units", "ward", "wards", "division", "section", "area", "departement", "departements", "unite"]
    equipment_words = ["equipment", "equipments", "machine", "machines", "asset", "assets", "device", "devices", "system", "systems", "biomedical equipment", "medical device", "equipement", "equipements", "actif", "actifs", "dispositif"]
    work_order_words = ["work order", "work orders", "wo", "wos", "maintenance order", "maintenance orders", "job", "jobs", "ticket", "tickets", "intervention", "interventions", "repair order", "service order", "ordre de travail", "ordres de travail", "bon de travail", "ot"]
    claim_words = ["claim", "claims", "complaint", "complaints", "request", "requests", "reported issue", "incident", "incidents", "reclamation", "reclamations", "plainte", "plaintes", "demande", "demandes"]
    task_words = ["task", "tasks", "subtask", "subtasks", "activity", "activities", "completed tasks", "blocked tasks", "job step", "action item", "tache", "taches", "activite"]
    spare_part_words = ["spare part", "spare parts", "part", "parts", "inventory item", "stock item", "component", "components", "consumable", "consumables", "replacement part", "piece", "pieces", "composant", "composants", "rechange"]
    supplier_words = ["supplier", "suppliers", "vendor", "vendors", "provider", "providers", "manufacturer", "source", "fournisseur", "fournisseurs", "vendeur"]
    technician_words = ["technician", "technicians", "tech", "techs", "engineer", "engineers", "user", "users", "assigned user", "assignee", "owner", "staff", "worker", "operator", "maintenance staff", "technicien", "techniciens", "utilisateur", "utilisateurs", "agent", "agents"]
    category_words = ["category", "categories", "equipment category", "class", "classes", "classification", "type", "types", "family", "families", "categorie", "categories", "famille"]
    average_words = ["average", "avg", "mean", "median", "typical", "usual", "on average", "moyenne", "temps moyen"]
    repair_time_words = ["repair time", "resolution time", "completion time", "time to repair", "turnaround", "duration", "repair duration", "maintenance duration", "mttr", "mean time to repair", "temps de reparation", "temps de resolution", "duree"]
    critical_words = ["critical", "high priority", "high-priority", "urgent", "priority", "severe", "severity", "important", "emergency", "p1", "p0", "critique", "critiques", "priorite", "haute priorite", "grave"]
    open_words = ["open", "opened", "active", "not closed", "not completed", "pending", "ongoing", "unresolved", "remaining", "still open", "ouvert", "ouverts", "actifs", "en cours", "non ferme", "non termine"]
    overdue_words = ["overdue", "delayed", "delay", "late", "past due", "behind schedule", "missed due date", "not on time", "stuck", "slipped", "sla breach", "sla risk", "en retard", "retard", "depasse", "hors delai"]
    blocked_words = ["blocked", "blocking", "stuck", "on hold", "waiting", "cannot proceed", "blocked reason", "dependency", "bloque", "bloques", "en attente"]
    low_stock_words = ["low stock", "below minimum stock", "under minimum stock", "minimum stock", "stock minimum", "below threshold", "under threshold", "reorder level", "below reorder level", "low inventory", "insufficient stock", "stock shortage", "shortage", "inventory shortage", "need reorder", "needs reorder", "reorder", "re-order", "should we buy", "need to buy", "need purchase", "buy parts", "stock faible", "sous le stock", "sous le stock minimum", "sous le seuil", "seuil", "reapprovisionner", "rupture", "manque de stock"]
    out_of_stock_words = ["out of stock", "zero stock", "no stock", "stockout", "stock-out", "empty stock", "quantity zero", "rupture de stock", "stock epuise"]
    expiry_words = ["expiry", "expire", "expires", "expired", "near expiry", "expiration", "expiry date", "expire soon", "near expiration", "peremption", "date d'expiration", "expire bientot"]
    reorder_words = ["reorder", "re-order", "buy", "purchase", "procure", "should we order", "need order", "need to order", "restock", "replenish", "reapprovisionner", "acheter", "commander", "reassort"]
    completed_words = ["completed", "finished", "done", "closed", "validated", "resolved", "complete", "termine", "terminees", "complete", "valide", "resolu"]
    assigned_words = ["assigned", "scheduled", "allocated", "assigned to", "planned", "assigne", "planifie", "programme"]
    cancelled_words = ["cancelled", "canceled", "cancel", "cancellation", "cancelled work", "annule", "annulation"]
    resolved_words = ["resolved", "closed", "fixed", "settled", "done", "resolu", "ferme"]
    in_progress_words = ["in progress", "in_progress", "progress", "ongoing", "being worked", "currently working", "active work", "en cours"]
    status_distribution_words = ["by status", "per status", "status distribution", "status summary", "break down by status", "breakdown by status", "work order status", "wo status", "statuses", "statut", "par statut", "repartition par statut"]
    top_claim_words = ["top claimed", "most claims", "highest claims", "claim count", "claims count", "most complaints", "highest complaints", "most reported", "most problematic equipment by claims", "equipment with most claims", "equipment has the most claims", "equipment have the most claims", "machines generate the most claims", "plus de reclamations"]
    explanation_words = ["why", "cause", "causes", "reason", "reasons", "explain", "because", "problem", "problems", "issue", "issues", "failing", "failure", "failures", "common", "frequent", "most common", "main", "root cause", "root causes", "pattern", "patterns", "what happened", "what is happening", "pourquoi", "raison", "raisons", "probleme", "panne", "pannes", "expliquer"]
    maintenance_words = ["maintenance", "repair", "repairs", "failure", "failures", "problem", "problems", "issue", "issues", "operation", "operations", "risk", "risks", "reparation", "panne", "pannes"]
    vague_broad_words = ["maintenance bad", "what is happening", "biggest risks", "operations improving", "are we improving", "overall risk", "general situation", "summary of risks", "health of maintenance"]

    # Protect existing specific tested routes.
    if has_any(q, top_claim_words) and has_any(q, equipment_words):
        return None
    if has_any(q, low_stock_words) and "why" in q:
        return None
    if has_any(q, overdue_words) and has_any(q, work_order_words) and has_any(q, explanation_words):
        return None

    # Date-filtered analytics.
    if range_key:
        if has_any(q, count_words) and has_any(q, work_order_words):
            return {"route": "SQL", "plan": "SQL_DATE_FILTER", "sql_intent": "generic_count_work_orders_date_range", "selected_record_types": ["work_orders"], "range_key": range_key}
        if has_any(q, count_words) and has_any(q, claim_words):
            return {"route": "SQL", "plan": "SQL_DATE_FILTER", "sql_intent": "generic_count_claims_date_range", "selected_record_types": ["claims"], "range_key": range_key}
        if has_any(q, list_words) and has_any(q, work_order_words) and has_any(q, completed_words):
            return {"route": "SQL", "plan": "SQL_DATE_FILTER", "sql_intent": "generic_completed_work_orders_date_range", "selected_record_types": ["work_orders"], "range_key": range_key, "limit": 30}
        if has_any(q, list_words) and has_any(q, work_order_words):
            return {"route": "SQL", "plan": "SQL_DATE_FILTER", "sql_intent": "generic_list_work_orders_date_range", "selected_record_types": ["work_orders"], "range_key": range_key, "limit": 30}
        if has_any(q, cost_words):
            return {"route": "SQL", "plan": "SQL_DATE_FILTER", "sql_intent": "generic_maintenance_cost_date_range", "selected_record_types": ["work_orders"], "range_key": range_key}

    # SQL_COUNT.
    if has_any(q, count_words):
        if has_any(q, department_words):
            return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_departments", "selected_record_types": ["equipment"]}
        if has_any(q, equipment_words):
            return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_equipment", "selected_record_types": ["equipment"]}
        if has_any(q, work_order_words):
            if has_any(q, open_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_open_work_orders", "selected_record_types": ["work_orders"]}
            if has_any(q, critical_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_priority_work_orders", "selected_record_types": ["work_orders"], "priority": "CRITICAL"}
            if has_any(q, in_progress_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_status_work_orders", "selected_record_types": ["work_orders"], "status": "IN_PROGRESS"}
            if has_any(q, assigned_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_status_work_orders", "selected_record_types": ["work_orders"], "status": "ASSIGNED"}
            if has_any(q, cancelled_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_status_work_orders", "selected_record_types": ["work_orders"], "status": "CANCELLED"}
            return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_work_orders", "selected_record_types": ["work_orders"]}
        if has_any(q, claim_words):
            if has_any(q, open_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_open_claims", "selected_record_types": ["claims"]}
            if has_any(q, resolved_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_status_claims", "selected_record_types": ["claims"], "status": "RESOLVED"}
            if has_any(q, critical_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_priority_claims", "selected_record_types": ["claims"], "priority": "CRITICAL"}
            return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_claims", "selected_record_types": ["claims"]}
        if has_any(q, task_words):
            if has_any(q, completed_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_completed_tasks", "selected_record_types": ["tasks"]}
            if has_any(q, critical_words):
                return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_priority_tasks", "selected_record_types": ["tasks"], "priority": "CRITICAL"}
            return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_tasks", "selected_record_types": ["tasks"]}
        if has_any(q, spare_part_words):
            return {"route": "SQL", "plan": "SQL_COUNT", "sql_intent": "generic_count_spare_parts", "selected_record_types": ["spare_parts"]}

    if has_any(q, status_distribution_words) and has_any(q, work_order_words):
        return None

    # SQL_TIME_SERIES.
    if has_any(q, trend_words):
        if has_any(q, work_order_words):
            return {"route": "SQL", "plan": "SQL_TIME_SERIES", "sql_intent": "generic_monthly_work_order_trend", "selected_record_types": ["work_orders"], "months": 12}
        if has_any(q, claim_words):
            return {"route": "SQL", "plan": "SQL_TIME_SERIES", "sql_intent": "generic_monthly_claim_trend", "selected_record_types": ["claims"], "months": 12}
        if has_any(q, cost_words) and has_any(q, category_words):
            return {"route": "SQL", "plan": "SQL_TIME_SERIES", "sql_intent": "generic_monthly_maintenance_cost_by_category", "selected_record_types": ["work_orders", "equipment"], "months": 12}
        if has_any(q, cost_words):
            return {"route": "SQL", "plan": "SQL_TIME_SERIES", "sql_intent": "generic_monthly_maintenance_cost_trend", "selected_record_types": ["work_orders"], "months": 12}
        if has_any(q, spare_part_words):
            return {"route": "SQL", "plan": "SQL_TIME_SERIES", "sql_intent": "generic_monthly_part_usage_trend", "selected_record_types": ["part_usage"], "months": 12}

    # SQL_TOP_N.
    if has_any(q, top_words) or "most" in q:
        if has_any(q, equipment_words) and has_any(q, top_claim_words):
            return None
        if has_any(q, equipment_words) and has_any(q, work_order_words) and has_any(q, critical_words):
            return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_top_equipment_by_critical_work_orders", "selected_record_types": ["equipment", "work_orders"], "limit": 10}
        if has_any(q, equipment_words) and has_any(q, work_order_words):
            return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_top_equipment_by_work_orders", "selected_record_types": ["equipment", "work_orders"], "limit": 10}
        if has_any(q, equipment_words) and has_any(q, cost_words):
            return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_top_equipment_by_cost", "selected_record_types": ["equipment", "work_orders"], "limit": 10}
        if has_any(q, spare_part_words) and ("used" in q or "usage" in q or "consumed" in q or "utilise" in q):
            return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_top_used_spare_parts", "selected_record_types": ["spare_parts", "part_usage"], "limit": 10}
        if has_any(q, spare_part_words) and has_any(q, cost_words):
            return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_top_expensive_spare_parts", "selected_record_types": ["spare_parts"], "limit": 10}
        if has_any(q, supplier_words) and ("used" in q or "usage" in q or "consumed" in q):
            return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_supplier_by_part_usage", "selected_record_types": ["spare_parts", "part_usage"], "limit": 10}

    if has_any(q, equipment_words) and ("repeated" in q or "recurring" in q or "repeat" in q or "unreliable" in q or "failing the most" in q or "failure" in q):
        return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_equipment_repeated_failures", "selected_record_types": ["equipment", "claims", "work_orders"], "limit": 10}
    if has_any(q, equipment_words) and ("replace" in q or "replacement" in q or "should we replace" in q or "retire" in q or "decommission" in q):
        return {"route": "SQL", "plan": "SQL_TOP_N", "sql_intent": "generic_equipment_replacement_candidates", "selected_record_types": ["equipment", "claims", "work_orders"], "limit": 10}

    # SQL_AGGREGATE.
    if has_any(q, department_words) and has_any(q, cost_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_department_maintenance_cost", "selected_record_types": ["work_orders", "equipment"], "limit": 10}
    if has_any(q, department_words) and has_any(q, work_order_words) and has_any(q, overdue_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_overdue_work_orders_by_department", "selected_record_types": ["work_orders", "equipment"], "limit": 20}
    if has_any(q, department_words) and has_any(q, work_order_words) and has_any(q, critical_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_critical_work_orders_by_department", "selected_record_types": ["work_orders", "equipment"], "limit": 20}
    if has_any(q, department_words) and has_any(q, work_order_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_work_orders_by_department", "selected_record_types": ["work_orders", "equipment"], "limit": 20}
    if has_any(q, department_words) and has_any(q, claim_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_claims_by_department", "selected_record_types": ["claims"], "limit": 20}
    if has_any(q, technician_words) and has_any(q, work_order_words) and has_any(q, open_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_open_work_orders_by_technician", "selected_record_types": ["work_orders"], "limit": 20}
    if has_any(q, technician_words) and has_any(q, work_order_words) and has_any(q, overdue_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_overdue_work_orders_by_technician", "selected_record_types": ["work_orders"], "limit": 20}
    if has_any(q, technician_words) and has_any(q, work_order_words) and has_any(q, completed_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_technician_completed_work_orders", "selected_record_types": ["work_orders"], "limit": 10}
    if has_any(q, technician_words) and has_any(q, task_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_technician_completed_tasks", "selected_record_types": ["tasks", "work_orders"], "limit": 10}
    if has_any(q, average_words) and has_any(q, repair_time_words) and has_any(q, technician_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_avg_repair_time_by_technician", "selected_record_types": ["work_orders"], "limit": 20}
    if has_any(q, average_words) and has_any(q, repair_time_words) and has_any(q, category_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_avg_repair_time_by_category", "selected_record_types": ["work_orders", "equipment"], "limit": 20}
    if has_any(q, supplier_words) and has_any(q, spare_part_words) and has_any(q, cost_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_supplier_spare_part_cost", "selected_record_types": ["spare_parts"], "limit": 10}
    if has_any(q, work_order_words) and "priority" in q:
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_work_orders_by_priority", "selected_record_types": ["work_orders"]}
    if has_any(q, claim_words) and "priority" in q:
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_claims_by_priority", "selected_record_types": ["claims"]}
    if has_any(q, cost_words) and "priority" in q:
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_cost_by_priority", "selected_record_types": ["work_orders"]}
    if has_any(q, cost_words) and "status" in q:
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_cost_by_status", "selected_record_types": ["work_orders"]}
    if has_any(q, average_words) and has_any(q, cost_words) and has_any(q, work_order_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_average_work_order_cost", "selected_record_types": ["work_orders"]}
    if has_any(q, cost_words) and "type" in q and has_any(q, work_order_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_cost_by_work_order_type", "selected_record_types": ["work_orders"]}
    if has_any(q, cost_words) and has_any(q, category_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_maintenance_cost_by_equipment_category", "selected_record_types": ["work_orders", "equipment"], "limit": 20}
    if has_any(q, spare_part_words) and "stock value" in q and has_any(q, category_words):
        return {"route": "SQL", "plan": "SQL_AGGREGATE", "sql_intent": "generic_stock_value_by_category", "selected_record_types": ["spare_parts"], "limit": 20}

    # SQL_FILTER_LIST.
    if has_any(q, list_words):
        user_id = extract_user_id(q)
        if user_id is not None and has_any(q, task_words):
            return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_tasks_by_technician", "selected_record_types": ["tasks", "work_orders"], "user_id": user_id, "limit": 30}
        if has_any(q, work_order_words):
            if has_any(q, critical_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_priority_work_orders", "selected_record_types": ["work_orders"], "priority": "CRITICAL", "limit": 30}
            if has_any(q, open_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_open_work_orders", "selected_record_types": ["work_orders"], "limit": 30}
            if has_any(q, overdue_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_overdue_work_orders", "selected_record_types": ["work_orders"], "limit": 30}
            if has_any(q, assigned_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_status_work_orders", "selected_record_types": ["work_orders"], "status": "ASSIGNED", "limit": 30}
            if has_any(q, cancelled_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_status_work_orders", "selected_record_types": ["work_orders"], "status": "CANCELLED", "limit": 30}
            if has_any(q, in_progress_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_status_work_orders", "selected_record_types": ["work_orders"], "status": "IN_PROGRESS", "limit": 30}
        if has_any(q, claim_words):
            if has_any(q, critical_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_priority_claims", "selected_record_types": ["claims"], "priority": "CRITICAL", "limit": 30}
            if has_any(q, open_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_open_claims", "selected_record_types": ["claims"], "limit": 30}
            if has_any(q, resolved_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_status_claims", "selected_record_types": ["claims"], "status": "RESOLVED", "limit": 30}
        if has_any(q, task_words) and has_any(q, blocked_words):
            return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_blocked_tasks", "selected_record_types": ["tasks"], "limit": 30}
        if has_any(q, spare_part_words):
            if has_any(q, out_of_stock_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_out_of_stock_parts", "selected_record_types": ["spare_parts"], "limit": 50}
            if has_any(q, expiry_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_parts_near_expiry", "selected_record_types": ["spare_parts"], "days": 90, "limit": 50}
            if has_any(q, low_stock_words) or has_any(q, reorder_words):
                return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_low_stock_parts", "selected_record_types": ["spare_parts"], "limit": 50}
        if has_any(q, work_order_words) and ("missing part" in q or "missing parts" in q or "blocked by part" in q or "waiting for part" in q):
            return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_work_orders_blocked_by_parts", "selected_record_types": ["work_orders", "tasks"], "limit": 50}
        if has_any(q, work_order_words) and ("exceeded estimate" in q or "over estimate" in q or "actual cost" in q or "cost overrun" in q):
            return {"route": "SQL", "plan": "SQL_FILTER_LIST", "sql_intent": "generic_list_actual_cost_exceeded_estimate", "selected_record_types": ["work_orders"], "limit": 50}

    # RAG-only semantic routing.
    rag_plan = plan_rag_question(q)
    if rag_plan:
        return rag_plan

    # Broad vague questions protection.
    if has_any(q, vague_broad_words):
        return {"route": "HYBRID", "plan": "HYBRID_EXPLAIN_SET", "topic": "equipment_failure_causes", "sql_intent": "generic_equipment_failure_causes", "selected_record_types": ["equipment", "claims", "work_orders", "tasks"], "limit": 30}

    # Generic HYBRID_EXPLAIN_SET.
    if has_any(q, explanation_words) and has_any(q, work_order_words) and has_any(q, critical_words):
        return {"route": "HYBRID", "plan": "HYBRID_EXPLAIN_SET", "topic": "critical_work_order_causes", "sql_intent": "generic_critical_work_order_causes", "selected_record_types": ["work_orders", "claims", "tasks", "equipment"], "limit": 30}
    if has_any(q, explanation_words) and (has_any(q, equipment_words) or has_any(q, maintenance_words)):
        return {"route": "HYBRID", "plan": "HYBRID_EXPLAIN_SET", "topic": "equipment_failure_causes", "sql_intent": "generic_equipment_failure_causes", "selected_record_types": ["equipment", "claims", "work_orders", "tasks"], "limit": 30}

    return None
