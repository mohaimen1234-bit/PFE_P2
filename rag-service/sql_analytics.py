from typing import Any, Dict, List

from sql_tools import run_query


# ============================================================
# Generic SQL analytics layer
# ============================================================
# Safe design:
# - No LLM-generated SQL.
# - Only allowlisted SQL templates.
# - No admin/security tables.
# - No raw database dumps.
# - Each function limits output.
# ============================================================


def safe_generic_query(sql: str, params=None) -> List[Dict[str, Any]]:
    try:
        return run_query(sql, params or [])
    except Exception as e:
        return [{"error": str(e)}]


def clamp_limit(limit: int, max_limit: int = 100) -> int:
    return max(1, min(int(limit), max_limit))


def clamp_months(months: int) -> int:
    return max(1, min(int(months), 36))


# ============================================================
# SQL_COUNT
# ============================================================

def generic_count_departments():
    sql = """
    SELECT COUNT(DISTINCT department_id) AS department_count
    FROM equipment
    WHERE department_id IS NOT NULL;
    """
    return safe_generic_query(sql)


def generic_count_equipment():
    sql = "SELECT COUNT(*) AS equipment_count FROM equipment;"
    return safe_generic_query(sql)


def generic_count_work_orders():
    sql = "SELECT COUNT(*) AS work_order_count FROM work_orders;"
    return safe_generic_query(sql)


def generic_count_claims():
    sql = "SELECT COUNT(*) AS claim_count FROM claims;"
    return safe_generic_query(sql)


def generic_count_tasks():
    sql = "SELECT COUNT(*) AS task_count FROM tasks;"
    return safe_generic_query(sql)


def generic_count_spare_parts():
    sql = "SELECT COUNT(*) AS spare_part_count FROM spare_parts;"
    return safe_generic_query(sql)


def generic_count_technicians():
    # In this system, all users in the 'users' table are considered technicians/staff.
    sql = "SELECT COUNT(*) AS technician_count FROM users;"
    return safe_generic_query(sql)


def generic_count_open_work_orders():
    sql = """
    SELECT COUNT(*) AS open_work_order_count
    FROM work_orders
    WHERE status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED');
    """
    return safe_generic_query(sql)


def generic_count_open_claims():
    sql = """
    SELECT COUNT(*) AS open_claim_count
    FROM claims
    WHERE status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED', 'CANCELLED');
    """
    return safe_generic_query(sql)


def generic_count_completed_tasks():
    sql = """
    SELECT COUNT(*) AS completed_task_count
    FROM tasks
    WHERE completed_at IS NOT NULL
       OR status IN ('COMPLETED', 'VALIDATED', 'CLOSED', 'DONE');
    """
    return safe_generic_query(sql)


def generic_count_status_work_orders(status: str):
    sql = """
    SELECT
        status,
        COUNT(*) AS work_order_count
    FROM work_orders
    WHERE status = %s
    GROUP BY status;
    """
    return safe_generic_query(sql, [status])


def generic_count_status_claims(status: str):
    sql = """
    SELECT
        status,
        COUNT(*) AS claim_count
    FROM claims
    WHERE status = %s
    GROUP BY status;
    """
    return safe_generic_query(sql, [status])


def generic_count_status_tasks(status: str):
    sql = """
    SELECT
        status,
        COUNT(*) AS task_count
    FROM tasks
    WHERE status = %s
    GROUP BY status;
    """
    return safe_generic_query(sql, [status])


def generic_count_status_equipment():
    sql = """
    SELECT
        status,
        COUNT(*) AS equipment_count
    FROM equipment
    WHERE status IS NOT NULL
    GROUP BY status
    ORDER BY equipment_count DESC;
    """
    return safe_generic_query(sql)


