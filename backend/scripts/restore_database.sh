#!/bin/bash

# Database Restore Script for BarcodeGen Pro
# Restores database from encrypted backup

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="${PROJECT_ROOT}/data/barcode_generator.db"
BACKUP_DIR="${PROJECT_ROOT}/data/backups"
ENCRYPTION_KEY="${DATABASE_ENCRYPTION_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 BarcodeGen Pro Database Restore${NC}"
echo "=================================="

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# List available backups
echo -e "${BLUE}📋 Available backups:${NC}"
ls -lh "$BACKUP_DIR"/barcode_generator_backup_*.db.* 2>/dev/null || {
    echo -e "${RED}❌ No backups found in $BACKUP_DIR${NC}"
    exit 1
}

# Get backup file from user
echo -e "${YELLOW}Enter backup filename (or press Enter for latest):${NC}"
read -r BACKUP_FILE

# If no file specified, use latest
if [ -z "$BACKUP_FILE" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/barcode_generator_backup_*.db.* | head -n1 | xargs basename)
    echo -e "${BLUE}Using latest backup: $BACKUP_FILE${NC}"
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Check if backup file exists
if [ ! -f "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_PATH${NC}"
    exit 1
fi

# Create backup of current database before restore
if [ -f "$DB_PATH" ]; then
    echo -e "${BLUE}💾 Creating backup of current database...${NC}"
    CURRENT_BACKUP="${DB_PATH}.pre_restore_$(date +%Y%m%d_%H%M%S)"
    cp "$DB_PATH" "$CURRENT_BACKUP"
    echo -e "${GREEN}✅ Current database backed up to: $CURRENT_BACKUP${NC}"
fi

# Decrypt backup if it's encrypted
TEMP_BACKUP="$BACKUP_PATH"
if [[ "$BACKUP_FILE" == *.enc ]]; then
    echo -e "${BLUE}🔓 Decrypting backup...${NC}"
    TEMP_BACKUP="${BACKUP_PATH}.decrypted"
    echo "$ENCRYPTION_KEY" | openssl enc -aes-256-cbc -d -salt -in "$BACKUP_PATH" -out "$TEMP_BACKUP" -pass stdin
fi

# Decompress backup if it's compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${BLUE}🗜️  Decompressing backup...${NC}"
    FINAL_BACKUP="${TEMP_BACKUP%.gz}"
    gunzip -c "$TEMP_BACKUP" > "$FINAL_BACKUP"
    TEMP_BACKUP="$FINAL_BACKUP"
fi

# Verify backup integrity
echo -e "${BLUE}🔍 Verifying backup integrity...${NC}"
if ! sqlite3 "$TEMP_BACKUP" "PRAGMA integrity_check;" > /dev/null; then
    echo -e "${RED}❌ Backup integrity check failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backup integrity verified${NC}"

# Restore database
echo -e "${BLUE}🔄 Restoring database...${NC}"
cp "$TEMP_BACKUP" "$DB_PATH"

# Set proper permissions
chmod 600 "$DB_PATH"
chmod 700 "$(dirname "$DB_PATH")"

# Clean up temporary files
if [ "$TEMP_BACKUP" != "$BACKUP_PATH" ]; then
    rm -f "$TEMP_BACKUP"
fi

# Verify restore
echo -e "${BLUE}🔍 Verifying restore...${NC}"
if ! sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /dev/null; then
    echo -e "${RED}❌ Restore verification failed!${NC}"
    exit 1
fi

# Get database info
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
echo -e "${GREEN}✅ Database restored successfully!${NC}"
echo -e "${GREEN}   Size: $DB_SIZE${NC}"
echo -e "${GREEN}   Location: $DB_PATH${NC}"

echo -e "${GREEN}🎉 Restore completed successfully!${NC}"
echo -e "${YELLOW}⚠️  Remember to restart your application${NC}"