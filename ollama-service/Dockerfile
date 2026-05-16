FROM ollama/ollama:latest

# We need to start the server in the background, wait for it to be ready, 
# pull the models, and then shut it down so the build can finish.
RUN ollama serve & \
    sleep 5 && \
    ollama pull qwen3:1.7b && \
    ollama pull nomic-embed-text

# Expose the default Ollama port
EXPOSE 11434

# The entrypoint remains the same as the base image (starting the server)
