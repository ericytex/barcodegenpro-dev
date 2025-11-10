#!/bin/bash
# Quick fix: Sync backend/services directory to VPS

set -e

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Fixing VPS: Syncing backend/services directory..."
echo ""

# Sync the services directory
rsync -avz --progress \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  "$LOCAL_DIR/backend/services/" \
  "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/services/"

echo ""
echo "✅ Services directory synced!"
echo ""
echo "Restarting backend container..."
ssh "${VPS_USER}@${VPS_IP}" << EOF
cd ${VPS_PATH}
docker compose restart backend
sleep 3
docker compose logs backend --tail=20
EOF

echo ""
echo "✅ Fix complete! Check logs above for any errors."

