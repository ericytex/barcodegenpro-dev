#!/bin/bash

# Script to check database on remote server
# Run this ON THE REMOTE SERVER

echo "=== Remote Database Check ==="
echo ""

# Get the directory where this script is located or use current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Project root: $PROJECT_ROOT"
echo ""

# 1. Check database location on host
echo "1. Checking database location on HOST:"
echo ""

if [ -f "$PROJECT_ROOT/backend/data/barcode_generator.db" ]; then
    DB_PATH="$PROJECT_ROOT/backend/data/barcode_generator.db"
    echo "   ✅ Found: $DB_PATH"
    ls -lh "$DB_PATH"
elif [ -f "./backend/data/barcode_generator.db" ]; then
    DB_PATH="./backend/data/barcode_generator.db"
    echo "   ✅ Found: $DB_PATH"
    ls -lh "$DB_PATH"
else
    echo "   ❌ Database NOT FOUND at expected locations"
    echo "   Searching for database files..."
    find . -name "barcode_generator.db" -type f 2>/dev/null | head -5
    echo ""
    echo "   Checking if data directory exists:"
    ls -la "$PROJECT_ROOT/backend/data/" 2>/dev/null || ls -la "./backend/data/" 2>/dev/null || echo "   ❌ Data directory not found"
    exit 1
fi

echo ""
echo "2. Checking database file size and permissions:"
ls -lh "$DB_PATH" 2>/dev/null || echo "   ❌ Cannot access database file"

echo ""
echo "3. Checking database INSIDE container:"
if docker ps | grep -q barcode-v2-backend; then
    echo "   Container is running"
    echo ""
    echo "   Database path in container: /app/data/barcode_generator.db"
    echo ""
    if docker exec barcode-v2-backend test -f /app/data/barcode_generator.db; then
        echo "   ✅ Database exists in container"
        docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db
    else
        echo "   ❌ Database NOT FOUND in container at /app/data/barcode_generator.db"
        echo ""
        echo "   Checking what's in /app/data:"
        docker exec barcode-v2-backend ls -la /app/data/ 2>/dev/null || echo "   Cannot access /app/data"
    fi
    
    echo ""
    echo "   Checking DATABASE_PATH environment variable in container:"
    docker exec barcode-v2-backend env | grep DATABASE_PATH || echo "   DATABASE_PATH not set (using default: data/barcode_generator.db)"
else
    echo "   ⚠️  Container barcode-v2-backend is NOT running"
fi

echo ""
echo "4. Checking database tables:"
if command -v sqlite3 &> /dev/null; then
    if [ -f "$DB_PATH" ]; then
        echo ""
        echo "   All tables:"
        sqlite3 "$DB_PATH" ".tables" 2>/dev/null | tr ' ' '\n' | sort | head -20
        
        echo ""
        echo "   Checking critical tables:"
        
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null | grep -q users; then
            echo "   ✅ users table exists"
            USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
            echo "      User count: $USER_COUNT"
            if [ "$USER_COUNT" -gt 0 ]; then
                echo "      First 5 users:"
                sqlite3 "$DB_PATH" "SELECT id, email, username, is_active FROM users LIMIT 5;" 2>/dev/null | while IFS='|' read -r id email username is_active; do
                    echo "        ID: $id | Email: $email | Username: $username | Active: $is_active"
                done
            fi
        else
            echo "   ❌ users table MISSING"
        fi
        
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='token_settings';" 2>/dev/null | grep -q token_settings; then
            echo "   ✅ token_settings table exists"
            SETTINGS_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM token_settings;" 2>/dev/null)
            echo "      Settings count: $SETTINGS_COUNT"
        else
            echo "   ❌ token_settings table MISSING"
        fi
        
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='user_tokens';" 2>/dev/null | grep -q user_tokens; then
            echo "   ✅ user_tokens table exists"
        else
            echo "   ❌ user_tokens table MISSING"
        fi
        
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='barcode_files';" 2>/dev/null | grep -q barcode_files; then
            echo "   ✅ barcode_files table exists"
        else
            echo "   ❌ barcode_files table MISSING"
        fi
    else
        echo "   ❌ Cannot check tables - database file not found"
    fi
else
    echo "   ⚠️  sqlite3 not installed on host. Checking in container instead..."
    if docker ps | grep -q barcode-v2-backend; then
        docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db ".tables" 2>/dev/null || echo "   Cannot query database in container"
    fi
fi

echo ""
echo "5. Checking Docker Compose volume mount:"
if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    echo "   Checking docker-compose.yml for database volume mount:"
    grep -A 5 "volumes:" "$PROJECT_ROOT/docker-compose.yml" | grep -E "(data|barcode_generator)" || echo "   No explicit database volume found"
else
    echo "   ⚠️  docker-compose.yml not found"
fi

echo ""
echo "6. Summary:"
echo "   Host DB path: $DB_PATH"
if docker ps | grep -q barcode-v2-backend; then
    echo "   Container DB path: /app/data/barcode_generator.db"
    echo "   Container status: ✅ Running"
else
    echo "   Container status: ❌ Not running"
fi

echo ""
echo "✅ Check complete!"