def generic_list_all_equipment(limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        equipment_id,
        ('equipment_' || equipment_id) AS source_id,
        name AS equipment_name,
        asset_code,
        category,
        status,
        criticality,
        department_id
    FROM equipment
    ORDER BY equipment_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_count_priority_work_orders(priority: str):
    sql = """
    SELECT
        priority,
        COUNT(*) AS work_order_count
    FROM work_orders
    WHERE priority = %s
    GROUP BY priority;
    """
    return safe_generic_query(sql, [priority])


def generic_count_priority_claims(priority: str):
    sql = """
    SELECT
        priority,
        COUNT(*) AS claim_count
    FROM claims
    WHERE priority = %s
    GROUP BY priority;
    """
    return safe_generic_query(sql, [priority])


def generic_count_priority_tasks(priority: str):
    sql = """
    SELECT
        priority,
        COUNT(*) AS task_count
    FROM tasks
    WHERE priority = %s
    GROUP BY priority;
    """
    return safe_generic_query(sql, [priority])


# ============================================================
# SQL_DATE_FILTER
# ============================================================

# ============================================================
# SQL_DATE_FILTER
# ============================================================

def get_date_range_sql(range_key: Any) -> tuple[str, str, list]:
    """
    Return PostgreSQL start/end expressions and parameters for supported relative ranges.
    """
    if isinstance(range_key, (list, tuple)) and len(range_key) == 2:
        return "%s", "%s", [range_key[0], range_key[1]]

    if range_key == "today":
        return "CURRENT_DATE", "NOW() + INTERVAL '1 day'", []

    if range_key == "this_week":
        return "DATE_TRUNC('week', NOW())", "NOW() + INTERVAL '1 day'", []

    if range_key == "last_week":
        return "DATE_TRUNC('week', NOW()) - INTERVAL '1 week'", "DATE_TRUNC('week', NOW())", []

    if range_key == "this_month":
        return "DATE_TRUNC('month', NOW())", "NOW() + INTERVAL '1 day'", []

    if range_key == "last_month":
        return "DATE_TRUNC('month', NOW()) - INTERVAL '1 month'", "DATE_TRUNC('month', NOW())", []

    if range_key == "this_year":
        return "DATE_TRUNC('year', NOW())", "NOW() + INTERVAL '1 day'", []

    if range_key == "last_30_days":
        return "NOW() - INTERVAL '30 days'", "NOW() + INTERVAL '1 day'", []

    # Dynamic relative ranges: last_X_unit (e.g., last_2_months)
    if isinstance(range_key, str) and range_key.startswith("last_"):
        parts = range_key.split("_")
        if len(parts) == 3 and parts[1].isdigit():
            count = parts[1]
            unit = parts[2] # months, days, weeks, years
            return f"NOW() - INTERVAL '{count} {unit}'", "NOW() + INTERVAL '1 day'", []

    return "NOW() - INTERVAL '30 days'", "NOW() + INTERVAL '1 day'", []


def generic_count_work_orders_date_range(range_key: str):
    start_expr, end_expr, params = get_date_range_sql(range_key)

    sql = f"""
    SELECT
        COUNT(*) AS work_order_count
    FROM work_orders
    WHERE created_at >= {start_expr}
      AND created_at < {end_expr};
    """

    return safe_generic_query(sql, params)


def generic_count_claims_date_range(range_key: str):
    start_expr, end_expr, params = get_date_range_sql(range_key)

    sql = f"""
    SELECT
        COUNT(*) AS claim_count
    FROM claims
    WHERE created_at >= {start_expr}
      AND created_at < {end_expr};
    """

    return safe_generic_query(sql, params)


def generic_list_work_orders_date_range(range_key: str, limit: int = 30):
    limit = clamp_limit(limit)
    start_expr, end_expr, params = get_date_range_sql(range_key)

    sql = f"""
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.created_at >= {start_expr}
      AND wo.created_at < {end_expr}
    ORDER BY wo.created_at DESC
    LIMIT %s;
    """

    return safe_generic_query(sql, params + [limit])


def generic_completed_work_orders_date_range(range_key: str, limit: int = 30):
    limit = clamp_limit(limit)
    start_expr, end_expr, params = get_date_range_sql(range_key)

    sql = f"""
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.status,
        wo.priority,
        wo.created_at,
        wo.completed_at,
        wo.actual_cost,
        wo.estimated_cost,
        e.asset_code,
        e.name AS equipment_name,
        e.category
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.completed_at IS NOT NULL
      AND wo.completed_at >= {start_expr}
      AND wo.completed_at < {end_expr}
    ORDER BY wo.completed_at DESC
    LIMIT %s;
    """

    return safe_generic_query(sql, params + [limit])


def generic_maintenance_cost_date_range(range_key: str):
    start_expr, end_expr, params = get_date_range_sql(range_key)

    sql = f"""
    SELECT
        COUNT(*) AS work_order_count,
        ROUND(SUM(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS total_maintenance_cost,
        ROUND(AVG(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS average_maintenance_cost
    FROM work_orders
    WHERE created_at >= {start_expr}
      AND created_at < {end_expr};
    """

    return safe_generic_query(sql, params)
# ============================================================
# SQL_AGGREGATE / GROUP BY
# ============================================================

def generic_department_maintenance_cost(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.department_id,
        COUNT(wo.wo_id) AS work_order_count,
        ROUND(SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) AS total_maintenance_cost,
        ROUND(AVG(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) AS average_maintenance_cost
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE COALESCE(wo.actual_cost, wo.estimated_cost, 0) > 0
    GROUP BY e.department_id
    ORDER BY total_maintenance_cost DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_work_orders_by_department(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.department_id,
        COUNT(wo.wo_id) AS work_order_count
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    GROUP BY e.department_id
    ORDER BY work_order_count DESC, e.department_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_claims_by_department(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        c.department_id,
        COUNT(c.claim_id) AS claim_count
    FROM claims c
    GROUP BY c.department_id
    ORDER BY claim_count DESC, c.department_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_overdue_work_orders_by_department(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.department_id,
        COUNT(wo.wo_id) AS overdue_work_order_count
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.due_date IS NOT NULL
      AND wo.due_date < NOW()
      AND wo.status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED')
    GROUP BY e.department_id
    ORDER BY overdue_work_order_count DESC, e.department_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_critical_work_orders_by_department(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.department_id,
        COUNT(wo.wo_id) AS critical_work_order_count
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.priority IN ('CRITICAL', 'HIGH')
    GROUP BY e.department_id
    ORDER BY critical_work_order_count DESC, e.department_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_technician_completed_tasks(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        wo.assigned_to_user_id AS technician_user_id,
        COUNT(t.task_id) AS completed_task_count
    FROM tasks t
    JOIN work_orders wo ON wo.wo_id = t.wo_id
    WHERE t.completed_at IS NOT NULL
       OR t.status IN ('COMPLETED', 'VALIDATED', 'CLOSED', 'DONE')
    GROUP BY wo.assigned_to_user_id
    ORDER BY completed_task_count DESC, technician_user_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_technician_completed_work_orders(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        assigned_to_user_id AS technician_user_id,
        COUNT(wo_id) AS completed_work_order_count
    FROM work_orders
    WHERE completed_at IS NOT NULL
       OR status IN ('COMPLETED', 'VALIDATED', 'CLOSED')
    GROUP BY assigned_to_user_id
    ORDER BY completed_work_order_count DESC, technician_user_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_open_work_orders_by_technician(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        assigned_to_user_id AS technician_user_id,
        COUNT(wo_id) AS open_work_order_count
    FROM work_orders
    WHERE status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED')
    GROUP BY assigned_to_user_id
    ORDER BY open_work_order_count DESC, technician_user_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_overdue_work_orders_by_technician(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        assigned_to_user_id AS technician_user_id,
        COUNT(wo_id) AS overdue_work_order_count
    FROM work_orders
    WHERE due_date IS NOT NULL
      AND due_date < NOW()
      AND status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED')
    GROUP BY assigned_to_user_id
    ORDER BY overdue_work_order_count DESC, technician_user_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_avg_repair_time_by_technician(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        assigned_to_user_id AS technician_user_id,
        COUNT(wo_id) AS completed_work_order_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600.0)::numeric, 2) AS average_repair_hours
    FROM work_orders
    WHERE completed_at IS NOT NULL
      AND created_at IS NOT NULL
      AND completed_at >= created_at
    GROUP BY assigned_to_user_id
    ORDER BY average_repair_hours DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_avg_repair_time_by_category(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.category AS equipment_category,
        COUNT(wo.wo_id) AS completed_work_order_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 3600.0)::numeric, 2) AS average_repair_hours
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.completed_at IS NOT NULL
      AND wo.created_at IS NOT NULL
      AND wo.completed_at >= wo.created_at
    GROUP BY e.category
    ORDER BY average_repair_hours DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_supplier_spare_part_cost(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        supplier,
        COUNT(part_id) AS spare_part_count,
        ROUND(AVG(unit_cost)::numeric, 2) AS average_unit_cost,
        ROUND(MAX(unit_cost)::numeric, 2) AS highest_unit_cost,
        ROUND(SUM(quantity_in_stock * unit_cost)::numeric, 2) AS current_stock_value
    FROM spare_parts
    WHERE unit_cost IS NOT NULL
    GROUP BY supplier
    ORDER BY average_unit_cost DESC NULLS LAST, highest_unit_cost DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_work_orders_by_priority():
    sql = """
    SELECT priority, COUNT(*) AS work_order_count
    FROM work_orders
    GROUP BY priority
    ORDER BY work_order_count DESC, priority ASC;
    """
    return safe_generic_query(sql)


def generic_claims_by_priority():
    sql = """
    SELECT priority, COUNT(*) AS claim_count
    FROM claims
    GROUP BY priority
    ORDER BY claim_count DESC, priority ASC;
    """
    return safe_generic_query(sql)


def generic_cost_by_priority():
    sql = """
    SELECT
        priority,
        COUNT(*) AS work_order_count,
        ROUND(SUM(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS total_cost,
        ROUND(AVG(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS average_cost
    FROM work_orders
    WHERE COALESCE(actual_cost, estimated_cost, 0) > 0
    GROUP BY priority
    ORDER BY total_cost DESC NULLS LAST;
    """
    return safe_generic_query(sql)


def generic_cost_by_status():
    sql = """
    SELECT
        status,
        COUNT(*) AS work_order_count,
        ROUND(SUM(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS total_cost,
        ROUND(AVG(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS average_cost
    FROM work_orders
    WHERE COALESCE(actual_cost, estimated_cost, 0) > 0
    GROUP BY status
    ORDER BY total_cost DESC NULLS LAST;
    """
    return safe_generic_query(sql)


def generic_average_work_order_cost():
    sql = """
    SELECT
        COUNT(*) AS work_order_count,
        ROUND(AVG(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS average_work_order_cost
    FROM work_orders
    WHERE COALESCE(actual_cost, estimated_cost, 0) > 0;
    """
    return safe_generic_query(sql)


def generic_cost_by_work_order_type():
    sql = """
    SELECT
        wo_type,
        COUNT(*) AS work_order_count,
        ROUND(SUM(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS total_cost,
        ROUND(AVG(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS average_cost
    FROM work_orders
    WHERE COALESCE(actual_cost, estimated_cost, 0) > 0
    GROUP BY wo_type
    ORDER BY total_cost DESC NULLS LAST;
    """
    return safe_generic_query(sql)


# ============================================================
# SQL_FILTER_LIST
# ============================================================

def generic_list_status_work_orders(status: str, limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.completed_at,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.status = %s
    ORDER BY wo.updated_at DESC NULLS LAST, wo.created_at DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [status, limit])


def generic_list_status_claims(status: str, limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.title,
        c.description,
        c.status,
        c.priority,
        c.created_at,
        c.updated_at,
        e.asset_code,
        e.name AS equipment_name
    FROM claims c
    LEFT JOIN equipment e ON e.equipment_id = c.equipment_id
    WHERE c.status = %s
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [status, limit])


def generic_list_priority_work_orders(priority: str, limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.completed_at,
        wo.predictive_outcome,
        wo.predictive_outcome_notes,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        e.criticality
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.priority = %s
    ORDER BY wo.created_at DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [priority, limit])


def generic_list_priority_claims(priority: str, limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.title,
        c.description,
        c.status,
        c.priority,
        c.reported_severity,
        c.validated_severity,
        c.created_at,
        c.updated_at,
        e.asset_code,
        e.name AS equipment_name
    FROM claims c
    LEFT JOIN equipment e ON e.equipment_id = c.equipment_id
    WHERE c.priority = %s
    ORDER BY c.created_at DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [priority, limit])


def generic_list_open_work_orders(limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.status,
        wo.priority,
        wo.wo_type,
        wo.created_at,
        wo.due_date,
        e.asset_code,
        e.name AS equipment_name
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED')
    ORDER BY wo.created_at DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_open_claims(limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.title,
        c.description,
        c.status,
        c.priority,
        c.created_at,
        c.updated_at,
        e.asset_code,
        e.name AS equipment_name
    FROM claims c
    LEFT JOIN equipment e ON e.equipment_id = c.equipment_id
    WHERE c.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED', 'CANCELLED')
    ORDER BY c.created_at DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_overdue_work_orders(limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.predictive_outcome,
        wo.predictive_outcome_notes,
        e.asset_code,
        e.name AS equipment_name
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.due_date IS NOT NULL
      AND wo.due_date < NOW()
      AND wo.status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED', 'VALIDATED')
    ORDER BY wo.due_date ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_blocked_tasks(limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.blocked_reason,
        t.failure_reason,
        t.started_at,
        t.completed_at,
        t.due_date
    FROM tasks t
    WHERE t.status = 'BLOCKED'
       OR t.blocked_reason IS NOT NULL
       OR t.failure_reason IS NOT NULL
    ORDER BY t.due_date ASC NULLS LAST, t.task_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_tasks_by_technician(user_id: int, limit: int = 30):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        t.title,
        t.status,
        t.priority,
        t.started_at,
        t.completed_at,
        t.due_date,
        wo.assigned_to_user_id
    FROM tasks t
    JOIN work_orders wo ON wo.wo_id = t.wo_id
    WHERE wo.assigned_to_user_id = %s
    ORDER BY t.due_date ASC NULLS LAST, t.task_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [user_id, limit])


def generic_list_low_stock_parts(limit: int = 50):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        part_id,
        ('spare_parts_' || part_id) AS source_id,
        sku,
        name,
        category,
        location,
        supplier,
        quantity_in_stock,
        min_stock_level,
        unit_cost,
        expiry_date
    FROM spare_parts
    WHERE quantity_in_stock < min_stock_level
    ORDER BY quantity_in_stock ASC, min_stock_level DESC, sku ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_out_of_stock_parts(limit: int = 50):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        part_id,
        ('spare_parts_' || part_id) AS source_id,
        sku,
        name,
        category,
        location,
        supplier,
        quantity_in_stock,
        min_stock_level,
        unit_cost
    FROM spare_parts
    WHERE quantity_in_stock <= 0
    ORDER BY sku ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_parts_near_expiry(days: int = 90, limit: int = 50):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        part_id,
        ('spare_parts_' || part_id) AS source_id,
        sku,
        name,
        category,
        location,
        supplier,
        quantity_in_stock,
        expiry_date
    FROM spare_parts
    WHERE expiry_date IS NOT NULL
      AND expiry_date <= CURRENT_DATE + (%s || ' days')::interval
    ORDER BY expiry_date ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [days, limit])


def generic_list_work_orders_blocked_by_parts(limit: int = 50):
    limit = clamp_limit(limit)

    sql = """
    SELECT DISTINCT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.title,
        wo.status,
        wo.priority,
        wo.predictive_outcome,
        wo.predictive_outcome_notes,
        t.task_id,
        t.blocked_reason,
        e.asset_code,
        e.name AS equipment_name
    FROM work_orders wo
    LEFT JOIN tasks t ON t.wo_id = wo.wo_id
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.predictive_outcome = 'PART_SHORTAGE'
       OR LOWER(COALESCE(t.blocked_reason, '')) LIKE '%%stock%%'
       OR LOWER(COALESCE(t.blocked_reason, '')) LIKE '%%spare%%'
       OR LOWER(COALESCE(t.blocked_reason, '')) LIKE '%%part%%'
       OR LOWER(COALESCE(t.failure_reason, '')) LIKE '%%stock%%'
       OR LOWER(COALESCE(t.failure_reason, '')) LIKE '%%spare%%'
       OR LOWER(COALESCE(t.failure_reason, '')) LIKE '%%part%%'
    ORDER BY wo.priority ASC, wo.updated_at DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_list_actual_cost_exceeded_estimate(limit: int = 50):
    limit = clamp_limit(limit)

    sql = """
    SELECT
        wo_id,
        ('work_orders_' || wo_id) AS source_id,
        title,
        status,
        priority,
        estimated_cost,
        actual_cost,
        ROUND((actual_cost - estimated_cost)::numeric, 2) AS cost_overrun
    FROM work_orders
    WHERE actual_cost IS NOT NULL
      AND estimated_cost IS NOT NULL
      AND actual_cost > estimated_cost
    ORDER BY cost_overrun DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


# ============================================================
# SQL_TOP_N / health / planning
# ============================================================

def generic_top_equipment_by_work_orders(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        e.criticality,
        COUNT(wo.wo_id) AS work_order_count
    FROM equipment e
    JOIN work_orders wo ON wo.equipment_id = e.equipment_id
    GROUP BY e.equipment_id, e.asset_code, e.name, e.category, e.classification, e.criticality
    ORDER BY work_order_count DESC, e.equipment_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_top_equipment_by_cost(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        COUNT(wo.wo_id) AS work_order_count,
        ROUND(SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) AS total_maintenance_cost
    FROM equipment e
    JOIN work_orders wo ON wo.equipment_id = e.equipment_id
    WHERE COALESCE(wo.actual_cost, wo.estimated_cost, 0) > 0
    GROUP BY e.equipment_id, e.asset_code, e.name, e.category, e.classification
    ORDER BY total_maintenance_cost DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_top_equipment_by_critical_work_orders(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        e.criticality,
        COUNT(wo.wo_id) AS critical_work_order_count
    FROM equipment e
    JOIN work_orders wo ON wo.equipment_id = e.equipment_id
    WHERE wo.priority IN ('CRITICAL', 'HIGH')
    GROUP BY e.equipment_id, e.asset_code, e.name, e.category, e.classification, e.criticality
    ORDER BY critical_work_order_count DESC, e.equipment_id ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_equipment_repeated_failures(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        e.criticality,
        COUNT(wo.wo_id) AS failure_related_work_orders,
        COUNT(c.claim_id) AS related_claims
    FROM equipment e
    LEFT JOIN work_orders wo ON wo.equipment_id = e.equipment_id
        AND (
            wo.priority IN ('CRITICAL', 'HIGH')
            OR wo.predictive_outcome IN ('FAILURE_RISK', 'PART_SHORTAGE', 'SLA_RISK')
        )
    LEFT JOIN claims c ON c.equipment_id = e.equipment_id
    GROUP BY e.equipment_id, e.asset_code, e.name, e.category, e.classification, e.criticality
    HAVING COUNT(wo.wo_id) > 0 OR COUNT(c.claim_id) > 0
    ORDER BY failure_related_work_orders DESC, related_claims DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_equipment_replacement_candidates(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        e.criticality,
        e.purchase_date,
        e.warranty_end_date,
        COUNT(DISTINCT c.claim_id) AS claim_count,
        COUNT(DISTINCT wo.wo_id) AS work_order_count,
        COUNT(DISTINCT CASE WHEN wo.priority IN ('CRITICAL', 'HIGH') THEN wo.wo_id END) AS critical_work_order_count,
        ROUND(SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) AS total_maintenance_cost
    FROM equipment e
    LEFT JOIN claims c ON c.equipment_id = e.equipment_id
    LEFT JOIN work_orders wo ON wo.equipment_id = e.equipment_id
    GROUP BY e.equipment_id, e.asset_code, e.name, e.category, e.classification, e.criticality, e.purchase_date, e.warranty_end_date
    ORDER BY
        critical_work_order_count DESC,
        total_maintenance_cost DESC NULLS LAST,
        claim_count DESC,
        work_order_count DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_top_used_spare_parts(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        sp.part_id,
        ('spare_parts_' || sp.part_id) AS source_id,
        sp.sku,
        sp.name,
        sp.category,
        sp.supplier,
        COUNT(pu.usage_id) AS usage_count,
        COALESCE(SUM(pu.quantity_used), 0) AS total_quantity_used
    FROM spare_parts sp
    JOIN part_usage pu ON pu.part_id = sp.part_id
    GROUP BY sp.part_id, sp.sku, sp.name, sp.category, sp.supplier
    ORDER BY total_quantity_used DESC, usage_count DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_top_expensive_spare_parts(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        part_id,
        ('spare_parts_' || part_id) AS source_id,
        sku,
        name,
        category,
        supplier,
        quantity_in_stock,
        min_stock_level,
        unit_cost
    FROM spare_parts
    WHERE unit_cost IS NOT NULL
    ORDER BY unit_cost DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_supplier_by_part_usage(limit: int = 10):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        sp.supplier,
        COUNT(pu.usage_id) AS usage_event_count,
        COALESCE(SUM(pu.quantity_used), 0) AS total_quantity_used
    FROM part_usage pu
    JOIN spare_parts sp ON sp.part_id = pu.part_id
    GROUP BY sp.supplier
    ORDER BY total_quantity_used DESC, usage_event_count DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


def generic_stock_value_by_category(limit: int = 20):
    limit = clamp_limit(limit, 50)

    sql = """
    SELECT
        category,
        COUNT(part_id) AS spare_part_count,
        ROUND(SUM(quantity_in_stock * unit_cost)::numeric, 2) AS stock_value
    FROM spare_parts
    WHERE unit_cost IS NOT NULL
    GROUP BY category
    ORDER BY stock_value DESC NULLS LAST
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])


# ============================================================
# SQL_TIME_SERIES
# ============================================================

def generic_monthly_work_order_trend(months: int = 12):
    months = clamp_months(months)

    sql = """
    SELECT
        DATE_TRUNC('month', created_at)::date AS month,
        COUNT(*) AS work_order_count
    FROM work_orders
    WHERE created_at >= DATE_TRUNC('month', NOW()) - (%s || ' months')::interval
    GROUP BY month
    ORDER BY month ASC;
    """
    return safe_generic_query(sql, [months])


def generic_monthly_claim_trend(months: int = 12):
    months = clamp_months(months)

    sql = """
    SELECT
        DATE_TRUNC('month', created_at)::date AS month,
        COUNT(*) AS claim_count
    FROM claims
    WHERE created_at >= DATE_TRUNC('month', NOW()) - (%s || ' months')::interval
    GROUP BY month
    ORDER BY month ASC;
    """
    return safe_generic_query(sql, [months])


def generic_monthly_maintenance_cost_trend(months: int = 12):
    months = clamp_months(months)

    sql = """
    SELECT
        DATE_TRUNC('month', created_at)::date AS month,
        COUNT(*) AS work_order_count,
        ROUND(SUM(COALESCE(actual_cost, estimated_cost, 0))::numeric, 2) AS total_maintenance_cost
    FROM work_orders
    WHERE created_at >= DATE_TRUNC('month', NOW()) - (%s || ' months')::interval
    GROUP BY month
    ORDER BY month ASC;
    """
    return safe_generic_query(sql, [months])


def generic_monthly_maintenance_cost_by_category(months: int = 12):
    months = clamp_months(months)

    sql = """
    SELECT
        DATE_TRUNC('month', wo.created_at)::date AS month,
        e.category AS equipment_category,
        ROUND(SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) AS total_maintenance_cost
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.created_at >= DATE_TRUNC('month', NOW()) - (%s || ' months')::interval
    GROUP BY month, e.category
    ORDER BY month ASC, total_maintenance_cost DESC NULLS LAST;
    """
    return safe_generic_query(sql, [months])


def generic_monthly_part_usage_trend(months: int = 12):
    months = clamp_months(months)

    sql = """
    SELECT
        DATE_TRUNC('month', used_at)::date AS month,
        COUNT(*) AS usage_event_count,
        COALESCE(SUM(quantity_used), 0) AS total_quantity_used
    FROM part_usage
    WHERE used_at >= DATE_TRUNC('month', NOW()) - (%s || ' months')::interval
    GROUP BY month
    ORDER BY month ASC;
    """
    return safe_generic_query(sql, [months])


# ============================================================
# RECORD_LOOKUP
# ============================================================

def lookup_work_order_by_id(record_id: int):
    sql = """
    SELECT
        wo.wo_id,
        ('work_orders_' || wo.wo_id) AS source_id,
        wo.claim_id,
        wo.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
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
        wo.predictive_outcome_notes,
        wo.actual_cost,
        wo.estimated_cost
    FROM work_orders wo
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE wo.wo_id = %s
    LIMIT 1;
    """
    return safe_generic_query(sql, [record_id])


def lookup_claim_by_id(record_id: int):
    sql = """
    SELECT
        c.claim_id,
        ('claims_' || c.claim_id) AS source_id,
        c.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
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
    WHERE c.claim_id = %s
    LIMIT 1;
    """
    return safe_generic_query(sql, [record_id])


def lookup_equipment_by_id(record_id: int):
    sql = """
    SELECT
        e.equipment_id,
        ('equipment_' || e.equipment_id) AS source_id,
        e.asset_code,
        e.name AS equipment_name,
        e.category,
        e.classification,
        e.model,
        e.criticality,
        e.location,
        e.status,
        e.department_id,
        e.purchase_date,
        e.commissioning_date,
        e.warranty_end_date
    FROM equipment e
    WHERE e.equipment_id = %s
    LIMIT 1;
    """
    return safe_generic_query(sql, [record_id])


def lookup_task_by_id(record_id: int):
    sql = """
    SELECT
        t.task_id,
        ('tasks_' || t.task_id) AS source_id,
        t.wo_id,
        wo.equipment_id,
        e.asset_code,
        e.name AS equipment_name,
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
    LEFT JOIN work_orders wo ON wo.wo_id = t.wo_id
    LEFT JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE t.task_id = %s
    LIMIT 1;
    """
    return safe_generic_query(sql, [record_id])


def lookup_spare_part_by_id(record_id: int):
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
    WHERE sp.part_id = %s
    LIMIT 1;
    """
    return safe_generic_query(sql, [record_id])


def lookup_spare_part_by_sku(sku: str):
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
    WHERE UPPER(sp.sku) = UPPER(%s)
    LIMIT 1;
    """
    return safe_generic_query(sql, [sku])


# ============================================================
# NEW Analytics & Complex Joins
# ============================================================

def generic_meter_readings_by_equipment(limit: int = 50):
    limit = clamp_limit(limit)
    sql = """
    SELECT 
        mr.id,
        mr.equipment_id,
        e.asset_code,
        e.name as equipment_name,
        mr.meter_id,
        m.name as meter_name,
        mr.reading_value,
        mr.reading_date,
        mr.created_at
    FROM meter_readings mr
    JOIN equipment e ON e.equipment_id = mr.equipment_id
    JOIN meters m ON m.id = mr.meter_id
    ORDER BY mr.reading_date DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])

def generic_upcoming_maintenance_plans(limit: int = 30):
    limit = clamp_limit(limit)
    sql = """
    SELECT 
        mp.id,
        mp.name as plan_name,
        mp.equipment_id,
        e.asset_code,
        e.name as equipment_name,
        mp.frequency_value,
        mp.frequency_unit,
        mp.next_due_date,
        mp.last_completed_date,
        mp.status
    FROM maintenance_plans mp
    JOIN equipment e ON e.equipment_id = mp.equipment_id
    WHERE mp.status = 'ACTIVE'
    ORDER BY mp.next_due_date ASC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])

def generic_inventory_valuation(limit: int = 20):
    limit = clamp_limit(limit)
    sql = """
    SELECT 
        category,
        COUNT(*) as items_count,
        SUM(quantity_in_stock) as total_quantity,
        ROUND(SUM(quantity_in_stock * unit_cost)::numeric, 2) as category_value
    FROM spare_parts
    WHERE is_archived = false
    GROUP BY category
    ORDER BY category_value DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])

def generic_department_cost_comparison(limit: int = 10, range_key: str = None):
    limit = clamp_limit(limit)
    if range_key:
        start_expr, end_expr, params = get_date_range_sql(range_key)
        date_filter = f"AND wo.created_at >= {start_expr} AND wo.created_at < {end_expr}"
    else:
        date_filter = ""
        params = []

    sql = f"""
    SELECT 
        e.department_id,
        COUNT(wo.wo_id) as work_order_count,
        ROUND(SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) as total_cost,
        ROUND(AVG(COALESCE(wo.actual_cost, wo.estimated_cost, 0))::numeric, 2) as avg_cost_per_wo
    FROM work_orders wo
    JOIN equipment e ON e.equipment_id = wo.equipment_id
    WHERE e.department_id IS NOT NULL {date_filter}
    GROUP BY e.department_id
    ORDER BY total_cost DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, params + [limit])

def generic_highest_cost_departments_causes(limit: int = 30):
    limit = clamp_limit(limit)
    sql = """
    WITH TopDepartments AS (
        SELECT e.department_id
        FROM work_orders wo
        JOIN equipment e ON e.equipment_id = wo.equipment_id
        WHERE e.department_id IS NOT NULL
        GROUP BY e.department_id
        ORDER BY SUM(COALESCE(wo.actual_cost, wo.estimated_cost, 0)) DESC
        LIMIT 3
    )
    SELECT 
        wo.wo_id,
        e.department_id,
        wo.actual_cost,
        wo.estimated_cost
    FROM work_orders wo
    JOIN equipment e ON e.equipment_id = wo.equipment_id
    JOIN TopDepartments td ON e.department_id = td.department_id
    WHERE COALESCE(wo.actual_cost, wo.estimated_cost, 0) > 0
    ORDER BY COALESCE(wo.actual_cost, wo.estimated_cost, 0) DESC
    LIMIT %s;
    """
    return safe_generic_query(sql, [limit])