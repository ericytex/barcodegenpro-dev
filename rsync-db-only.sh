#!/bin/bash
# Quick script to transfer only the database file to VPS
# Usage: ./rsync-db-only.sh

VPS_IP="194.163.134.129"
VPS_USER="deployer"
REMOTE_PATH="/home/deployer/barcodegenpro-dev"
LOCAL_DB="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db"

echo "📦 Transferring database to VPS..."
echo "📍 Local: ${LOCAL_DB}"
echo "📍 Remote: ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/backend/data/barcode_generator.db"
echo ""

# Check if local database exists
if [ ! -f "$LOCAL_DB" ]; then
    echo "❌ Error: Database file not found at ${LOCAL_DB}"
    exit 1
fi

# Ensure remote directory exists
echo "📁 Ensuring remote directory exists..."
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${REMOTE_PATH}/backend/data"

# Transfer the database file
echo "🔄 Transferring database..."
rsync -avz --progress \
  --no-owner \
  --no-group \
  "$LOCAL_DB" \
  "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/backend/data/barcode_generator.db"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database transfer complete!"
    echo ""
    echo "📋 Database is now at: ${REMOTE_PATH}/backend/data/barcode_generator.db"
    echo ""
    echo "💡 To restart containers with new database:"
    echo "   ssh ${VPS_USER}@${VPS_IP}"
    echo "   cd ${REMOTE_PATH}"
    echo "   docker compose restart backend"
else
    echo ""
    echo "❌ Database transfer failed! Check SSH credentials and network connection."
    exit 1
fi

