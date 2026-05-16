FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn

# Copy app code
COPY . .

# Expose port
EXPOSE 8000

# Start app
CMD ["uvicorn", "rag_api_universal:app", "--host", "0.0.0.0", "--port", "8000"]
