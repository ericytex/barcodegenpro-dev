#!/bin/bash
# Full Rebuild Script for Barcode Generator
# Usage: ./full-rebuild.sh [local|remote|both]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

MODE="${1:-both}"

rebuild_local() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🏠 Rebuilding Local Environment${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$LOCAL_DIR"
    
    echo -e "${YELLOW}Stopping containers...${NC}"
    docker compose down
    
    echo -e "${YELLOW}Rebuilding containers...${NC}"
    docker compose build --no-cache
    
    echo -e "${YELLOW}Starting containers...${NC}"
    docker compose up -d
    
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 5
    
    echo -e "${YELLOW}Container status:${NC}"
    docker compose ps
    
    echo -e "${GREEN}✅ Local rebuild complete!${NC}"
    echo ""
    echo -e "View logs: ${BLUE}docker compose logs -f${NC}"
    echo -e "Health check: ${BLUE}curl http://localhost:8034/healthz${NC}"
}

rebuild_remote() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🌐 Rebuilding Remote Environment${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$LOCAL_DIR"
    
    echo -e "${YELLOW}Step 1: Syncing code to VPS...${NC}"
    if [ -f "./rsync-to-remote.sh" ]; then
        ./rsync-to-remote.sh
    else
        echo -e "${RED}Error: rsync-to-remote.sh not found${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}Step 2: Rebuilding on VPS...${NC}"
    ssh "$VPS_USER@$VPS_IP" << EOF
cd $VPS_PATH
docker compose down
docker compose build --no-cache
docker compose up -d
sleep 5
docker compose ps
EOF
    
    echo ""
    echo -e "${GREEN}✅ Remote rebuild complete!${NC}"
    echo ""
    echo -e "View logs: ${BLUE}ssh $VPS_USER@$VPS_IP 'cd $VPS_PATH && docker compose logs -f'${NC}"
    echo -e "Health check: ${BLUE}curl http://$VPS_IP:8034/healthz${NC}"
}

rebuild_both() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}║          Full Rebuild - Local & Remote                    ║${NC}"
    echo -e "${BLUE}║                                                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    rebuild_local
    echo ""
    rebuild_remote
    echo ""
    echo -e "${GREEN}✅ Full rebuild complete!${NC}"
}

case "$MODE" in
    local)
        rebuild_local
        ;;
    remote)
        rebuild_remote
        ;;
    both)
        rebuild_both
        ;;
    *)
        echo -e "${RED}Usage: $0 [local|remote|both]${NC}"
        echo ""
        echo "  local   - Rebuild only local environment"
        echo "  remote  - Rebuild only remote environment (syncs code first)"
        echo "  both    - Rebuild both local and remote (default)"
        exit 1
        ;;
esac

