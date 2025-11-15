#!/bin/bash
# Safe database transfer with integrity checks
# Usage: ./transfer-db-safe.sh

VPS_IP="194.163.134.129"
VPS_USER="deployer"
REMOTE_PATH="/home/deployer/barcodegenpro-dev"
LOCAL_DB="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db"

echo "🔍 Safe Database Transfer with Integrity Checks"
echo ""

# Check if local database exists
if [ ! -f "$LOCAL_DB" ]; then
    echo "❌ Error: Local database not found at ${LOCAL_DB}"
    exit 1
fi

# Verify local database integrity
echo "1️⃣ Checking local database integrity..."
INTEGRITY=$(sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;" 2>&1)
if [[ "$INTEGRITY" != "ok" ]]; then
    echo "❌ Local database is corrupted!"
    echo "   Error: $INTEGRITY"
    exit 1
fi
echo "   ✅ Local database is valid"

# Check user count
USER_COUNT=$(sqlite3 "$LOCAL_DB" "SELECT COUNT(*) FROM users;" 2>/dev/null)
echo "   📊 Local database has ${USER_COUNT} users"

# Check file type
FILE_TYPE=$(file "$LOCAL_DB" | grep -o "SQLite.*database" || echo "unknown")
echo "   📄 File type: $FILE_TYPE"

# Get file size
FILE_SIZE=$(stat -c%s "$LOCAL_DB")
echo "   📦 File size: ${FILE_SIZE} bytes ($(numfmt --to=iec-i --suffix=B $FILE_SIZE))"

echo ""
echo "🛑 Stopping backend container on VPS..."
ssh ${VPS_USER}@${VPS_IP} "cd ${REMOTE_PATH} && docker compose stop backend" || echo "⚠️  Container might already be stopped"

echo ""
echo "📦 Transferring database with checksum verification..."
# Use rsync with checksum to ensure integrity
rsync -avz --progress --checksum \
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
echo "✅ Verifying transferred database on VPS..."
REMOTE_INTEGRITY=$(ssh ${VPS_USER}@${VPS_IP} "sqlite3 ${REMOTE_PATH}/backend/data/barcode_generator.db \"PRAGMA integrity_check;\" 2>&1")
if [[ "$REMOTE_INTEGRITY" != "ok" ]]; then
    echo "❌ Remote database is corrupted after transfer!"
    echo "   Error: $REMOTE_INTEGRITY"
    exit 1
fi
echo "   ✅ Remote database integrity: OK"

REMOTE_COUNT=$(ssh ${VPS_USER}@${VPS_IP} "sqlite3 ${REMOTE_PATH}/backend/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\" 2>/dev/null")
echo "   📊 Remote database has ${REMOTE_COUNT} users"

if [ -z "$REMOTE_COUNT" ] || [ "$REMOTE_COUNT" != "$USER_COUNT" ]; then
    echo "⚠️  WARNING: User count mismatch!"
    echo "   Local: ${USER_COUNT} users"
    echo "   Remote: ${REMOTE_COUNT} users"
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
CONTAINER_INTEGRITY=$(ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"PRAGMA integrity_check;\" 2>&1")
if [[ "$CONTAINER_INTEGRITY" != "ok" ]]; then
    echo "❌ Container database is corrupted!"
    echo "   Error: $CONTAINER_INTEGRITY"
    exit 1
fi
echo "   ✅ Container database integrity: OK"

CONTAINER_COUNT=$(ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\" 2>/dev/null")
echo "   📊 Container database has ${CONTAINER_COUNT} users"

if [ "$CONTAINER_COUNT" = "$USER_COUNT" ]; then
    echo ""
    echo "✅ SUCCESS! Database transferred correctly!"
    echo "   All databases have ${USER_COUNT} users"
else
    echo ""
    echo "⚠️  WARNING: Container user count doesn't match!"
    echo "   Expected: ${USER_COUNT} users"
    echo "   Got: ${CONTAINER_COUNT} users"
fi

