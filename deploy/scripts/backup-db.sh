#!/bin/bash
# SQLite Database Backup Script
# Copy this to /home/barcode/scripts/backup-db.sh on your VPS

BACKUP_DIR="/home/barcode/backups"
DB_PATH="/home/barcode/app/backend/data/barcode_generator.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/barcode_db_$DATE.db"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    exit 1
fi

# Perform backup
echo "Backing up database to $BACKUP_FILE"
sqlite3 $DB_PATH ".backup '$BACKUP_FILE'"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup successful: $BACKUP_FILE"
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: ${BACKUP_FILE}.gz"
else
    echo "Error: Backup failed"
    exit 1
fi

# Keep only last 7 days of backups
echo "Cleaning up old backups (keeping last 7 days)"
find $BACKUP_DIR -name "barcode_db_*.db.gz" -mtime +7 -delete

# Show backup directory size
echo "Current backup directory size:"
du -sh $BACKUP_DIR

exit 0


