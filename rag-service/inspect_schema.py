import psycopg2
from db_config import DB_CONFIG

TABLES_TO_CHECK = [
    "claims",
    "work_orders",
    "tasks",
    "sub_tasks",
    "equipment",
    "maintenance_plans",
    "regulatory_plans",
    "spare_parts",
    "ai_priority_suggestions",
]

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

for table in TABLES_TO_CHECK:
    print("\n" + "=" * 80)
    print(f"TABLE: {table}")
    print("=" * 80)

    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = %s
        ORDER BY ordinal_position;
    """, (table,))

    columns = cur.fetchall()

    if not columns:
        print("Table not found or no columns.")
    else:
        for column_name, data_type in columns:
            print(f"{column_name:35} {data_type}")

cur.close()
conn.close()