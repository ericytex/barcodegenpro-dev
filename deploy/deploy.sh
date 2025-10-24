#!/bin/bash
# Master Deployment Script
# Run this from your LOCAL machine to deploy everything

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load configuration
if [ ! -f "$SCRIPT_DIR/config.sh" ]; then
    echo -e "${RED}❌ Error: config.sh not found${NC}"
    exit 1
fi

source "$SCRIPT_DIR/config.sh"

# Validate configuration
if ! validate_config; then
    echo ""
    echo -e "${YELLOW}Please edit config.sh with your VPS details before deploying${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║          Barcode Generator - Master Deployment            ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  VPS IP:      ${YELLOW}$VPS_IP${NC}"
echo -e "  Domain:      ${YELLOW}$DOMAIN${NC}"
echo -e "  VPS User:    ${YELLOW}$VPS_USER${NC}"
echo ""

# Ask for confirmation
read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"
echo ""

# ============================================
# PHASE 1: Setup VPS
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 Phase 1/8: Setting up VPS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Uploading VPS setup script..."
scp -o StrictHostKeyChecking=no "$SCRIPT_DIR/scripts/vps-setup.sh" ${VPS_USER}@${VPS_IP}:/tmp/

echo "Running VPS setup (this may take several minutes)..."
ssh ${VPS_USER}@${VPS_IP} "bash /tmp/vps-setup.sh"

echo -e "${GREEN}✓ VPS setup complete${NC}"
echo ""

# ============================================
# PHASE 2: Deploy Backend Configuration
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⚙️  Phase 2/8: Configuring Backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Creating backend .env file..."
cat > /tmp/backend.env << EOF
API_HOST=${API_HOST}
API_PORT=${API_PORT}
API_WORKERS=${API_WORKERS}
CORS_ORIGINS=http://${DOMAIN},https://${DOMAIN}
SECRET_KEY=${SECRET_KEY}
LOG_LEVEL=INFO
LOG_FILE=/home/barcode/app/backend/logs/app.log
UPLOAD_DIR=/home/barcode/app/backend/uploads
DOWNLOAD_DIR=/home/barcode/app/backend/downloads
LOGS_DIR=/home/barcode/app/backend/logs
EOF

echo "Uploading .env file..."
scp /tmp/backend.env ${VPS_USER}@${VPS_IP}:/home/barcode/app/backend/.env
rm /tmp/backend.env

echo "Uploading systemd service file..."
scp "$SCRIPT_DIR/configs/barcode-api.service" ${VPS_USER}@${VPS_IP}:/etc/systemd/system/

echo -e "${GREEN}✓ Backend configuration complete${NC}"
echo ""

