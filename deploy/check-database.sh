#!/bin/bash

# Script to check database location and schema
# Run this on the remote server inside the container or on host

echo "=== Database Location Check ==="
echo ""

# Check inside container
echo "1. Checking database location in container..."
docker exec barcode-v2-backend ls -la /app/data/ 2>/dev/null || echo "   Container not running or data dir missing"

echo ""
echo "2. Checking database on host (from docker-compose volume)..."
if [ -d "./backend/data" ]; then
    ls -la ./backend/data/
    echo ""
    if [ -f "./backend/data/barcode_generator.db" ]; then
        echo "   ✅ Database file exists"
        echo ""
        echo "3. Checking if token_settings table exists..."
        sqlite3 ./backend/data/barcode_generator.db ".tables" | grep token_settings && echo "   ✅ token_settings table exists" || echo "   ❌ token_settings table MISSING"
        echo ""
        echo "4. Checking users table..."
        sqlite3 ./backend/data/barcode_generator.db ".tables" | grep users && echo "   ✅ users table exists" || echo "   ❌ users table MISSING"
        echo ""
        echo "5. List of all tables:"
        sqlite3 ./backend/data/barcode_generator.db ".tables"
        echo ""
        echo "6. Check users count:"
        sqlite3 ./backend/data/barcode_generator.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "   Error: Cannot query users table"
    else
        echo "   ❌ Database file NOT FOUND at ./backend/data/barcode_generator.db"
    fi
else
    echo "   ❌ Directory ./backend/data does not exist"
fi

echo ""
echo "7. Container environment check:"
docker exec barcode-v2-backend env | grep DATABASE_PATH || echo "   DATABASE_PATH not set (using default)"
docker exec barcode-v2-backend ls -la /app/data/barcode_generator.db 2>/dev/null && echo "   ✅ DB exists in container" || echo "   ❌ DB missing in container"



