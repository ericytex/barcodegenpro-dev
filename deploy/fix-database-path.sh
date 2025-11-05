#!/bin/bash

# Script to fix database path on remote server
# Run this ON THE REMOTE SERVER

echo "=== Fixing Database Path ==="
echo ""

PROJECT_ROOT="$HOME/barcodegenpro-dev"
DB_HOST_PATH="$PROJECT_ROOT/backend/data/barcode_generator.db"
DB_CONTAINER_PATH="/app/data/barcode_generator.db"

echo "Project root: $PROJECT_ROOT"
echo "Host DB path: $DB_HOST_PATH"
echo "Container DB path: $DB_CONTAINER_PATH"
echo ""

# 1. Check if database exists on host
if [ ! -f "$DB_HOST_PATH" ]; then
    echo "⚠️  Database NOT FOUND at: $DB_HOST_PATH"
    echo ""
    echo "Creating directory structure..."
    mkdir -p "$PROJECT_ROOT/backend/data"
    
    echo ""
    echo "You need to either:"
    echo "  1. Copy your database from local machine"
    echo "  2. Or let the container create a new one (will be empty)"
    echo ""
    read -p "Do you want to create an empty database? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please copy your database first."
        exit 1
    fi
else
    echo "✅ Database found at: $DB_HOST_PATH"
    ls -lh "$DB_HOST_PATH"
fi

# 2. Check docker-compose.yml
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ docker-compose.yml not found at: $COMPOSE_FILE"
    exit 1
fi

echo ""
echo "2. Checking docker-compose.yml volume mount..."
if grep -q "./backend/data:/app/data" "$COMPOSE_FILE"; then
    echo "   ✅ Volume mount is correct: ./backend/data:/app/data"
else
    echo "   ⚠️  Volume mount might be missing or incorrect"
    echo "   Current volumes section:"
    grep -A 10 "volumes:" "$COMPOSE_FILE" | head -10
fi

# 3. Check if DATABASE_PATH is set in docker-compose.yml
if grep -q "DATABASE_PATH" "$COMPOSE_FILE"; then
    echo ""
    echo "   ✅ DATABASE_PATH is set in docker-compose.yml"
    grep "DATABASE_PATH" "$COMPOSE_FILE"
else
    echo ""
    echo "   ℹ️  DATABASE_PATH not explicitly set (will use default: data/barcode_generator.db)"
    echo "   This is fine if the volume mount is correct."
fi

# 4. Check container status
echo ""
echo "3. Checking container status..."
if docker ps | grep -q barcode-v2-backend; then
    echo "   ✅ Container is running"
    
    # Check if database is accessible in container
    if docker exec barcode-v2-backend test -f "$DB_CONTAINER_PATH"; then
        echo "   ✅ Database is accessible in container at: $DB_CONTAINER_PATH"
        docker exec barcode-v2-backend ls -lh "$DB_CONTAINER_PATH"
    else
        echo "   ❌ Database NOT accessible in container"
        echo "   Checking /app/data contents:"
        docker exec barcode-v2-backend ls -la /app/data/ 2>/dev/null || echo "   Cannot access /app/data"
    fi
    
    # Check DATABASE_PATH environment variable in container
    echo ""
    echo "   DATABASE_PATH in container:"
    docker exec barcode-v2-backend env | grep DATABASE_PATH || echo "   (not set, using default)"
else
    echo "   ⚠️  Container is NOT running"
fi

echo ""
echo "4. Recommended actions:"
echo ""

if [ ! -f "$DB_HOST_PATH" ]; then
    echo "   [ ] Copy your database to: $DB_HOST_PATH"
fi

if ! docker ps | grep -q barcode-v2-backend; then
    echo "   [ ] Start container: docker compose up -d"
else
    echo "   [ ] Restart container: docker compose restart backend"
fi

echo ""
echo "✅ Diagnostic complete!"
echo ""
echo "To ensure the database path is correct, you can:"
echo "1. Verify the volume mount in docker-compose.yml:"
echo "   volumes:"
echo "     - ./backend/data:/app/data"
echo ""
echo "2. Optionally add DATABASE_PATH to environment in docker-compose.yml:"
echo "   environment:"
echo "     - DATABASE_PATH=/app/data/barcode_generator.db"



