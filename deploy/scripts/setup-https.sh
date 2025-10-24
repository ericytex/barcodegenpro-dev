#!/bin/bash
# HTTPS Setup Script - Run after HTTP deployment works
# This script installs Let's Encrypt SSL certificates

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
source "$SCRIPT_DIR/config.sh"

if ! validate_config; then
    echo "Error: Invalid configuration"
    exit 1
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║                   HTTPS Setup with Let's Encrypt          ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "  1. Install Certbot"
echo "  2. Obtain SSL certificates from Let's Encrypt"
echo "  3. Configure Nginx for HTTPS"
echo "  4. Setup auto-renewal"
echo ""
echo -e "${YELLOW}Prerequisites:${NC}"
echo "  - HTTP deployment must be working"
echo "  - DNS must point to your VPS"
echo "  - Domain must be accessible via HTTP"
echo ""

read -p "$(echo -e ${YELLOW}Continue with HTTPS setup? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "HTTPS setup cancelled"
    exit 1
fi

echo ""
echo -e "${GREEN}Installing Certbot...${NC}"
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    apt update
    apt install -y certbot python3-certbot-nginx
ENDSSH

echo ""
echo -e "${GREEN}Obtaining SSL certificate...${NC}"
echo -e "${YELLOW}Note: This may prompt you for an email address${NC}"

ssh ${VPS_USER}@${VPS_IP} << ENDSSH
    certbot --nginx \
        -d ${DOMAIN} \
        -d www.${DOMAIN} \
        --non-interactive \
        --agree-tos \
        --redirect \
        --register-unsafely-without-email
ENDSSH

echo ""
echo -e "${GREEN}Testing auto-renewal...${NC}"
ssh ${VPS_USER}@${VPS_IP} "certbot renew --dry-run"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║              ${GREEN}✓ HTTPS Setup Complete!${BLUE}                        ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Your site is now accessible via HTTPS:${NC}"
echo -e "  ${BLUE}https://${DOMAIN}${NC}"
echo ""
echo -e "${GREEN}SSL Certificate Details:${NC}"
ssh ${VPS_USER}@${VPS_IP} "certbot certificates"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test your site: https://${DOMAIN}"
echo "  2. Enable Cloudflare proxy (orange cloud) in DNS settings"
echo "  3. Update frontend .env if needed to use https://"
echo ""


