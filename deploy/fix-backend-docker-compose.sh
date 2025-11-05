#!/bin/bash

# Script to verify and fix backend/docker-compose.yml database path
# Run this on the remote server

echo "=== Backend Docker Compose Database Path Fix ==="
echo ""

COMPOSE_FILE="./backend/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="~/barcodegenpro-dev/backend/docker-compose.yml"
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ docker-compose.yml not found"
    echo "   Looking for: $COMPOSE_FILE"
    exit 1
fi

echo "Found: $COMPOSE_FILE"
echo ""

# Check if DATABASE_PATH is set
if grep -q "DATABASE_PATH" "$COMPOSE_FILE"; then
    echo "✅ DATABASE_PATH is already set:"
    grep "DATABASE_PATH" "$COMPOSE_FILE"
else
    echo "⚠️  DATABASE_PATH is NOT set"
    echo ""
    echo "Current environment section:"
    grep -A 5 "environment:" "$COMPOSE_FILE" | head -6
    echo ""
    echo "To fix, add this line to the environment section:"
    echo "  - DATABASE_PATH=/app/data/barcode_generator.db"
fi

echo ""
echo "Checking volume mounts:"
if grep -q "./data:/app/data" "$COMPOSE_FILE"; then
    echo "✅ Database volume mount found: ./data:/app/data"
    echo ""
    echo "This means:"
    echo "  - Host: ./data/barcode_generator.db (relative to docker-compose.yml location)"
    echo "  - Container: /app/data/barcode_generator.db"
else
    echo "⚠️  Database volume mount might be missing"
    grep -A 10 "volumes:" "$COMPOSE_FILE" | grep "data"
fi

echo ""
echo "Expected database location on host:"
# Get directory where docker-compose.yml is
COMPOSE_DIR=$(dirname "$COMPOSE_FILE")
DB_HOST_PATH="$COMPOSE_DIR/data/barcode_generator.db"

if [ -f "$DB_HOST_PATH" ]; then
    echo "✅ Database found at: $DB_HOST_PATH"
    ls -lh "$DB_HOST_PATH"
else
    echo "❌ Database NOT found at: $DB_HOST_PATH"
    echo ""
    echo "Searching for database..."
    find . -name "barcode_generator.db" -type f 2>/dev/null | head -5
fi

echo ""
echo "✅ Check complete!"



