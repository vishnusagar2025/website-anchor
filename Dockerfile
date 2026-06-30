FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source files
COPY main.py .
COPY ai_service.py .
COPY chat_service.py .
COPY ml_pipeline.py .
COPY runbook_generator.py .
COPY code_analyzer.py .
COPY github_service.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
