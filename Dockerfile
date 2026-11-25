FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU and Pillow
RUN pip install --no-cache-dir \
    torch==2.2.2+cpu \
    torchvision==0.17.2+cpu \
    pillow \
    numpy \
    --index-url https://download.pytorch.org/whl/cpu

# Copy application files
COPY ml/ /app/ml/
COPY public/models/ /app/public/models/

ENV PORT=8000
EXPOSE 8000

CMD ["python", "ml/server/local_ai_server.py"]

