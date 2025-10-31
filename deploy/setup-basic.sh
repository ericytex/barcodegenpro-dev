#!/bin/bash

# Basic setup script - just files, no GitHub/GHCR stuff
# Safe to run when containers are already running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/barcode-gen-pro}"

echo "=== Basic Setup Script (No GitHub Integration) ==="
echo ""
echo "Repository root: $REPO_ROOT"
echo "Deployment directory: $DEPLOY_DIR"
echo ""

# Check for existing running containers
EXISTING_CONTAINERS=""
if command -v docker >/dev/null 2>&1; then
    EXISTING_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "barcode|v2" || true)
fi

if [ -n "$EXISTING_CONTAINERS" ]; then
    echo "⚠️  Found existing running containers:"
    echo "$EXISTING_CONTAINERS" | sed 's/^/   - /'
    echo ""
    echo "This script will only set up files, NOT touch your running containers."
    echo ""
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    SUDO_CMD="sudo"
    echo "Will use sudo for system-wide setup"
else
    SUDO_CMD=""
fi

# Create deployment directory
echo "📁 Creating deployment directory: $DEPLOY_DIR"
$SUDO_CMD mkdir -p "$DEPLOY_DIR"
if [ "$EUID" -ne 0 ]; then
    $SUDO_CMD chown "$USER:$USER" "$DEPLOY_DIR" 2>/dev/null || true
fi

# Copy docker-compose.prod.yml
echo "📋 Copying docker-compose.prod.yml..."
if [ -f "$REPO_ROOT/docker-compose.prod.yml" ]; then
    cp "$REPO_ROOT/docker-compose.prod.yml" "$DEPLOY_DIR/"
    echo "   ✓ Copied docker-compose.prod.yml"
else
    echo "   ❌ docker-compose.prod.yml not found at $REPO_ROOT/docker-compose.prod.yml"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "📝 Creating .env file template..."
    cat > "$DEPLOY_DIR/.env.example" << 'EOF'
# Docker Compose Environment Variables for Production

# Security
SECRET_KEY=change-this-to-a-random-secret-key-at-least-32-chars
# Generate with: openssl rand -hex 32

# Database
DATABASE_PATH=/app/data/barcode_generator.db

# Logging
LOG_LEVEL=INFO

# CORS Origins (comma-separated)
CORS_ORIGINS=http://194.163.134.129,http://194.163.134.129:8080,https://your-domain.com
EOF
    echo "   ✓ Created .env.example"
    echo ""
    echo "⚠️  IMPORTANT: Create .env file with your actual values:"
    echo "   cd $DEPLOY_DIR"
    echo "   cp .env.example .env"
    echo "   nano .env"
else
    echo "   ✓ .env file already exists"
fi

echo ""
echo "✅ Basic setup complete!"
echo ""
echo "Files created in: $DEPLOY_DIR"
echo ""
echo "Next steps (when ready):"
echo "1. Edit $DEPLOY_DIR/.env with your configuration"
echo "2. Review $DEPLOY_DIR/docker-compose.prod.yml"
echo ""
if [ -n "$EXISTING_CONTAINERS" ]; then
    echo "Your containers are still running. To use the new compose file later:"
    echo "  cd $DEPLOY_DIR"
    echo "  docker compose -f docker-compose.prod.yml pull"
    echo "  docker compose -f docker-compose.prod.yml up -d"
fi

