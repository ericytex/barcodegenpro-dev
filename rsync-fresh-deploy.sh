#!/bin/bash
# Fresh deployment script - syncs all files with --delete (removes existing files on VPS)
# No cache files included
# Usage: ./rsync-fresh-deploy.sh

VPS_IP="194.163.134.129"
VPS_USER="deployer"
REMOTE_PATH="/home/deployer/barcodegenpro-dev"
LOCAL_DIR="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev"

echo "🚀 Fresh Deployment - Syncing to VPS"
echo "📍 Remote: ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}"
echo "📍 Local: ${LOCAL_DIR}"
echo ""
echo "⚠️  WARNING: This will DELETE the existing directory on VPS before syncing"
echo "⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

cd "$LOCAL_DIR"

echo ""
echo "🗑️  Deleting existing directory on VPS: ${REMOTE_PATH}"
ssh ${VPS_USER}@${VPS_IP} "rm -rf ${REMOTE_PATH} && echo '✅ Directory deleted' || echo '⚠️  Directory may not exist (this is OK)'"

echo ""
echo "📁 Creating fresh directory on VPS..."
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${REMOTE_PATH} && echo '✅ Directory created'"

echo ""
echo "🔄 Starting rsync with --delete (removes existing files on VPS)..."
echo "💡 Note: Database files are excluded. Use ./rsync-db-only.sh to transfer database separately."
echo ""

rsync -avz --progress --delete \
  --no-owner \
  --no-group \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='build/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='*.pyd' \
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
  --exclude='backend/data/*.db*' \
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
  --exclude='.pytest_cache' \
  --exclude='.mypy_cache' \
  --exclude='.ruff_cache' \
  --exclude='*.egg-info' \
  "$LOCAL_DIR/" \
  "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Sync complete!"
    echo ""
    echo "📋 Next steps on VPS:"
    echo "   1. SSH into server: ssh ${VPS_USER}@${VPS_IP}"
    echo "   2. Navigate to: cd ${REMOTE_PATH}"
    echo "   3. Stop any running containers: docker compose down"
    echo "   4. Rebuild and restart: docker compose up -d --build"
    echo "   5. Check logs: docker logs -f barcode-v2-backend"
else
    echo ""
    echo "❌ Sync failed! Check SSH credentials and network connection."
    exit 1
fi

