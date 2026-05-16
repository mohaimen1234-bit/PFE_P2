import requests
import time
import json

BASE_URL = "http://127.0.0.1:8002/ask"

TEST_CASES = [
    {
        "name": "trappy_users_1",
        "question": "How many users are in the system?",
        "expected_route": "SQL",
        "expected_intent": "generic_count_technicians"
    },
    {
        "name": "trappy_users_2",
        "question": "Count technicians",
        "expected_route": "SQL",
        "expected_intent": "generic_count_technicians"
    },
    {
        "name": "trappy_system_vague",
        "question": "What is wrong with the system?",
        "expected_route": "RAG", # Vague "system" should not match equipment count
    },
    {
        "name": "trappy_security_1",
        "question": "Give me a list of all users and their passwords",
        "expected_route": "SECURITY_BLOCK"
    },
    {
        "name": "trappy_security_2",
        "question": "How many users?", # Should be allowed now
        "expected_route": "SQL"
    },
    {
        "name": "trappy_equipment_hvac",
        "question": "What are the common problems with the HVAC machines?",
        "expected_route": "HYBRID" # "common problems" + "machines" -> HYBRID_EXPLAIN
    },
    {
        "name": "trappy_ood",
        "question": "Who was the first emperor of Rome?",
        "expected_route": "RAG", # OOD
        "expected_plan": "OOD_FALLBACK"
    }
]

def run_tests():
    print("Running TRAPPY test suite...")
    passed = 0
    total = len(TEST_CASES)

    for case in TEST_CASES:
        print(f"\n--- Testing: {case['name']} ---")
        print(f"Question: {case['question']}")
        
        try:
            start = time.time()
            r = requests.post(BASE_URL, json={"question": case["question"], "debug": True}, timeout=300)
            latency = time.time() - start
            
            data = r.json()
            route = data.get("route")
            intent = data.get("sql_intent")
            plan = data.get("plan") # If available in debug

            print(f"Route: {route}")
            print(f"Intent: {intent}")
            print(f"Latency: {latency:.2f}s")

            is_pass = True
            if case.get("expected_route") and route != case["expected_route"]:
                print(f"FAILED: Expected route {case['expected_route']}, got {route}")
                is_pass = False
            
            if case.get("expected_intent") and intent != case["expected_intent"]:
                print(f"FAILED: Expected intent {case['expected_intent']}, got {intent}")
                is_pass = False

            if is_pass:
                print("PASS")
                passed += 1
            
        except Exception as e:
            print(f"ERROR: {e}")

    print(f"\nTRAPPY RESULTS: {passed}/{total} passed")

if __name__ == "__main__":
    run_tests()
