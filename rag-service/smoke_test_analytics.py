import sys
import os
sys.path.append('.')

from query_planner import plan_generic_question, infer_range_key
from router import classify_question, detect_sql_intent
from datetime import datetime

def test_intent(q):
    print(f"\nTesting: '{q}'")
    plan = plan_generic_question(q)
    if plan:
        print(f"PLAN: {plan['plan']} | INTENT: {plan.get('sql_intent')} | RANGE: {plan.get('range_key')}")
    else:
        # Try router
        intent_info = classify_question(q)
        print(f"ROUTER: {intent_info['route']} | INTENT: {intent_info['intent']} (Confidence: {intent_info['confidence']:.2f})")

def test_dates():
    print("\n--- Date Range Parsing ---")
    queries = [
        "between March and April",
        "since January 2024",
        "last 30 days",
        "this month"
    ]
    for q in queries:
        range_val = infer_range_key(q)
        print(f"Query: '{q}' -> Result: {range_val}")

if __name__ == "__main__":
    print("=== CMMS Analytics Smoke Test ===")
    
    # Test new modules
    test_intent("show meter history for equipment 101")
    test_intent("list upcoming maintenance plans")
    test_intent("what is the total value of our inventory")
    
    # Test complex queries
    test_intent("compare Radiology vs Laboratory maintenance costs")
    test_intent("which department has the highest maintenance spending this year")
    
    # Test dates
    test_dates()
