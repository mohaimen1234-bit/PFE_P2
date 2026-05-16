import subprocess
import sys
from sentence_transformers import SentenceTransformer


OLLAMA_EMBEDDINGS = [
    "nomic-embed-text",
    "bge-m3",
]

PYTHON_EMBEDDINGS = [
    "BAAI/bge-m3",
    "intfloat/multilingual-e5-large",
    "sentence-transformers/all-MiniLM-L6-v2",
]


def run_command(command):
    print()
    print("=" * 80)
    print("Running:", " ".join(command))
    print("=" * 80)

    result = subprocess.run(command)

    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(command)}")


def check_ollama():
    print()
    print("=" * 80)
    print("Checking Ollama")
    print("=" * 80)

    try:
        result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True,
            text=True,
            check=True,
        )
        print(result.stdout.strip())
    except Exception:
        print("ERROR: Ollama is not available.")
        print("Open Ollama or run: ollama serve")
        sys.exit(1)


def pull_ollama_embeddings():
    print()
    print("#" * 80)
    print("Pulling Ollama embedding models")
    print("#" * 80)

    for model in OLLAMA_EMBEDDINGS:
        run_command(["ollama", "pull", model])

    print()
    print("Installed Ollama models:")
    run_command(["ollama", "list"])


def download_python_embeddings():
    print()
    print("#" * 80)
    print("Downloading Python sentence-transformers embedding models")
    print("#" * 80)

    for model_name in PYTHON_EMBEDDINGS:
        print()
        print("=" * 80)
        print(f"Downloading/loading: {model_name}")
        print("=" * 80)

        model = SentenceTransformer(model_name)
        embedding = model.encode("Test maintenance record for embedding download.")

        print(f"Done: {model_name}")
        print(f"Embedding dimension: {len(embedding)}")


def main():
    print("Starting embedding model download setup...")

    check_ollama()
    pull_ollama_embeddings()
    download_python_embeddings()

    print()
    print("#" * 80)
    print("All embedding models downloaded successfully.")
    print("#" * 80)


if __name__ == "__main__":
    main()