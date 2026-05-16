import requests
import time
import csv

MODELS = ["qwen3:1.7b", "phi4-mini:3.8b"]
ENDPOINT = "http://localhost:8002/ask"

QUESTIONS = [
    # RAG
    {"category": "RAG_HISTORY", "question": "What is the maintenance history of ASSET-04-0008?"},
    
    # SQL
    {"category": "SQL_COUNT_WO", "question": "How many work orders are there in total?"},
    {"category": "SQL_TOP_EQUIP", "question": "Which equipment has the most work orders?"},
    
    # HYBRID
    {"category": "HYBRID_TOP_CLAIMS", "question": "Why do the top 5 equipment have the most claims?"},
    {"category": "HYBRID_COSTS", "question": "Why do the highest cost departments spend so much?"}
]

def run_benchmark():
    results = []

    print(f"Starting massive benchmark on endpoint: {ENDPOINT}")
    
    for model in MODELS:
        print(f"\n========================================")
        print(f"Running tests for model: {model}")
        print(f"========================================")
        
        for q in QUESTIONS:
            print(f"  -> Asking [{q['category']}]: {q['question']}")
            
            payload = {
                "question": q["question"],
                "model": model,
                "debug": True
            }
            
            try:
                start_time = time.time()
                resp = requests.post(ENDPOINT, json=payload, timeout=120)
                resp.raise_for_status()
                latency = time.time() - start_time
                
                data = resp.json()
                
                # Check basic 'accuracy' by verifying it chose the expected route/intent
                route = data.get("route", "UNKNOWN")
                sql_intent = data.get("sql_intent", "none")
                
                is_success = "error" not in data.get("answer", "").lower() and route != "ERROR"
                
                results.append({
                    "Model": model,
                    "Category": q["category"],
                    "Question": q["question"],
                    "Route": route,
                    "SQL_Intent": sql_intent,
                    "Latency_sec": round(latency, 2),
                    "Success": is_success,
                    "Answer": data.get("answer", "").replace("\n", " ").strip()
                })
                print(f"     [+] Done in {latency:.2f}s | Route: {route}")
                
            except Exception as e:
                print(f"     [-] Error: {e}")
                results.append({
                    "Model": model,
                    "Category": q["category"],
                    "Question": q["question"],
                    "Route": "ERROR",
                    "SQL_Intent": "ERROR",
                    "Latency_sec": 0,
                    "Success": False,
                    "Answer": f"Error: {e}"
                })

    # Write to CSV
    output_path = r"C:\Users\ASUS\.gemini\antigravity\brain\6f482feb-d246-47eb-a96a-d93c3e3ee711\massive_benchmark_results.csv"
    
    headers = ["Model", "Category", "Question", "Route", "SQL_Intent", "Latency_sec", "Success", "Answer"]
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(results)
        
    print(f"\nResults written to {output_path}")

if __name__ == "__main__":
    run_benchmark()
