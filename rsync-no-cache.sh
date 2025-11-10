#!/bin/bash
# RSYNC command excluding all cache files and directories
# Update VPS_IP and VPS_USER as needed

VPS_IP="194.163.134.129"
VPS_USER="deployer"  # Change to your VPS user if different

cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

echo "🔄 Syncing backend files (excluding all cache)..."

rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='*.pyd' \
  --exclude='.git' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='archives/*' \
  --exclude='node_modules' \
  --exclude='.pytest_cache' \
  --exclude='.mypy_cache' \
  --exclude='.ruff_cache' \
  --exclude='*.egg-info' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.DS_Store' \
  --exclude='*.swp' \
  --exclude='*.swo' \
  --exclude='*~' \
  backend/ \
  ${VPS_USER}@${VPS_IP}:/home/deployer/barcodegenpro-dev/backend/

echo "✅ Sync complete!"

