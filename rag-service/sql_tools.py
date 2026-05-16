from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

from db_config import DB_CONFIG


# ============================================================
# SQL tools for secured CMMS assistant
# ============================================================
# Rules:
# - No user-generated SQL.
# - Only predefined, allowlisted SQL templates.
# - No admin/security tables.
# - No password/token/security fields.
# - Read maintenance/operational data only.
# ============================================================


# ============================================================
# JSON-safe helpers
# ============================================================

def json_safe_value(value):
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return value


def json_safe_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: json_safe_value(value)
        for key, value in row.items()
    }


def run_query(sql: str, params=None) -> List[Dict[str, Any]]:
    if params is None:
        params = []

    conn = psycopg2.connect(**DB_CONFIG)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [json_safe_row(dict(row)) for row in rows]
    finally:
        conn.close()


# ============================================================
# Core SQL route queries
# ============================================================

def top_equipment_by_claims(limit: int = 3):
    limit = max(1, min(int(limit), 20))

    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        COUNT(c.claim_id) AS claim_count
    FROM equipment e
    JOIN claims c ON c.equipment_id = e.equipment_id
    GROUP BY
        e.equipment_id,
        e.asset_code,
        e.name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location
    ORDER BY claim_count DESC, e.equipment_id ASC
    LIMIT %s;
    """

    return run_query(sql, [limit])


def count_open_work_orders():
    sql = """
    SELECT COUNT(*) AS open_work_orders
    FROM work_orders
    WHERE status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED');
    """

    return run_query(sql)


def count_open_claims():
    sql = """
    SELECT COUNT(*) AS open_claims
    FROM claims
    WHERE status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED', 'CANCELLED');
    """

    return run_query(sql)


def spare_parts_below_min_stock():
    sql = """
    SELECT
        sp.part_id,
        ('spare_parts_' || sp.part_id) AS source_id,
        sp.sku,
        sp.name,
        sp.category,
        sp.location,
        sp.supplier,
        sp.quantity_in_stock,
        sp.min_stock_level,
        sp.unit_cost,
        sp.expiry_date,
        sp.updated_at
    FROM spare_parts sp
    WHERE sp.quantity_in_stock < sp.min_stock_level
    ORDER BY
        sp.quantity_in_stock ASC,
        sp.min_stock_level DESC,
        sp.sku ASC;
    """

    return run_query(sql)


def overdue_work_orders():
    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,

        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,

        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.planned_start,
        wo.planned_end,
        wo.completed_at,
        wo.cancellation_notes,
        wo.completion_notes,
        wo.validation_notes,
        wo.predictive_outcome,
        wo.predictive_outcome_notes
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE
        wo.due_date IS NOT NULL
        AND wo.due_date < NOW()
        AND wo.status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED')
    ORDER BY wo.due_date ASC
    LIMIT 20;
    """

    return run_query(sql)


def work_orders_by_status():
    sql = """
    SELECT
        status,
        COUNT(*) AS count
    FROM work_orders
    GROUP BY status
    ORDER BY count DESC, status ASC;
    """

    return run_query(sql)


def claims_by_priority():
    sql = """
    SELECT
        priority,
        COUNT(*) AS count
    FROM claims
    GROUP BY priority
    ORDER BY count DESC, priority ASC;
    """

    return run_query(sql)


def blocked_tasks():
    sql = """
    SELECT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.notes,
        t.blocked_reason,
        t.failure_reason,
        t.started_at,
        t.completed_at,
        t.due_date
    FROM tasks t
    WHERE
        t.status = 'BLOCKED'
        OR t.blocked_reason IS NOT NULL
        OR t.failure_reason IS NOT NULL
    ORDER BY t.due_date ASC NULLS LAST, t.task_id ASC
    LIMIT 50;
    """

    return run_query(sql)


def cancelled_work_orders():
    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.completed_at,
        wo.cancellation_notes,
        wo.completion_notes,
        wo.validation_notes,
        wo.predictive_outcome,
        wo.predictive_outcome_notes
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.status = 'CANCELLED'
    ORDER BY wo.updated_at DESC NULLS LAST, wo.created_at DESC
    LIMIT 50;
    """

    return run_query(sql)


def high_priority_claims():
    sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        c.title,
        c.description,
        c.status,
        c.priority,
        c.reported_severity,
        c.validated_severity,
        c.qualification_notes,
        c.rejection_notes,
        c.created_at,
        c.updated_at,
        c.resolved_at,
        c.closed_at
    FROM claims c
    LEFT JOIN equipment e ON e.equipment_id = c.equipment_id
    WHERE c.priority IN ('CRITICAL', 'HIGH')
    ORDER BY
        CASE
            WHEN c.priority = 'CRITICAL' THEN 1
            WHEN c.priority = 'HIGH' THEN 2
            ELSE 3
        END,
        c.created_at DESC
    LIMIT 50;
    """

    return run_query(sql)


