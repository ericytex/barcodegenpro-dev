#!/bin/bash
# Quick Backend Update Script
# Run this to update only the backend code

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
source "$SCRIPT_DIR/config.sh"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Updating backend...${NC}"

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
    "$BACKEND_SOURCE/" \
    ${VPS_USER}@${VPS_IP}:/home/barcode/app/backend/

echo -e "${YELLOW}Installing dependencies and restarting...${NC}"
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    cd /home/barcode/app/backend
    source venv/bin/activate
    pip install -r requirements.txt
    sudo systemctl restart barcode-api
    sleep 2
    sudo systemctl status barcode-api --no-pager
ENDSSH

echo -e "${GREEN}✓ Backend updated successfully${NC}"


