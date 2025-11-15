#!/bin/bash
# Force transfer database - stops container, transfers DB, restarts
# Usage: ./force-transfer-db.sh

VPS_IP="194.163.134.129"
VPS_USER="deployer"
REMOTE_PATH="/home/deployer/barcodegenpro-dev"
LOCAL_DB="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db"

echo "🔄 Force Transfer Database to VPS"
echo "📍 Local: ${LOCAL_DB}"
echo "📍 Remote: ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/backend/data/barcode_generator.db"
echo ""

# Check if local database exists and has users
if [ ! -f "$LOCAL_DB" ]; then
    echo "❌ Error: Local database not found at ${LOCAL_DB}"
    exit 1
fi

USER_COUNT=$(sqlite3 "$LOCAL_DB" "SELECT COUNT(*) FROM users;" 2>/dev/null)
echo "📊 Local database has ${USER_COUNT} users"

if [ "$USER_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: Local database has 0 users. Are you sure you want to transfer this?"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🛑 Stopping backend container on VPS..."
ssh ${VPS_USER}@${VPS_IP} "cd ${REMOTE_PATH} && docker compose stop backend"

echo ""
echo "📦 Transferring database..."
rsync -avz --progress \
  --no-owner \
  --no-group \
  "$LOCAL_DB" \
  "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/backend/data/barcode_generator.db"

if [ $? -ne 0 ]; then
    echo "❌ Transfer failed!"
    exit 1
fi

echo ""
echo "🔧 Fixing permissions on VPS..."
ssh ${VPS_USER}@${VPS_IP} "sudo chown deployer:deployer ${REMOTE_PATH}/backend/data/barcode_generator.db && chmod 664 ${REMOTE_PATH}/backend/data/barcode_generator.db"

echo ""
echo "✅ Verifying transfer..."
REMOTE_COUNT=$(ssh ${VPS_USER}@${VPS_IP} "sqlite3 ${REMOTE_PATH}/backend/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\"")
echo "📊 Remote database now has ${REMOTE_COUNT} users"

if [ "$REMOTE_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: Remote database still shows 0 users after transfer!"
    echo "   This might mean the database file is corrupted or the transfer didn't work."
    exit 1
fi

echo ""
echo "🚀 Starting backend container..."
ssh ${VPS_USER}@${VPS_IP} "cd ${REMOTE_PATH} && docker compose start backend"

echo ""
echo "⏳ Waiting for container to start..."
sleep 5

echo ""
echo "✅ Verifying in container..."
CONTAINER_COUNT=$(ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\"")
echo "📊 Container database has ${CONTAINER_COUNT} users"

if [ "$CONTAINER_COUNT" -eq "$USER_COUNT" ]; then
    echo ""
    echo "✅ SUCCESS! Database transferred correctly!"
    echo "   Local: ${USER_COUNT} users"
    echo "   Remote: ${REMOTE_COUNT} users"
    echo "   Container: ${CONTAINER_COUNT} users"
else
    echo ""
    echo "⚠️  WARNING: User counts don't match!"
    echo "   Local: ${USER_COUNT} users"
    echo "   Remote: ${REMOTE_COUNT} users"
    echo "   Container: ${CONTAINER_COUNT} users"
fi

