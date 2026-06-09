FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirement.txt .

RUN pip install --no-cache-dir -r requirement.txt

RUN python -c "import cv2"

RUN python -c "import easyocr; reader = easyocr.Reader(['en'])

COPY . .

EXPOSE 5005

CMD ["python", "Ai.py"]