# ============================================================
# Related-record helpers for HYBRID route
# ============================================================

def get_related_records_for_equipment(equipment_ids, limit_per_type: int = 30):
    if not equipment_ids:
        return {
            "claims": [],
            "work_orders": [],
            "tasks": [],
        }

    limit_per_type = max(1, min(int(limit_per_type), 100))

    claims_sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.equipment_id,
        c.title,
        c.description,
        c.status,
        c.priority,
        c.reported_severity,
        c.validated_severity,
        c.qualification_notes,
        c.rejection_notes,
        c.created_at,
        c.updated_at,
        c.resolved_at,
        c.closed_at
    FROM claims c
    WHERE c.equipment_id = ANY(%s)
    ORDER BY c.created_at DESC
    LIMIT %s;
    """

    work_orders_sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.planned_start,
        wo.planned_end,
        wo.completed_at,
        wo.cancellation_notes,
        wo.completion_notes,
        wo.validation_notes,
        wo.predictive_outcome,
        wo.predictive_outcome_notes
    FROM work_orders wo
    WHERE wo.equipment_id = ANY(%s)
    ORDER BY wo.created_at DESC
    LIMIT %s;
    """

    tasks_sql = """
    SELECT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        wo.equipment_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.notes,
        t.blocked_reason,
        t.failure_reason,
        t.started_at,
        t.completed_at,
        t.due_date
    FROM tasks t
    JOIN work_orders wo ON wo.wo_id = t.wo_id
    WHERE wo.equipment_id = ANY(%s)
    ORDER BY t.task_id ASC
    LIMIT %s;
    """

    return {
        "claims": run_query(claims_sql, [equipment_ids, limit_per_type]),
        "work_orders": run_query(work_orders_sql, [equipment_ids, limit_per_type]),
        "tasks": run_query(tasks_sql, [equipment_ids, limit_per_type]),
    }


