import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

from db_config import DB_CONFIG


# ============================================================
# Production-safe CMMS record extractor for Chroma/RAG
# ============================================================
# Purpose:
# - Extract text-rich operational maintenance records.
# - Avoid admin/security tables.
# - Avoid password/token/auth fields.
# - Create output/records.jsonl for embedding/indexing.
#
# Output record format:
# {
#   "id": "work_orders_123",
#   "record_type": "work_orders",
#   "record_id": "123",
#   "content": "... text used for embeddings ...",
#   "metadata": {... safe metadata ...}
# }
# ============================================================


OUTPUT_PATH = Path("output/records.jsonl")
OUTPUT_PATH.parent.mkdir(exist_ok=True)

MAX_ROWS_PER_TABLE = None  # Set to an integer for testing, or None for all rows.


# ============================================================
# Sensitive-field protection
# ============================================================

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


BLOCKED_TABLES = {
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "color_settings",
    "flyway_schema_history",
}


def is_sensitive_field(field_name: str) -> bool:
    field_lower = field_name.lower()
    return any(keyword in field_lower for keyword in SENSITIVE_FIELD_KEYWORDS)


def clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def clean_metadata_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


# ============================================================
# Database helpers
# ============================================================

def table_exists(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        );
        """,
        (table_name,),
    )
    return bool(cur.fetchone()["exists"])


def get_columns(cur, table_name: str) -> set:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position;
        """,
        (table_name,),
    )
    return {row["column_name"] for row in cur.fetchall()}


def choose_id_column(columns: set, candidates: List[str]) -> Optional[str]:
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return None


def safe_field_list(columns: set, fields: List[str]) -> List[str]:
    selected = []

    for field in fields:
        if field in columns and not is_sensitive_field(field):
            selected.append(field)

    return selected


def make_record(
    record_id: Any,
    record_type: str,
    content: str,
    metadata: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "id": f"{record_type}_{record_id}",
        "record_type": record_type,
        "record_id": str(record_id),
        "content": content.strip(),
        "metadata": metadata,
    }


# ============================================================
# Table extraction
# ============================================================

def extract_table(
    cur,
    table_name: str,
    id_candidates: List[str],
    text_fields: List[str],
    metadata_fields: List[str],
    label_fields: Optional[List[str]] = None,
    limit: Optional[int] = MAX_ROWS_PER_TABLE,
) -> List[Dict[str, Any]]:
    if table_name in BLOCKED_TABLES:
        print(f"Skipping blocked table: {table_name}")
        return []

    if not table_exists(cur, table_name):
        print(f"Skipping missing table: {table_name}")
        return []

    columns = get_columns(cur, table_name)

    id_column = choose_id_column(columns, id_candidates)
    if not id_column:
        print(f"Skipping {table_name}: no ID column found from {id_candidates}")
        return []

    safe_text_fields = safe_field_list(columns, text_fields)
    safe_metadata_fields = safe_field_list(columns, metadata_fields)
    safe_label_fields = safe_field_list(columns, label_fields or [])

    selected_fields = [id_column]

    for field in safe_text_fields + safe_metadata_fields + safe_label_fields:
        if field not in selected_fields:
            selected_fields.append(field)

    sql = f"""
        SELECT {", ".join(selected_fields)}
        FROM {table_name}
    """

    params = []

    if limit is not None:
        sql += " LIMIT %s"
        params.append(limit)

    cur.execute(sql, params)
    rows = cur.fetchall()

    records = []

    for row in rows:
        record_id = row[id_column]

        content_lines = [
            f"Record type: {table_name}",
            f"Record ID: {record_id}",
        ]

        for field in safe_label_fields:
            value = clean(row.get(field))
            if value:
                content_lines.append(f"{field}: {value}")

        for field in safe_text_fields:
            value = clean(row.get(field))
            if value:
                content_lines.append(f"{field}: {value}")

        metadata = {
            "record_type": table_name,
            "record_id": str(record_id),
        }

        for field in safe_metadata_fields:
            metadata[field] = clean_metadata_value(row.get(field))

        content = "\n".join(content_lines)

        if content.strip():
            records.append(
                make_record(
                    record_id=record_id,
                    record_type=table_name,
                    content=content,
                    metadata=metadata,
                )
            )

    print(f"Extracted {len(records)} records from {table_name}")
    return records


# ============================================================
# Production extraction config
# ============================================================
# Vectorize text-rich operational records.
# Keep admin/security tables excluded.
# Structured-only tables should remain SQL-first.
# ============================================================

