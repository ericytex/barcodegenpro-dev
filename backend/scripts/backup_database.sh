#!/bin/bash

# Database Backup Script for BarcodeGen Pro
# Creates encrypted backup of SQLite database

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="${PROJECT_ROOT}/data/barcode_generator.db"
BACKUP_DIR="${PROJECT_ROOT}/data/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="barcode_generator_backup_${TIMESTAMP}.db"
ENCRYPTION_KEY="${DATABASE_ENCRYPTION_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  BarcodeGen Pro Database Backup${NC}"
echo "=================================="

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}⚠️  Database not found at: $DB_PATH${NC}"
    echo -e "${YELLOW}   Database will be created on first application run${NC}"
    exit 0
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
echo -e "${BLUE}📊 Database size: $DB_SIZE${NC}"

# Create backup
echo -e "${BLUE}💾 Creating backup...${NC}"
cp "$DB_PATH" "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip "$BACKUP_DIR/$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Encrypt backup if encryption key is provided
if [ -n "$ENCRYPTION_KEY" ]; then
    echo -e "${BLUE}🔐 Encrypting backup...${NC}"
    echo "$ENCRYPTION_KEY" | openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR/$BACKUP_FILE" -out "$BACKUP_DIR/${BACKUP_FILE}.enc" -pass stdin
    rm "$BACKUP_DIR/$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.enc"
fi

# Verify backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo -e "${GREEN}   File: $BACKUP_FILE${NC}"
echo -e "${GREEN}   Size: $BACKUP_SIZE${NC}"
echo -e "${GREEN}   Location: $BACKUP_DIR/$BACKUP_FILE${NC}"

# Clean old backups (keep last 30 days)
echo -e "${BLUE}🧹 Cleaning old backups...${NC}"
find "$BACKUP_DIR" -name "barcode_generator_backup_*.db.*" -type f -mtime +30 -delete
echo -e "${GREEN}✅ Old backups cleaned${NC}"

# List current backups
echo -e "${BLUE}📋 Current backups:${NC}"
ls -lh "$BACKUP_DIR"/barcode_generator_backup_*.db.* 2>/dev/null || echo "No backups found"

echo -e "${GREEN}🎉 Backup completed successfully!${NC}"