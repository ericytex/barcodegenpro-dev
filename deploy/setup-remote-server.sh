#!/bin/bash

# Setup script for remote server deployment
# This script helps set up the deployment directory and files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/barcode-gen-pro}"

echo "=== Remote Server Setup Script ==="
echo ""
echo "Repository root: $REPO_ROOT"
echo "Deployment directory: $DEPLOY_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script should be run with sudo for system-wide setup"
    echo "   Running without sudo will use current user's permissions"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi

# Create deployment directory
echo "📁 Creating deployment directory: $DEPLOY_DIR"
$SUDO_CMD mkdir -p "$DEPLOY_DIR"
$SUDO_CMD chown "$USER:$USER" "$DEPLOY_DIR" 2>/dev/null || true

# Copy docker-compose.prod.yml
echo "📋 Copying docker-compose.prod.yml..."
if [ -f "$REPO_ROOT/docker-compose.prod.yml" ]; then
    cp "$REPO_ROOT/docker-compose.prod.yml" "$DEPLOY_DIR/"
    echo "   ✓ Copied docker-compose.prod.yml"
else
    echo "   ⚠️  docker-compose.prod.yml not found at $REPO_ROOT/docker-compose.prod.yml"
fi

# Copy webhook receiver script
echo "📜 Setting up webhook receiver..."
$SUDO_CMD mkdir -p "$DEPLOY_DIR/deploy"
if [ -f "$REPO_ROOT/deploy/webhook-receiver.sh" ]; then
    cp "$REPO_ROOT/deploy/webhook-receiver.sh" "$DEPLOY_DIR/deploy/"
    $SUDO_CMD chmod +x "$DEPLOY_DIR/deploy/webhook-receiver.sh"
    echo "   ✓ Copied and made executable: deploy/webhook-receiver.sh"
else
    echo "   ⚠️  webhook-receiver.sh not found"
fi

# Copy systemd service file (if exists)
if [ -f "$REPO_ROOT/deploy/webhook-receiver.service" ]; then
    cp "$REPO_ROOT/deploy/webhook-receiver.service" "$DEPLOY_DIR/deploy/"
    echo "   ✓ Copied webhook-receiver.service"
fi

# Create .env file if it doesn't exist
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "📝 Creating .env file template..."
    cat > "$DEPLOY_DIR/.env.example" << 'EOF'
# Docker Compose Environment Variables for Production
# Copy this to .env and update with your values

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
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit $DEPLOY_DIR/.env with your configuration"
echo "2. Review $DEPLOY_DIR/docker-compose.prod.yml"
echo "3. Setup webhook receiver (see GHCR_SETUP.md)"
echo "4. Login to GHCR: echo \$GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin"
echo ""
echo "Deployment directory: $DEPLOY_DIR"