# ============================================
# PHASE 3: Deploy Backend Code
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🐍 Phase 3/8: Deploying Backend Code${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Syncing backend files..."
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

echo "Installing Python dependencies..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    cd /home/barcode/app/backend
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Create necessary directories
    mkdir -p data uploads downloads logs archives
    
    # Set ownership
    chown -R barcode:barcode /home/barcode/app/backend
ENDSSH

echo "Starting backend service..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    systemctl daemon-reload
    systemctl enable barcode-api
    systemctl restart barcode-api
    sleep 3
    systemctl status barcode-api --no-pager
ENDSSH

echo -e "${GREEN}✓ Backend deployment complete${NC}"
echo ""

# ============================================
# PHASE 4: Build and Deploy Frontend
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⚛️  Phase 4/8: Building and Deploying Frontend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$FRONTEND_SOURCE"

echo "Creating production environment file..."
cat > .env.production << EOF
VITE_API_BASE_URL=https://${DOMAIN}/
VITE_ENVIRONMENT=production
VITE_DEBUG=false
VITE_LOG_REQUESTS=false
VITE_ENABLE_DEV_TOOLS=false
VITE_SHOW_API_LOGS=false
EOF

echo "Installing dependencies..."
npm install

echo "Building production bundle..."
npm run build

echo "Deploying to VPS..."
rsync -avz --progress --delete \
    "$FRONTEND_SOURCE/dist/" \
    ${VPS_USER}@${VPS_IP}:/home/barcode/app/frontend/

ssh ${VPS_USER}@${VPS_IP} "chown -R barcode:barcode /home/barcode/app/frontend && chmod -R 755 /home/barcode/app/frontend"

echo -e "${GREEN}✓ Frontend deployment complete${NC}"
echo ""

# ============================================
# PHASE 5: Configure Nginx
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 Phase 5/8: Configuring Nginx${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create nginx config with proper domain
cat > /tmp/nginx-barcode-generator << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend - React SPA
    location / {
        root /home/barcode/app/frontend;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
        
        # Enable gzip compression
        gzip on;
        gzip_vary on;
        gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    }

    # Backend API routes
    location /api {
        proxy_pass http://127.0.0.1:8034;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Direct backend routes (non-API endpoints)
    location ~ ^/(database|archive|devices|health|healthz|docs|redoc|generate-barcode|upload-excel) {
        proxy_pass http://127.0.0.1:8034;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # File upload size limit
    client_max_body_size 50M;
    client_body_timeout 300s;

    # Access and error logs
    access_log /var/log/nginx/barcode-access.log;
    error_log /var/log/nginx/barcode-error.log;
}
EOF

echo "Uploading nginx configuration..."
scp /tmp/nginx-barcode-generator ${VPS_USER}@${VPS_IP}:/etc/nginx/sites-available/barcode-generator
rm /tmp/nginx-barcode-generator

echo "Enabling nginx site..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    ln -sf /etc/nginx/sites-available/barcode-generator /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
ENDSSH

echo -e "${GREEN}✓ Nginx configuration complete${NC}"
echo ""

# ============================================
# PHASE 6: Setup Database Backups
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}💾 Phase 6/8: Setting up Database Backups${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Uploading backup script..."
scp "$SCRIPT_DIR/scripts/backup-db.sh" ${VPS_USER}@${VPS_IP}:/home/barcode/scripts/

echo "Setting up automated backups..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    chmod +x /home/barcode/scripts/backup-db.sh
    chown barcode:barcode /home/barcode/scripts/backup-db.sh
    
    # Add cron job as barcode user (backup every 6 hours)
    (crontab -u barcode -l 2>/dev/null; echo "0 */6 * * * /home/barcode/scripts/backup-db.sh >> /home/barcode/backups/backup.log 2>&1") | crontab -u barcode -
    
    echo "Cron job added for database backups"
ENDSSH

echo -e "${GREEN}✓ Database backup setup complete${NC}"
echo ""

# ============================================
# PHASE 7: Configure Firewall
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔒 Phase 7/8: Configuring Firewall${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    ufw --force reset
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    ufw status numbered
ENDSSH

echo -e "${GREEN}✓ Firewall configuration complete${NC}"
echo ""

# ============================================
# PHASE 8: Testing and Verification
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🧪 Phase 8/8: Testing Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Waiting for services to stabilize..."
sleep 5

echo "Testing backend health endpoint..."
ssh ${VPS_USER}@${VPS_IP} "curl -s http://localhost:8034/healthz" || echo "Warning: Backend health check failed"

echo "Checking service status..."
ssh ${VPS_USER}@${VPS_IP} "systemctl is-active barcode-api" || echo "Warning: Backend service not active"
ssh ${VPS_USER}@${VPS_IP} "systemctl is-active nginx" || echo "Warning: Nginx service not active"

echo -e "${GREEN}✓ Testing complete${NC}"
echo ""

# ============================================
# Deployment Complete
# ============================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║              ${GREEN}✓ Deployment Complete!${BLUE}                         ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Configure DNS in Cloudflare:${NC}"
echo -e "   - Go to: https://dash.cloudflare.com"
echo -e "   - Add A record: @ → ${VPS_IP}"
echo -e "   - Proxy status: DNS only (grey cloud)"
echo ""
echo -e "2. ${YELLOW}Wait for DNS propagation${NC} (5-30 minutes)"
echo -e "   - Test with: ${BLUE}nslookup ${DOMAIN}${NC}"
echo ""
echo -e "3. ${YELLOW}Test your application:${NC}"
echo -e "   - Frontend: ${BLUE}http://${DOMAIN}${NC}"
echo -e "   - API Health: ${BLUE}http://${DOMAIN}/healthz${NC}"
echo -e "   - API Docs: ${BLUE}http://${DOMAIN}/docs${NC}"
echo ""
echo -e "4. ${YELLOW}After HTTP works, setup HTTPS:${NC}"
echo -e "   - Run: ${BLUE}bash $SCRIPT_DIR/scripts/setup-https.sh${NC}"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  View backend logs:  ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'journalctl -u barcode-api -f'${NC}"
echo -e "  View nginx logs:    ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'tail -f /var/log/nginx/barcode-error.log'${NC}"
echo -e "  Restart backend:    ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'systemctl restart barcode-api'${NC}"
echo -e "  Restart nginx:      ${BLUE}ssh ${VPS_USER}@${VPS_IP} 'systemctl restart nginx'${NC}"
echo ""
echo -e "${GREEN}Deployment Summary:${NC}"
echo -e "  VPS IP:       ${YELLOW}${VPS_IP}${NC}"
echo -e "  Domain:       ${YELLOW}${DOMAIN}${NC}"
echo -e "  Backend Port: ${YELLOW}${API_PORT}${NC}"
echo -e "  App User:     ${YELLOW}barcode${NC}"
echo ""
echo -e "${GREEN}🎉 Happy deploying!${NC}"
echo ""


