import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "qwen3:4b",
        "prompt": "Explain what a maintenance claim is in one sentence.",
        "stream": False,
        "options": {
            "temperature": 0
        }
    },
    timeout=120
)

response.raise_for_status()
print(response.json()["response"])