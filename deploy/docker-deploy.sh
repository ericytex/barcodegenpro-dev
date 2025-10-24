#!/bin/bash
# Docker Deployment Script
# Deploy using Docker Compose to VPS

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
source "$SCRIPT_DIR/deploy-package/config.sh"

if ! validate_config; then
    echo -e "${RED}Error: Invalid configuration${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║     Barcode Generator - Docker Deployment                 ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  VPS IP:      ${YELLOW}$VPS_IP${NC}"
echo -e "  Domain:      ${YELLOW}$DOMAIN${NC}"
echo ""

read -p "$(echo -e ${YELLOW}Continue with Docker deployment? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Starting Docker deployment...${NC}"
echo ""

# ============================================
# PHASE 1: Setup VPS and Install Docker
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Phase 1/6: Installing Docker on VPS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    # Update system
    apt-get update
    
    # Install Docker if not already installed
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    else
        echo "Docker already installed"
    fi
    
    # Install Docker Compose plugin if not already installed
    if ! docker compose version &> /dev/null; then
        echo "Installing Docker Compose plugin..."
        apt-get install -y docker-compose-plugin
    else
        echo "Docker Compose plugin already installed"
    fi
    
    # Create app directory
    mkdir -p /home/barcode/app
    
    # Configure firewall
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    ufw --force enable || true
ENDSSH

echo -e "${GREEN}✓ Docker installation complete${NC}"
echo ""

# ============================================
# PHASE 2: Upload Application Code
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📁 Phase 2/6: Uploading Application Code${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Syncing backend code..."
rsync -avz --progress \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='*.db' \
    --exclude='uploads/*' \
    --exclude='downloads/*' \
    --exclude='logs/*' \
    --exclude='archives/*' \
    --exclude='node_modules' \
    "$BACKEND_SOURCE/" \
    ${VPS_USER}@${VPS_IP}:/home/barcode/app/api_all_devices/

echo "Syncing frontend code..."
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    "$FRONTEND_SOURCE/" \
    ${VPS_USER}@${VPS_IP}:/home/barcode/app/frontend/

echo "Uploading Docker configuration..."
scp "/home/ironscepter/Documents/Research/BARCODE-GENERATOR/BARCODE-GENERATOR copy/api_all_devices/docker-compose.yml" ${VPS_USER}@${VPS_IP}:/home/barcode/app/api_all_devices/
scp "/home/ironscepter/Documents/Research/BARCODE-GENERATOR/BARCODE-GENERATOR copy/deploy-package/nginx-proxy.conf" ${VPS_USER}@${VPS_IP}:/home/barcode/app/
scp "/home/ironscepter/Documents/Research/BARCODE-GENERATOR/BARCODE-GENERATOR copy/deploy-package/env.docker.example" ${VPS_USER}@${VPS_IP}:/home/barcode/app/.env.example

echo -e "${GREEN}✓ Code upload complete${NC}"
echo ""

# ============================================
# PHASE 3: Configure Environment
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⚙️  Phase 3/6: Configuring Environment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create .env file on VPS
ssh ${VPS_USER}@${VPS_IP} << ENVEOF
cat > /home/barcode/app/.env << 'EOF'
DOMAIN=${DOMAIN}
SECRET_KEY=${SECRET_KEY}
API_PORT=8034
API_WORKERS=2
FRONTEND_PORT=80
PROXY_PORT=8080
EOF
ENVEOF

echo -e "${GREEN}✓ Environment configuration complete${NC}"
echo ""

# ============================================
# PHASE 4: Build Docker Images
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🐳 Phase 4/6: Building Docker Images${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    cd /home/barcode/app/api_all_devices
    docker compose build
ENDSSH

echo -e "${GREEN}✓ Docker images built${NC}"
echo ""

# ============================================
# PHASE 5: Start Services
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Phase 5/6: Starting Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    cd /home/barcode/app/api_all_devices
    docker compose up -d
    echo ""
    echo "Waiting for services to start..."
    sleep 10
    docker compose ps
ENDSSH

echo -e "${GREEN}✓ Services started${NC}"
echo ""

# ============================================
# PHASE 6: Testing
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🧪 Phase 6/6: Testing Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Testing backend health..."
ssh ${VPS_USER}@${VPS_IP} "curl -s http://localhost:8034/healthz" || echo "Warning: Backend health check failed"

echo "Checking container status..."
ssh ${VPS_USER}@${VPS_IP} "cd /home/barcode/app/api_all_devices && docker compose ps"

echo -e "${GREEN}✓ Testing complete${NC}"
echo ""

# ============================================
# Deployment Complete
# ============================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║          ${GREEN}✓ Docker Deployment Complete!${BLUE}                     ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Your application is running in Docker containers!${NC}"
echo ""
echo -e "${YELLOW}Access your application:${NC}"
echo -e "  Frontend:    ${BLUE}http://${DOMAIN}${NC}"
echo -e "  Backend API: ${BLUE}http://${DOMAIN}:8034${NC}"
echo -e "  API Docs:    ${BLUE}http://${DOMAIN}:8034/docs${NC}"
echo ""
echo -e "${GREEN}Useful Docker Commands:${NC}"
echo -e "  View logs:        ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'cd /home/barcode/app/api_all_devices && docker compose logs -f'${NC}"
echo -e "  Restart:          ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'cd /home/barcode/app/api_all_devices && docker compose restart'${NC}"
echo -e "  Stop:             ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'cd /home/barcode/app/api_all_devices && docker compose down'${NC}"
echo -e "  Start:            ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'cd /home/barcode/app/api_all_devices && docker compose up -d'${NC}"
echo -e "  View containers:  ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'cd /home/barcode/app/api_all_devices && docker compose ps'${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure DNS in Cloudflare (A record: @ → ${VPS_IP})"
echo "  2. Wait for DNS propagation (5-30 minutes)"
echo "  3. Test your application"
echo "  4. Setup HTTPS (run: ./scripts/docker-setup-https.sh)"
echo ""


