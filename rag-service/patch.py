import sys

with open("rag_api.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.startswith("def format_sql_answer("):
        start_idx = i
    if start_idx != -1 and line.startswith("def dict_list_to_markdown("):
        end_idx = i - 3
        break

if start_idx != -1 and end_idx != -1:
    new_func = """def format_sql_answer(
    question: str,
    sql_intent: str,
    sql_result: List[Dict[str, Any]],
) -> str:
    fr = is_french_question(question)

    if not sql_result:
        if fr:
            return "Aucun enregistrement correspondant n’a été trouvé dans la base de données."
        return "No matching records were found in the database."

    if sql_intent == "department_comparison":
        return format_sql_comparison_answer(question, sql_result)

    if sql_intent in ["count_open_work_orders", "count_open_claims"]:
        value = list(sql_result[0].values())[0] if sql_result else 0
        if fr:
            return f"Le résultat est {value}. Réponse basée sur la base de données."
        return f"The result is {value}. Answer based on the database query result."

    prefix = "Réponse basée sur le résultat de la requête de base de données :\\n\\n" if fr else "Answer based on the database query result:\\n\\n"
    return prefix + dict_list_to_markdown(sql_result[:40])

"""
    lines = lines[:start_idx] + [new_func] + lines[end_idx:]
    with open("rag_api.py", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Updated format_sql_answer successfully.")
