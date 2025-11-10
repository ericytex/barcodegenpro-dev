#!/bin/bash
# Fresh sync everything to VPS
# This syncs all code files and rebuilds containers

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║          Fresh Sync to VPS                                ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 0: Ensure directory structure exists on VPS
echo -e "${YELLOW}📁 Step 0/4: Ensuring directory structure on VPS...${NC}"
ssh "${VPS_USER}@${VPS_IP}" << EOF
mkdir -p ${VPS_PATH}/backend/services
mkdir -p ${VPS_PATH}/backend/routes
mkdir -p ${VPS_PATH}/backend/models
mkdir -p ${VPS_PATH}/backend/utils
mkdir -p ${VPS_PATH}/frontend/src
mkdir -p ${VPS_PATH}/backend/data
mkdir -p ${VPS_PATH}/backend/downloads/barcodes
mkdir -p ${VPS_PATH}/backend/downloads/pdfs
mkdir -p ${VPS_PATH}/backend/uploads
mkdir -p ${VPS_PATH}/backend/logs
mkdir -p ${VPS_PATH}/backend/archives
echo "Directory structure created"
EOF
echo -e "${GREEN}✅ Directory structure ready${NC}"
echo ""

# Step 1: Sync Backend
echo -e "${YELLOW}📦 Step 1/4: Syncing backend (including services/)...${NC}"
rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude='venv/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='.git/' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='backend/logs/*.log' \
  --exclude='backend/archives/*' \
  --exclude='backend/downloads/barcodes/*.png' \
  --exclude='backend/downloads/pdfs/*.pdf' \
  --exclude='backend/uploads/*' \
  --exclude='backend/data/*.db*' \
  --exclude='.pytest_cache' \
  --exclude='.mypy_cache' \
  --exclude='.ruff_cache' \
  --exclude='*.egg-info' \
  --exclude='.DS_Store' \
  "$LOCAL_DIR/backend/" \
  "${VPS_USER}@${VPS_IP}:${VPS_PATH}/backend/"

echo -e "${GREEN}✅ Backend synced (including services/barcode_service.py)${NC}"
echo ""

# Step 2: Sync Frontend
echo -e "${YELLOW}📦 Step 2/4: Syncing frontend...${NC}"
rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='build/' \
  --exclude='.git/' \
  --exclude='.vite/' \
  --exclude='.bun/' \
  --exclude='.DS_Store' \
  "$LOCAL_DIR/frontend/" \
  "${VPS_USER}@${VPS_IP}:${VPS_PATH}/frontend/"

echo -e "${GREEN}✅ Frontend synced${NC}"
echo ""

# Step 3: Sync root files (docker-compose, etc)
echo -e "${YELLOW}📦 Step 3/4: Syncing root configuration files...${NC}"
rsync -avz --progress \
  --no-owner \
  --no-group \
  --include='docker-compose.yml' \
  --include='docker-compose.prod.yml' \
  --include='nginx-proxy.conf' \
  --include='env.docker.example' \
  --include='.env' \
  --exclude='*' \
  "$LOCAL_DIR/" \
  "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"

echo -e "${GREEN}✅ Configuration files synced${NC}"
echo ""

# Step 3.5: Fix permissions on VPS
echo -e "${YELLOW}🔧 Fixing file permissions on VPS...${NC}"
ssh "${VPS_USER}@${VPS_IP}" << EOF
cd ${VPS_PATH}
# Ensure deployer owns all files (try without sudo first, then with sudo if needed)
chown -R deployer:deployer ${VPS_PATH} 2>/dev/null || sudo chown -R deployer:deployer ${VPS_PATH} 2>/dev/null || true
# Set proper permissions (ignore errors if some files are protected)
find ${VPS_PATH} -type f -exec chmod 644 {} \; 2>/dev/null || true
find ${VPS_PATH} -type d -exec chmod 755 {} \; 2>/dev/null || true
# Make scripts executable
find ${VPS_PATH} -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
echo "Permissions fixed"
EOF
echo -e "${GREEN}✅ Permissions fixed${NC}"
echo ""

# Step 4: Verify critical files exist
echo -e "${YELLOW}🔍 Step 4/5: Verifying critical files on VPS...${NC}"
ssh "${VPS_USER}@${VPS_IP}" << EOF
echo "Checking backend/services/barcode_service.py..."
if [ -f "${VPS_PATH}/backend/services/barcode_service.py" ]; then
    echo "✅ backend/services/barcode_service.py exists"
    ls -lh ${VPS_PATH}/backend/services/barcode_service.py
else
    echo "❌ ERROR: backend/services/barcode_service.py NOT FOUND!"
    exit 1
fi

echo ""
echo "Checking backend/app.py..."
if [ -f "${VPS_PATH}/backend/app.py" ]; then
    echo "✅ backend/app.py exists"
else
    echo "❌ ERROR: backend/app.py NOT FOUND!"
    exit 1
fi

echo ""
echo "Checking frontend/src..."
if [ -d "${VPS_PATH}/frontend/src" ]; then
    echo "✅ frontend/src directory exists"
    ls -la ${VPS_PATH}/frontend/src | head -5
else
    echo "❌ ERROR: frontend/src directory NOT FOUND!"
    exit 1
fi

echo ""
echo "Checking docker-compose.yml..."
if [ -f "${VPS_PATH}/docker-compose.yml" ]; then
    echo "✅ docker-compose.yml exists"
else
    echo "⚠️  WARNING: docker-compose.yml not found (may be in subdirectory)"
fi
EOF

echo -e "${GREEN}✅ File verification complete${NC}"
echo ""

# Step 5: Rebuild and restart on VPS
echo -e "${YELLOW}🔨 Step 5/5: Rebuilding and restarting containers on VPS...${NC}"
ssh "${VPS_USER}@${VPS_IP}" << EOF
cd ${VPS_PATH}
echo "Stopping containers..."
docker compose down

echo "Rebuilding containers..."
docker compose build --no-cache

echo "Starting containers..."
docker compose up -d

echo "Waiting for services to start..."
sleep 5

echo "Container status:"
docker compose ps

echo ""
echo "Recent logs:"
docker compose logs --tail=30
EOF

echo ""
echo -e "${GREEN}✅ Fresh sync complete!${NC}"
echo ""
echo -e "View logs: ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'cd ${VPS_PATH} && docker compose logs -f'${NC}"
echo -e "Health check: ${BLUE}curl http://${VPS_IP}:8034/healthz${NC}"

