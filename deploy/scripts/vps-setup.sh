#!/bin/bash
# VPS Initial Setup Script
# Run this ON YOUR VPS after first login

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== VPS Initial Setup for Barcode Generator ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use: sudo bash vps-setup.sh)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing required packages...${NC}"
apt install -y python3.11 python3.11-venv python3-pip nginx git curl wget sqlite3 ufw

# Install Node.js 18.x
echo -e "${YELLOW}Step 3: Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo -e "${YELLOW}Step 4: Creating application user...${NC}"
if id "barcode" &>/dev/null; then
    echo "User 'barcode' already exists"
else
    useradd -m -s /bin/bash barcode
    echo "User 'barcode' created"
fi

echo -e "${YELLOW}Step 5: Creating application directories...${NC}"
mkdir -p /home/barcode/app/backend
mkdir -p /home/barcode/app/frontend
mkdir -p /home/barcode/scripts
mkdir -p /home/barcode/backups
mkdir -p /home/barcode/app/backend/data
mkdir -p /home/barcode/app/backend/uploads
mkdir -p /home/barcode/app/backend/downloads
mkdir -p /home/barcode/app/backend/logs
mkdir -p /home/barcode/app/backend/archives

echo -e "${YELLOW}Step 6: Setting up Python virtual environment...${NC}"
cd /home/barcode/app/backend
python3.11 -m venv venv

echo -e "${YELLOW}Step 7: Setting permissions...${NC}"
chown -R barcode:barcode /home/barcode

echo -e "${YELLOW}Step 8: Configuring firewall...${NC}"
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
ufw status

echo -e "${GREEN}=== VPS Initial Setup Complete! ===${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Upload your backend code to /home/barcode/app/backend/"
echo "2. Create .env file in /home/barcode/app/backend/"
echo "3. Install Python dependencies: source venv/bin/activate && pip install -r requirements.txt"
echo "4. Copy systemd service file to /etc/systemd/system/barcode-api.service"
echo "5. Copy nginx config to /etc/nginx/sites-available/barcode-generator"
echo "6. Enable and start services"
echo ""
echo -e "${YELLOW}IP Address: $(curl -s ifconfig.me)${NC}"


