#!/bin/bash

# Script to verify database location and users on remote server
# Run this on the remote server

echo "=== Database Verification ==="
echo ""

echo "1. Checking database location in container:"
docker exec barcode-v2-backend ls -la /app/data/ 2>/dev/null || echo "   ❌ Cannot access container"

echo ""
echo "2. Checking database location on host:"
if [ -f "./backend/data/barcode_generator.db" ]; then
    DB_PATH="./backend/data/barcode_generator.db"
    echo "   ✅ Found: $DB_PATH"
elif [ -f "/home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db" ]; then
    DB_PATH="/home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db"
    echo "   ✅ Found: $DB_PATH"
else
    echo "   ❌ Database not found"
    echo "   Searching..."
    find . -name "barcode_generator.db" -type f 2>/dev/null | head -5
    exit 1
fi

echo ""
echo "3. Checking if users table exists:"
if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null | grep -q users; then
    echo "   ✅ users table exists"
else
    echo "   ❌ users table MISSING"
    exit 1
fi

echo ""
echo "4. Checking user count:"
USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
echo "   Total users: $USER_COUNT"

if [ "$USER_COUNT" -eq 0 ]; then
    echo "   ⚠️  NO USERS FOUND - This explains 401 Unauthorized errors"
    echo ""
    echo "   You need to either:"
    echo "   1. Copy your local database from:"
    echo "      /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db"
    echo "   2. Create a user via registration endpoint"
    exit 1
else
    echo ""
    echo "5. User list:"
    sqlite3 "$DB_PATH" "SELECT id, email, username, is_active FROM users LIMIT 10;"
fi

echo ""
echo "6. Checking if token_settings table exists:"
if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='token_settings';" 2>/dev/null | grep -q token_settings; then
    echo "   ✅ token_settings table exists"
else
    echo "   ❌ token_settings table MISSING - database may not be initialized"
fi

echo ""
echo "✅ Verification complete!"



