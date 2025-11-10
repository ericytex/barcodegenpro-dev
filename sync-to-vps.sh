#!/bin/bash

# RSYNC script to sync all files to VPS
# Usage: ./sync-to-vps.sh

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"
LOCAL_PATH="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev"

echo "🔄 Syncing files to VPS..."
echo "   From: $LOCAL_PATH"
echo "   To:   $VPS_USER@$VPS_IP:$VPS_PATH"
echo ""

rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  --exclude 'backend/data' \
  --exclude 'backend/downloads/barcodes/*' \
  --exclude 'backend/downloads/pdfs/*' \
  --exclude 'backend/logs/*' \
  --exclude 'backend/archives/*' \
  --exclude 'backend/uploads/*' \
  --exclude 'frontend/dist' \
  --exclude 'frontend/.vite' \
  --exclude '*.db-shm' \
  --exclude '*.db-wal' \
  --exclude '*.log' \
  --exclude 'barcode_service.py' \
  "$LOCAL_PATH/" \
  "$VPS_USER@$VPS_IP:$VPS_PATH/"

if [ $? -eq 0 ]; then
  echo ""
  echo "🔧 Fixing permissions on VPS..."
  ssh "$VPS_USER@$VPS_IP" "cd $VPS_PATH && chown -R deployer:deployer $VPS_PATH 2>/dev/null || sudo chown -R deployer:deployer $VPS_PATH 2>/dev/null || true && find $VPS_PATH -type f -exec chmod 644 {} \; 2>/dev/null || true && find $VPS_PATH -type d -exec chmod 755 {} \; 2>/dev/null || true && find $VPS_PATH -name '*.sh' -exec chmod +x {} \; 2>/dev/null || true"
  echo ""
  echo "✅ Sync completed successfully!"
  echo ""
  echo "Next steps on VPS:"
  echo "  ssh $VPS_USER@$VPS_IP"
  echo "  cd $VPS_PATH"
  echo "  docker compose down"
  echo "  docker compose up -d --build"
else
  echo ""
  echo "❌ Sync failed. Please check the error messages above."
  exit 1
fi

