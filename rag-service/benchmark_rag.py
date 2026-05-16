import requests
import time
import csv
import os

MODELS = ["phi4-mini:3.8b", "qwen3:1.7b"]
ENDPOINTS = [
    {"name": "Current_Prompts", "url": "http://localhost:8002/ask"},
    {"name": "Universal_Prompt", "url": "http://localhost:8003/ask"},
]

QUESTIONS = [
    {"type": "RAG_HISTORY", "question": "what is the maintenance history of the CT scanner 007?"},
    {"type": "RAG_EXPLAIN", "question": "Explain why the CT scanner 007 has so many claims"},
    {"type": "RAG_EXPLAIN_2", "question": "why is the pump leaking?"},
    {"type": "HYBRID_OVERDUE", "question": "Why are there so many overdue work orders?"},
    {"type": "HYBRID_TOP_EQUIP", "question": "Why do the top 3 equipment have the most claims?"},
    {"type": "HYBRID_LOW_STOCK", "question": "explain the impact of low stock on maintenance tasks"},
    {"type": "SQL_DATE_FILTER", "question": "how many workorders happened today"},
    {"type": "SQL_COUNT", "question": "how many open work orders are there"},
    {"type": "SQL_AGGREGATE", "question": "what is the total maintenance cost this month"},
    {"type": "SQL_LIST", "question": "list all critical work orders"}
]

def run_benchmark():
    results = []

    for endpoint in ENDPOINTS:
        print(f"--- Testing Endpoint: {endpoint['name']} ---")
        for model in MODELS:
            print(f"  Model: {model}")
            for q in QUESTIONS:
                print(f"    Q: {q['question']}")
                
                payload = {
                    "question": q["question"],
                    "model": model,
                    "debug": True
                }
                
                try:
                    start_time = time.time()
                    resp = requests.post(endpoint["url"], json=payload, timeout=60)
                    resp.raise_for_status()
                    latency = time.time() - start_time
                    
                    data = resp.json()
                    
                    results.append({
                        "Endpoint": endpoint["name"],
                        "Model": model,
                        "Question_Type": q["type"],
                        "Question": q["question"],
                        "Route": data.get("route", "UNKNOWN"),
                        "SQL_Intent": data.get("sql_intent", "none"),
                        "Latency_sec": round(latency, 2),
                        "Answer": data.get("answer", "").replace("\n", " ").strip()
                    })
                except Exception as e:
                    print(f"      Error: {e}")
                    results.append({
                        "Endpoint": endpoint["name"],
                        "Model": model,
                        "Question_Type": q["type"],
                        "Question": q["question"],
                        "Route": "ERROR",
                        "SQL_Intent": "ERROR",
                        "Latency_sec": 0,
                        "Answer": f"Error: {e}"
                    })

    # Write to CSV
    output_path = r"C:\Users\ASUS\.gemini\antigravity\brain\5a82ed90-a13b-4afe-ad71-768212433b20\benchmark_results.csv"
    
    headers = ["Endpoint", "Model", "Question_Type", "Question", "Route", "SQL_Intent", "Latency_sec", "Answer"]
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(results)
        
    print(f"Results written to {output_path}")

if __name__ == "__main__":
    run_benchmark()
