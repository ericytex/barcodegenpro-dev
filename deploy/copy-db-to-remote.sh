#!/bin/bash

# Script to copy local database to remote server
# Run this from your LOCAL machine

LOCAL_DB="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db"
REMOTE_HOST="deployer@194.163.134.129"
REMOTE_DB_PATH="~/barcodegenpro-dev/backend/data/barcode_generator.db"

if [ ! -f "$LOCAL_DB" ]; then
    echo "❌ Local database not found at: $LOCAL_DB"
    exit 1
fi

echo "=== Copying Database to Remote Server ==="
echo ""
echo "Local DB:  $LOCAL_DB"
echo "Remote:    $REMOTE_HOST:$REMOTE_DB_PATH"
echo ""

# Create backup on remote first
echo "1. Creating backup on remote server..."
ssh $REMOTE_HOST "mkdir -p ~/barcodegenpro-dev/backend/data/backups && cp $REMOTE_DB_PATH ~/barcodegenpro-dev/backend/data/backups/barcode_generator.db.backup_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Copy database
echo "2. Copying database..."
scp "$LOCAL_DB" "$REMOTE_HOST:$REMOTE_DB_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database copied successfully!"
    echo ""
    echo "3. Restarting backend container..."
    ssh $REMOTE_HOST "cd ~/barcodegenpro-dev && docker compose restart backend"
    
    echo ""
    echo "✅ Done! The remote server should now have your users and data."
    echo ""
    echo "Verify with:"
    echo "  ssh $REMOTE_HOST 'cd ~/barcodegenpro-dev && docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\"'"
else
    echo ""
    echo "❌ Failed to copy database"
    exit 1
fi



