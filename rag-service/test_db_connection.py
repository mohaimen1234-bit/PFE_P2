import psycopg2
from db_config import DB_CONFIG

try:
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)

    tables = cur.fetchall()

    print("Connected to database successfully.")
    print("Tables found:")

    for table in tables:
        print("-", table[0])

    cur.close()
    conn.close()

except Exception as e:
    print("Database connection failed:")
    print(e)