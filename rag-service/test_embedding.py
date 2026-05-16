import requests

text = "Pump seal leaking. Work order delayed because spare part is unavailable."

response = requests.post(
    "http://localhost:11434/api/embeddings",
    json={
        "model": "nomic-embed-text",
        "prompt": text
    },
    timeout=120
)

response.raise_for_status()

embedding = response.json()["embedding"]

print("Embedding length:", len(embedding))
print("First 10 numbers:", embedding[:10])