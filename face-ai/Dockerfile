FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY download_models.py .
RUN python3 download_models.py

COPY app.py .

EXPOSE 5005

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5005", "--workers", "1"]
