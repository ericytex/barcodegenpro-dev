#!/bin/bash
# Quick Frontend Update Script
# Run this to update only the frontend

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
source "$SCRIPT_DIR/config.sh"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Building frontend...${NC}"

cd "$FRONTEND_SOURCE"

cat > .env.production << EOF
VITE_API_BASE_URL=http://${DOMAIN}/api
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_LOG_REQUESTS=false
VITE_ENABLE_DEV_TOOLS=false
VITE_SHOW_API_LOGS=false
EOF

npm install
npm run build

echo -e "${YELLOW}Deploying to VPS...${NC}"
rsync -avz --progress --delete \
    "$FRONTEND_SOURCE/dist/" \
    ${VPS_USER}@${VPS_IP}:/home/barcode/app/frontend/

ssh ${VPS_USER}@${VPS_IP} "chown -R barcode:barcode /home/barcode/app/frontend"

echo -e "${GREEN}✓ Frontend updated successfully${NC}"
echo -e "Visit: ${YELLOW}http://${DOMAIN}${NC}"


