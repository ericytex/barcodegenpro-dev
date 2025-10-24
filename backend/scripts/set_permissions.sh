#!/bin/bash

# Set Secure File Permissions Script for BarcodeGen Pro
# Sets restrictive permissions on database and sensitive files

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="${PROJECT_ROOT}/data/barcode_generator.db"
DATA_DIR="${PROJECT_ROOT}/data"
BACKUP_DIR="${PROJECT_ROOT}/data/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Setting Secure File Permissions${NC}"
echo "=================================="

# Check if running as root (not recommended for production)
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Running as root. Consider running as non-root user.${NC}"
fi

# Set permissions on data directory
if [ -d "$DATA_DIR" ]; then
    echo -e "${BLUE}📁 Setting permissions on data directory...${NC}"
    chmod 700 "$DATA_DIR"
    echo -e "${GREEN}✅ Data directory permissions set to 700${NC}"
else
    echo -e "${YELLOW}⚠️  Data directory not found: $DATA_DIR${NC}"
fi

# Set permissions on database file
if [ -f "$DB_PATH" ]; then
    echo -e "${BLUE}🗄️  Setting permissions on database file...${NC}"
    chmod 600 "$DB_PATH"
    echo -e "${GREEN}✅ Database file permissions set to 600${NC}"
    
    # Show current permissions
    DB_PERMS=$(ls -l "$DB_PATH" | awk '{print $1}')
    echo -e "${BLUE}📊 Current database permissions: $DB_PERMS${NC}"
else
    echo -e "${YELLOW}⚠️  Database file not found: $DB_PATH${NC}"
fi

# Set permissions on backup directory
if [ -d "$BACKUP_DIR" ]; then
    echo -e "${BLUE}💾 Setting permissions on backup directory...${NC}"
    chmod 700 "$BACKUP_DIR"
    echo -e "${GREEN}✅ Backup directory permissions set to 700${NC}"
    
    # Set permissions on backup files
    if [ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo -e "${BLUE}🔐 Setting permissions on backup files...${NC}"
        chmod 600 "$BACKUP_DIR"/*
        echo -e "${GREEN}✅ Backup files permissions set to 600${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backup directory not found: $BACKUP_DIR${NC}"
fi

# Set permissions on environment files
ENV_FILES=(
    "$PROJECT_ROOT/.env"
    "$PROJECT_ROOT/env.example"
    "$PROJECT_ROOT/env.docker.example"
)

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo -e "${BLUE}🔧 Setting permissions on environment file: $(basename "$env_file")${NC}"
        chmod 600 "$env_file"
        echo -e "${GREEN}✅ Environment file permissions set to 600${NC}"
    fi
done

# Set permissions on logs directory
LOGS_DIR="$PROJECT_ROOT/logs"
if [ -d "$LOGS_DIR" ]; then
    echo -e "${BLUE}📝 Setting permissions on logs directory...${NC}"
    chmod 755 "$LOGS_DIR"
    echo -e "${GREEN}✅ Logs directory permissions set to 755${NC}"
    
    # Set permissions on log files
    if [ "$(ls -A "$LOGS_DIR" 2>/dev/null)" ]; then
        chmod 644 "$LOGS_DIR"/*
        echo -e "${GREEN}✅ Log files permissions set to 644${NC}"
    fi
fi

# Set permissions on uploads directory
UPLOADS_DIR="$PROJECT_ROOT/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    echo -e "${BLUE}📤 Setting permissions on uploads directory...${NC}"
    chmod 755 "$UPLOADS_DIR"
    echo -e "${GREEN}✅ Uploads directory permissions set to 755${NC}"
fi

# Set permissions on downloads directory
DOWNLOADS_DIR="$PROJECT_ROOT/downloads"
if [ -d "$DOWNLOADS_DIR" ]; then
    echo -e "${BLUE}📥 Setting permissions on downloads directory...${NC}"
    chmod 755 "$DOWNLOADS_DIR"
    echo -e "${GREEN}✅ Downloads directory permissions set to 755${NC}"
fi

# Set ownership (if running as root)
if [ "$EUID" -eq 0 ]; then
    APP_USER="${APP_USER:-barcode}"
    echo -e "${BLUE}👤 Setting ownership to user: $APP_USER${NC}"
    
    if id "$APP_USER" &>/dev/null; then
        chown -R "$APP_USER:$APP_USER" "$DATA_DIR" 2>/dev/null || true
        chown -R "$APP_USER:$APP_USER" "$LOGS_DIR" 2>/dev/null || true
        chown -R "$APP_USER:$APP_USER" "$UPLOADS_DIR" 2>/dev/null || true
        chown -R "$APP_USER:$APP_USER" "$DOWNLOADS_DIR" 2>/dev/null || true
        echo -e "${GREEN}✅ Ownership set to $APP_USER${NC}"
    else
        echo -e "${YELLOW}⚠️  User $APP_USER not found. Skipping ownership change.${NC}"
    fi
fi

# Summary
echo -e "${BLUE}📋 Permission Summary:${NC}"
echo "=================="

if [ -f "$DB_PATH" ]; then
    echo -e "Database file: $(ls -l "$DB_PATH" | awk '{print $1, $3, $4}')"
fi

if [ -d "$DATA_DIR" ]; then
    echo -e "Data directory: $(ls -ld "$DATA_DIR" | awk '{print $1, $3, $4}')"
fi

if [ -d "$BACKUP_DIR" ]; then
    echo -e "Backup directory: $(ls -ld "$BACKUP_DIR" | awk '{print $1, $3, $4}')"
fi

echo -e "${GREEN}🎉 File permissions set successfully!${NC}"
echo -e "${YELLOW}⚠️  Remember to restart your application after setting permissions${NC}"
