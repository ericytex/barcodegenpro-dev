#!/bin/bash

# Sync backend database to remote server
# Run from LOCAL machine

REMOTE="${1:-deployer@194.163.134.129}"
REMOTE_PATH="${2:-~/barcodegenpro-dev/backend/data}"

LOCAL_DB="./backend/data/barcode_generator.db"

if [ ! -f "$LOCAL_DB" ]; then
    echo "❌ Local database not found at: $LOCAL_DB"
    exit 1
fi

echo "=== Syncing Backend Database to Remote ==="
echo ""
echo "Local:  $LOCAL_DB"
echo "Remote: $REMOTE:$REMOTE_PATH"
echo ""

# Create backup on remote first
echo "1. Creating backup on remote..."
ssh "$REMOTE" "mkdir -p $REMOTE_PATH/backups && cp $REMOTE_PATH/barcode_generator.db $REMOTE_PATH/backups/barcode_generator.db.backup_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Sync the database file
echo ""
echo "2. Syncing database..."
rsync -avz --progress "$LOCAL_DB" "$REMOTE:$REMOTE_PATH/"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database synced successfully!"
    echo ""
    echo "3. Fixing permissions on remote..."
    ssh "$REMOTE" "cd $REMOTE_PATH && sudo chown deployer:deployer barcode_generator.db* && sudo chmod 644 barcode_generator.db"
    
    echo ""
    echo "4. Restarting backend container..."
    ssh "$REMOTE" "cd ~/barcodegenpro-dev && docker compose restart backend"
    
    echo ""
    echo "✅ Done! Database synced and container restarted."
    echo ""
    echo "Verify with:"
    echo "  ssh $REMOTE 'docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\"'"
else
    echo ""
    echo "❌ Failed to sync database"
    exit 1
fi



