#!/bin/bash
# View Application Logs
# Quick script to view various logs

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
source "$SCRIPT_DIR/config.sh"

BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Log Viewer Menu                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "1) Backend logs (live)"
echo "2) Nginx access logs (live)"
echo "3) Nginx error logs (live)"
echo "4) Backend logs (last 50 lines)"
echo "5) Service status"
echo "6) Exit"
echo ""
read -p "Select option [1-6]: " option

case $option in
    1)
        echo -e "${YELLOW}Showing backend logs (Ctrl+C to exit)...${NC}"
        ssh ${VPS_USER}@${VPS_IP} "journalctl -u barcode-api -f"
        ;;
    2)
        echo -e "${YELLOW}Showing nginx access logs (Ctrl+C to exit)...${NC}"
        ssh ${VPS_USER}@${VPS_IP} "tail -f /var/log/nginx/barcode-access.log"
        ;;
    3)
        echo -e "${YELLOW}Showing nginx error logs (Ctrl+C to exit)...${NC}"
        ssh ${VPS_USER}@${VPS_IP} "tail -f /var/log/nginx/barcode-error.log"
        ;;
    4)
        echo -e "${YELLOW}Last 50 backend log entries:${NC}"
        ssh ${VPS_USER}@${VPS_IP} "journalctl -u barcode-api -n 50"
        ;;
    5)
        echo -e "${YELLOW}Service Status:${NC}"
        ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
            echo "=== Backend Service ==="
            systemctl status barcode-api --no-pager
            echo ""
            echo "=== Nginx Service ==="
            systemctl status nginx --no-pager
            echo ""
            echo "=== Disk Usage ==="
            df -h /home/barcode
            echo ""
            echo "=== Memory Usage ==="
            free -h
ENDSSH
        ;;
    6)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac


