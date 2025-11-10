#!/bin/bash
rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude='node_modules/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='venv/' \
  --exclude='.git/' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='backend/logs/*.log' \
  --exclude='backend/downloads/barcodes/*.png' \
  --exclude='backend/downloads/pdfs/*.pdf' \
  --exclude='backend/uploads/*' \
  --exclude='backend/archives/*' \
  --exclude='frontend/dist/' \
  --exclude='frontend/.vite/' \
  --exclude='barcode_service.py' \
  ./ \
  deployer@194.163.134.129:~/barcodegenpro-dev/ && \
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && chown -R deployer:deployer ~/barcodegenpro-dev 2>/dev/null || true && find ~/barcodegenpro-dev -type f -exec chmod 644 {} \; 2>/dev/null || true && find ~/barcodegenpro-dev -type d -exec chmod 755 {} \; 2>/dev/null || true && find ~/barcodegenpro-dev -name '*.sh' -exec chmod +x {} \; 2>/dev/null || true && docker compose down && docker compose build --no-cache && docker compose up -d"