def get_related_records_for_work_orders(wo_ids, limit_per_type: int = 50):
    if not wo_ids:
        return {
            "claims": [],
            "tasks": [],
        }

    limit_per_type = max(1, min(int(limit_per_type), 150))

    claims_sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        c.title,
        c.description,
        c.status,
        c.priority,
        c.reported_severity,
        c.validated_severity,
        c.qualification_notes,
        c.rejection_notes,
        c.created_at,
        c.updated_at,
        c.resolved_at,
        c.closed_at
    FROM claims c
    LEFT JOIN equipment e ON e.equipment_id = c.equipment_id
    WHERE c.claim_id IN (
        SELECT wo.claim_id
        FROM work_orders wo
        WHERE wo.wo_id = ANY(%s)
          AND wo.claim_id IS NOT NULL
    )
    ORDER BY c.created_at DESC
    LIMIT %s;
    """

    tasks_sql = """
    SELECT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        wo.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.notes,
        t.blocked_reason,
        t.failure_reason,
        t.started_at,
        t.completed_at,
        t.due_date
    FROM tasks t
    JOIN work_orders wo ON wo.wo_id = t.wo_id
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE t.wo_id = ANY(%s)
    ORDER BY t.wo_id ASC, t.task_id ASC
    LIMIT %s;
    """

    return {
        "claims": run_query(claims_sql, [wo_ids, limit_per_type]),
        "tasks": run_query(tasks_sql, [wo_ids, limit_per_type]),
    }


def get_related_records_for_low_stock_parts(part_ids, limit_per_type: int = 40):
    """
    Fetch related part usage, work orders, and tasks for low-stock spare parts.

    Important:
    In psycopg2 SQL strings, literal percent signs must be escaped as %%.
    So LIKE patterns must be written as '%%stock%%', not '%stock%'.
    """

    if not part_ids:
        return {
            "part_usage": [],
            "work_orders": [],
            "tasks": [],
        }

    limit_per_type = max(1, min(int(limit_per_type), 100))

    part_usage_sql = """
    SELECT
        pu.usage_id,
        pu.part_id,
        sp.name AS part_name,
        sp.sku,
        sp.quantity_in_stock,
        sp.min_stock_level,
        pu.wo_id,
        pu.task_id,
        pu.quantity_used,
        pu.used_at
    FROM part_usage pu
    JOIN spare_parts sp ON sp.part_id = pu.part_id
    WHERE pu.part_id = ANY(%s)
    ORDER BY pu.used_at DESC NULLS LAST
    LIMIT %s;
    """

    work_orders_sql = """
    SELECT DISTINCT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.planned_start,
        wo.planned_end,
        wo.completed_at,
        wo.cancellation_notes,
        wo.completion_notes,
        wo.validation_notes,
        wo.predictive_outcome,
        wo.predictive_outcome_notes
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE
        wo.wo_id IN (
            SELECT pu.wo_id
            FROM part_usage pu
            WHERE pu.part_id = ANY(%s)
              AND pu.wo_id IS NOT NULL
        )
        OR wo.predictive_outcome = 'PART_SHORTAGE'
    ORDER BY wo.updated_at DESC NULLS LAST
    LIMIT %s;
    """

    tasks_sql = """
    SELECT DISTINCT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        wo.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.notes,
        t.blocked_reason,
        t.failure_reason,
        t.started_at,
        t.completed_at,
        t.due_date
    FROM tasks t
    JOIN work_orders wo ON wo.wo_id = t.wo_id
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE
        t.task_id IN (
            SELECT pu.task_id
            FROM part_usage pu
            WHERE pu.part_id = ANY(%s)
              AND pu.task_id IS NOT NULL
        )
        OR LOWER(COALESCE(t.blocked_reason, '')) LIKE '%%stock%%'
        OR LOWER(COALESCE(t.blocked_reason, '')) LIKE '%%spare%%'
        OR LOWER(COALESCE(t.blocked_reason, '')) LIKE '%%part%%'
    ORDER BY t.task_id ASC
    LIMIT %s;
    """

    return {
        "part_usage": run_query(part_usage_sql, [part_ids, limit_per_type]),
        "work_orders": run_query(work_orders_sql, [part_ids, limit_per_type]),
        "tasks": run_query(tasks_sql, [part_ids, limit_per_type]),
    }

# ============================================================
# Generic Option A HYBRID_EXPLAIN_SET helpers
# ============================================================

def generic_critical_work_order_causes(limit: int = 30):
    """
    Fetch critical/high work orders with descriptive fields.

    Used for:
    - What are the most common causes of critical work orders?
    - Why are critical work orders happening?
    """

    limit = max(1, min(int(limit), 50))

    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,

        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,

        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.planned_start,
        wo.planned_end,
        wo.completed_at,
        wo.cancellation_notes,
        wo.completion_notes,
        wo.validation_notes,
        wo.predictive_outcome,
        wo.predictive_outcome_notes
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.priority IN ('CRITICAL', 'HIGH')
    ORDER BY
        CASE
            WHEN wo.priority = 'CRITICAL' THEN 1
            WHEN wo.priority = 'HIGH' THEN 2
            ELSE 3
        END,
        wo.created_at DESC
    LIMIT %s;
    """

    return run_query(sql, [limit])


def generic_equipment_failure_causes(limit: int = 30):
    """
    Fetch recent/high-signal work orders that can explain equipment failures.

    Used for:
    - Why equipments are failing?
    - Why are machines having problems?
    - What are common maintenance problems?
    """

    limit = max(1, min(int(limit), 50))

    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,

        e.asset_code,
        e.name AS equipment_name,
        e.classification,
        e.category,
        e.model,
        e.criticality,
        e.location,
        e.status AS equipment_status,

        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.planned_start,
        wo.planned_end,
        wo.completed_at,
        wo.cancellation_notes,
        wo.completion_notes,
        wo.validation_notes,
        wo.predictive_outcome,
        wo.predictive_outcome_notes
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE
        wo.priority IN ('CRITICAL', 'HIGH')
        OR wo.predictive_outcome IN ('FAILURE_RISK', 'PART_SHORTAGE', 'SLA_RISK')
        OR wo.status IN ('ON_HOLD', 'IN_PROGRESS', 'ASSIGNED', 'SCHEDULED')
    ORDER BY
        CASE
            WHEN wo.priority = 'CRITICAL' THEN 1
            WHEN wo.priority = 'HIGH' THEN 2
            WHEN wo.predictive_outcome = 'FAILURE_RISK' THEN 3
            WHEN wo.predictive_outcome = 'PART_SHORTAGE' THEN 4
            WHEN wo.predictive_outcome = 'SLA_RISK' THEN 5
            ELSE 6
        END,
        wo.created_at DESC
    LIMIT %s;
    """

    return run_query(sql, [limit])


def get_generic_related_records_for_work_orders(wo_ids, limit_per_type: int = 40):
    """
    Fetch related claims and tasks for generic HYBRID_EXPLAIN_SET plans.
    """

    return get_related_records_for_work_orders(
        wo_ids=wo_ids,
        limit_per_type=limit_per_type,
    )