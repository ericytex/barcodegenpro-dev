#!/bin/bash

# Migration script: Switch from local builds to GHCR images
# Use this AFTER you've run setup-remote-server.sh

set -e

DEPLOY_DIR="${DEPLOY_DIR:-/opt/barcode-gen-pro}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "=== Migrate to GHCR Images ==="
echo ""
echo "This script will help you switch from locally built containers to GHCR images."
echo ""

# Check if running containers
EXISTING_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "barcode|v2" || true)

if [ -z "$EXISTING_CONTAINERS" ]; then
    echo "⚠️  No existing containers found. You can proceed directly."
    echo ""
else
    echo "📦 Found running containers:"
    echo "$EXISTING_CONTAINERS" | sed 's/^/   - /'
    echo ""
    echo "Options:"
    echo "1. Stop existing containers and switch to GHCR images"
    echo "2. Keep existing containers running (just pull GHCR images for later use)"
    echo "3. Cancel"
    echo ""
    read -p "Choose option (1/2/3): " -n 1 -r
    echo
    case $REPLY in
        1)
            echo "🛑 Stopping existing containers..."
            docker ps -q --filter "name=barcode" --filter "name=v2" | xargs -r docker stop
            MIGRATE_NOW=true
            ;;
        2)
            echo "📥 Just pulling images for now (containers keep running)..."
            MIGRATE_NOW=false
            ;;
        *)
            echo "Cancelled."
            exit 0
            ;;
    esac
fi

# Check if compose file exists
if [ ! -f "$DEPLOY_DIR/$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found in $DEPLOY_DIR"
    echo "   Run setup-remote-server.sh first!"
    exit 1
fi

# Check .env file
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Create it with: nano $DEPLOY_DIR/.env"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Login to GHCR
echo ""
echo "🔐 Login to GHCR..."
echo "   You need a GitHub Personal Access Token with 'read:packages' permission"
echo "   Get one at: https://github.com/settings/tokens"
echo ""
read -p "Enter your GitHub token (or press Enter to skip and login manually): " -s GITHUB_TOKEN
echo

if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u ericytex --password-stdin
    echo "✅ Logged in to GHCR"
else
    echo "⚠️  Skipping login. Run this manually:"
    echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin"
    echo ""
    read -p "Have you logged in manually? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please login first, then run this script again."
        exit 1
    fi
fi

# Pull images
echo ""
echo "📥 Pulling latest images from GHCR..."
cd "$DEPLOY_DIR"
docker compose -f "$COMPOSE_FILE" pull

if [ "$MIGRATE_NOW" = true ]; then
    echo ""
    echo "🚀 Starting containers with GHCR images..."
    docker compose -f "$COMPOSE_FILE" up -d
    
    echo ""
    echo "✅ Migration complete!"
    echo ""
    echo "Containers status:"
    docker compose -f "$COMPOSE_FILE" ps
else
    echo ""
    echo "✅ Images pulled successfully!"
    echo ""
    echo "Your existing containers are still running with old images."
    echo "When ready to switch, run:"
    echo "  cd $DEPLOY_DIR"
    echo "  docker compose -f $COMPOSE_FILE down"
    echo "  docker compose -f $COMPOSE_FILE up -d"
fi

