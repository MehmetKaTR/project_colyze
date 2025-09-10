# Node + Python image
FROM node:18-bullseye

WORKDIR /app

# Python ve sistem bağımlılıkları + ODBC
RUN apt-get update -y && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    git \
    libgl1 \
    libglib2.0-0 \
    unixodbc \
    unixodbc-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Backend
COPY flask-server/ ./flask-server/
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt
RUN pip3 install pyodbc

# Frontend
COPY colyze/ ./colyze/
WORKDIR /app/colyze
RUN npm install
RUN npm install -g concurrently

WORKDIR /app

CMD ["concurrently", "\"cd flask-server && python3 app.py\"", "\"cd colyze && npm run dev\""]
