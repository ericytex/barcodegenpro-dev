#!/bin/bash

# Script to check users in barcode-v2-backend container
# Run this on the remote server

CONTAINER_NAME="barcode-v2-backend"

echo "=== Checking Users in Container ==="
echo "Container: $CONTAINER_NAME"
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ Container '$CONTAINER_NAME' is NOT running"
    echo ""
    echo "Available containers:"
    docker ps --format "{{.Names}}"
    exit 1
fi

echo "✅ Container '$CONTAINER_NAME' is running"
echo ""

# Check DATABASE_PATH
echo "1. DATABASE_PATH environment variable:"
DATABASE_PATH=$(docker exec "$CONTAINER_NAME" env | grep DATABASE_PATH | cut -d'=' -f2)
if [ -z "$DATABASE_PATH" ]; then
    echo "   ⚠️  DATABASE_PATH not set (using default: data/barcode_generator.db)"
    DATABASE_PATH="/app/data/barcode_generator.db"
else
    echo "   ✅ DATABASE_PATH=$DATABASE_PATH"
fi

echo ""
echo "2. Checking if database file exists:"
if docker exec "$CONTAINER_NAME" test -f "$DATABASE_PATH"; then
    echo "   ✅ Database file exists at: $DATABASE_PATH"
    docker exec "$CONTAINER_NAME" ls -lh "$DATABASE_PATH"
else
    echo "   ❌ Database file NOT FOUND at: $DATABASE_PATH"
    echo ""
    echo "   Checking /app/data directory:"
    docker exec "$CONTAINER_NAME" ls -la /app/data/ 2>/dev/null || echo "   Cannot access /app/data"
    exit 1
fi

echo ""
echo "3. Checking if users table exists:"
HAS_USERS_TABLE=$(docker exec "$CONTAINER_NAME" sqlite3 "$DATABASE_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null)
if [ -n "$HAS_USERS_TABLE" ]; then
    echo "   ✅ users table exists"
else
    echo "   ❌ users table MISSING"
    echo ""
    echo "   Available tables:"
    docker exec "$CONTAINER_NAME" sqlite3 "$DATABASE_PATH" ".tables" 2>/dev/null || echo "   Cannot query database"
    exit 1
fi

echo ""
echo "4. User count:"
USER_COUNT=$(docker exec "$CONTAINER_NAME" sqlite3 "$DATABASE_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
if [ -n "$USER_COUNT" ]; then
    echo "   Total users: $USER_COUNT"
    if [ "$USER_COUNT" -eq 0 ]; then
        echo ""
        echo "   ⚠️  NO USERS FOUND - This explains 401 Unauthorized errors!"
        echo ""
        echo "   You need to copy your local database with users to the remote server."
    fi
else
    echo "   ❌ Cannot query user count"
    exit 1
fi

echo ""
echo "5. User list:"
if [ "$USER_COUNT" -gt 0 ]; then
    echo ""
    docker exec "$CONTAINER_NAME" sqlite3 "$DATABASE_PATH" -header -column "SELECT id, email, username, is_active, is_admin, is_super_admin FROM users;" 2>/dev/null || \
    docker exec "$CONTAINER_NAME" sqlite3 "$DATABASE_PATH" "SELECT id, email, username, is_active, is_admin, is_super_admin FROM users;" 2>/dev/null | while IFS='|' read -r id email username is_active is_admin is_super_admin; do
        echo "   ID: $id"
        echo "      Email: $email"
        echo "      Username: $username"
        echo "      Active: $is_active | Admin: $is_admin | Super Admin: $is_super_admin"
        echo ""
    done
else
    echo "   (No users to display)"
fi

echo ""
echo "6. Token settings check:"
TOKEN_SETTINGS_COUNT=$(docker exec "$CONTAINER_NAME" sqlite3 "$DATABASE_PATH" "SELECT COUNT(*) FROM token_settings;" 2>/dev/null)
if [ -n "$TOKEN_SETTINGS_COUNT" ]; then
    echo "   ✅ token_settings table exists with $TOKEN_SETTINGS_COUNT settings"
else
    echo "   ❌ token_settings table MISSING or cannot query"
fi

echo ""
echo "7. Database file location on host:"
echo "   (Volume mount: ./backend/data:/app/data)"
HOST_DB_PATH="~/barcodegenpro-dev/backend/data/barcode_generator.db"
if [ -f "$HOST_DB_PATH" ]; then
    echo "   ✅ Database exists on host at: $HOST_DB_PATH"
    ls -lh "$HOST_DB_PATH" 2>/dev/null || echo "   (Cannot access)"
else
    echo "   ⚠️  Database NOT found on host at: $HOST_DB_PATH"
fi

echo ""
echo "✅ Check complete!"



