#!/bin/bash

# Rsync script to copy files to remote server (excluding cache and build artifacts)
# Usage: ./rsync-to-remote.sh [remote_user@remote_host:remote_path]

REMOTE="${1:-deployer@194.163.134.129:~/barcodegenpro-dev}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Syncing to: $REMOTE"
echo "From: $LOCAL_DIR"
echo ""

rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='build/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='.venv/' \
  --exclude='venv/' \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*' \
  --exclude='*.log' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='.vscode/' \
  --exclude='.idea/' \
  --exclude='coverage/' \
  --exclude='.nyc_output/' \
  --exclude='uploads/' \
  --exclude='downloads/' \
  --exclude='logs/' \
  --exclude='archives/' \
  --exclude='backend/data/*.db*' \
  --exclude='backend/logs/' \
  --exclude='backend/archives/' \
  --exclude='backend/downloads/' \
  --exclude='backend/uploads/' \
  --exclude='frontend/node_modules/' \
  --exclude='frontend/dist/' \
  --exclude='frontend/.vite/' \
  --exclude='frontend/.bun/' \
  --exclude='*.tar.gz' \
  --exclude='*.zip' \
  --exclude='barcode_service.py' \
  --delete \
  "$LOCAL_DIR/" "$REMOTE/"

echo ""
echo "✅ Sync complete!"
echo ""
echo "On remote server, run:"
echo "  cd ~/barcodegenpro-dev"
echo "  docker compose build"
echo "  docker compose up -d"