TABLE_CONFIGS = [
    # -------------------------
    # Claims
    # -------------------------
    {
        "table_name": "claims",
        "id_candidates": ["claim_id", "id"],
        "label_fields": ["title"],
        "text_fields": [
            "description",
            "qualification_notes",
            "rejection_notes",
            "reported_severity",
            "validated_severity",
        ],
        "metadata_fields": [
            "status",
            "priority",
            "equipment_id",
            "department_id",
            "assigned_to_user_id",
            "linked_wo_id",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        ],
    },
    {
        "table_name": "claim_status_history",
        "id_candidates": ["history_id", "claim_status_history_id", "id"],
        "label_fields": [],
        "text_fields": [
            "old_status",
            "new_status",
            "reason",
            "notes",
            "comment",
        ],
        "metadata_fields": [
            "claim_id",
            "changed_by_user_id",
            "created_at",
            "changed_at",
        ],
    },

    # -------------------------
    # Work orders
    # -------------------------
    {
        "table_name": "work_orders",
        "id_candidates": ["wo_id", "work_order_id", "id"],
        "label_fields": ["title"],
        "text_fields": [
            "description",
            "completion_notes",
            "cancellation_notes",
            "validation_notes",
            "predictive_outcome",
            "predictive_outcome_notes",
            "wo_type",
        ],
        "metadata_fields": [
            "status",
            "priority",
            "equipment_id",
            "claim_id",
            "assigned_to_user_id",
            "created_at",
            "updated_at",
            "due_date",
            "planned_start",
            "planned_end",
            "completed_at",
            "actual_cost",
            "estimated_cost",
            "is_archived",
        ],
    },
    {
        "table_name": "work_order_status_history",
        "id_candidates": ["history_id", "wo_status_history_id", "id"],
        "label_fields": [],
        "text_fields": [
            "old_status",
            "new_status",
            "reason",
            "notes",
            "comment",
        ],
        "metadata_fields": [
            "wo_id",
            "changed_by_user_id",
            "created_at",
            "changed_at",
        ],
    },
    {
        "table_name": "wo_checklists",
        "id_candidates": ["checklist_id", "wo_checklist_id", "id"],
        "label_fields": ["title", "name"],
        "text_fields": [
            "description",
            "items_json",
            "result_json",
            "notes",
        ],
        "metadata_fields": [
            "wo_id",
            "created_at",
            "updated_at",
            "completed_at",
        ],
    },

    # -------------------------
    # Tasks
    # -------------------------
    {
        "table_name": "tasks",
        "id_candidates": ["task_id", "id"],
        "label_fields": ["title"],
        "text_fields": [
            "description",
            "notes",
            "blocked_reason",
            "failure_reason",
        ],
        "metadata_fields": [
            "status",
            "priority",
            "wo_id",
            "work_order_id",
            "assigned_to_user_id",
            "created_at",
            "updated_at",
            "due_date",
            "started_at",
            "completed_at",
            "estimated_duration",
            "actual_duration",
        ],
    },
    {
        "table_name": "sub_tasks",
        "id_candidates": ["sub_task_id", "subtask_id", "id"],
        "label_fields": ["title", "name"],
        "text_fields": [
            "description",
            "notes",
            "status",
        ],
        "metadata_fields": [
            "task_id",
            "wo_id",
            "created_at",
            "updated_at",
            "completed_at",
        ],
    },
    {
        "table_name": "task_audit_logs",
        "id_candidates": ["audit_id", "task_audit_id", "id"],
        "label_fields": [],
        "text_fields": [
            "action",
            "old_value",
            "new_value",
            "notes",
            "comment",
            "field_name",
        ],
        "metadata_fields": [
            "task_id",
            "wo_id",
            "changed_by_user_id",
            "created_at",
            "changed_at",
        ],
    },

    # -------------------------
    # Equipment
    # -------------------------
    {
        "table_name": "equipment",
        "id_candidates": ["equipment_id", "id"],
        "label_fields": ["name", "asset_code"],
        "text_fields": [
            "manufacturer",
            "model_reference",
            "classification",
            "location",
            "category",
            "model",
            "supplier_name",
            "serial_number",
            "criticality",
            "status",
        ],
        "metadata_fields": [
            "status",
            "department_id",
            "category_id",
            "model_id",
            "purchase_date",
            "commissioning_date",
            "warranty_end_date",
        ],
    },
    {
        "table_name": "equipment_history",
        "id_candidates": ["history_id", "equipment_history_id", "id"],
        "label_fields": [],
        "text_fields": [
            "action",
            "description",
            "notes",
            "old_value",
            "new_value",
            "status",
        ],
        "metadata_fields": [
            "equipment_id",
            "wo_id",
            "claim_id",
            "created_by_user_id",
            "created_at",
        ],
    },
    {
        "table_name": "equipment_documents",
        "id_candidates": ["document_id", "equipment_document_id", "id"],
        "label_fields": ["title", "name", "file_name"],
        "text_fields": [
            "description",
            "document_type",
            "file_type",
        ],
        "metadata_fields": [
            "equipment_id",
            "uploaded_by_user_id",
            "created_at",
            "uploaded_at",
        ],
    },

    # -------------------------
    # Plans / compliance
    # -------------------------
    {
        "table_name": "maintenance_plans",
        "id_candidates": ["plan_id", "maintenance_plan_id", "id"],
        "label_fields": ["name", "title"],
        "text_fields": [
            "description",
            "frequency",
            "plan_type",
            "instructions",
            "checklist_template",
            "notes",
        ],
        "metadata_fields": [
            "equipment_id",
            "status",
            "priority",
            "next_due_date",
            "last_done_date",
            "created_at",
            "updated_at",
        ],
    },
    {
        "table_name": "regulatory_plans",
        "id_candidates": ["regulatory_plan_id", "plan_id", "id"],
        "label_fields": ["name", "title"],
        "text_fields": [
            "description",
            "regulation_name",
            "frequency",
            "mandatory_tasks",
            "checklist_template",
            "reminder_policy",
            "notes",
        ],
        "metadata_fields": [
            "equipment_id",
            "status",
            "priority",
            "next_due_date",
            "last_done_date",
            "created_at",
            "updated_at",
        ],
    },

    # -------------------------
    # AI priority suggestions
    # -------------------------
    {
        "table_name": "ai_priority_suggestions",
        "id_candidates": ["suggestion_id", "ai_priority_suggestion_id", "id"],
        "label_fields": [],
        "text_fields": [
            "suggested_priority",
            "current_priority",
            "reason",
            "recommendation",
            "sla_status",
            "risk_explanation",
            "notes",
        ],
        "metadata_fields": [
            "claim_id",
            "wo_id",
            "equipment_id",
            "created_at",
            "updated_at",
        ],
    },

    # -------------------------
    # Photo metadata only
    # -------------------------
    {
        "table_name": "claim_photos",
        "id_candidates": ["photo_id", "claim_photo_id", "id"],
        "label_fields": ["file_name"],
        "text_fields": [
            "caption",
            "description",
            "photo_type",
        ],
        "metadata_fields": [
            "claim_id",
            "uploaded_by_user_id",
            "created_at",
            "uploaded_at",
        ],
    },
    {
        "table_name": "task_photos",
        "id_candidates": ["photo_id", "task_photo_id", "id"],
        "label_fields": ["file_name"],
        "text_fields": [
            "caption",
            "description",
            "photo_type",
        ],
        "metadata_fields": [
            "task_id",
            "wo_id",
            "uploaded_by_user_id",
            "created_at",
            "uploaded_at",
        ],
    },
]


# ============================================================
# Main
# ============================================================

def main():
    conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    all_records: List[Dict[str, Any]] = []

    try:
        for config in TABLE_CONFIGS:
            all_records.extend(
                extract_table(
                    cur=cur,
                    table_name=config["table_name"],
                    id_candidates=config["id_candidates"],
                    text_fields=config.get("text_fields", []),
                    metadata_fields=config.get("metadata_fields", []),
                    label_fields=config.get("label_fields", []),
                    limit=MAX_ROWS_PER_TABLE,
                )
            )

    finally:
        cur.close()
        conn.close()

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        for record in all_records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    counts = {}
    for record in all_records:
        record_type = record["record_type"]
        counts[record_type] = counts.get(record_type, 0) + 1

    print()
    print("=" * 100)
    print("Extraction complete")
    print("=" * 100)
    print(f"Output: {OUTPUT_PATH}")
    print(f"Total records extracted: {len(all_records)}")
    print()
    print("Record counts by type:")
    for record_type, count in sorted(counts.items()):
        print(f"- {record_type}: {count}")

    print()
    print("Security note:")
    print("- Admin/security tables are excluded.")
    print("- Sensitive fields containing password/token/secret/auth keywords are excluded.")


if __name__ == "__main__":
    main()