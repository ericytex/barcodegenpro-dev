#!/bin/bash
# Deployment Configuration
# Edit these values before deploying

# ============================================
# REQUIRED: Update these with your details
# ============================================

# Your VPS IP address
VPS_IP="194.163.134.129"

# Your domain name (without http://)
DOMAIN="aistoryshorts.com"

# VPS SSH user (usually 'root' for fresh VPS)
VPS_USER="root"

# Secret key for backend (generate with: openssl rand -hex 32)
SECRET_KEY="8d2d4974fd49be420e1a7515000517441b8bafd8d86ea6fe0be28efcfb4e97fb"

# ============================================
# AUTO-CONFIGURED (usually don't need to change)
# ============================================

# Local paths (relative to this script)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_SOURCE="$SCRIPT_DIR/../backend"
FRONTEND_SOURCE="$SCRIPT_DIR/../frontend"

# Remote paths on VPS
REMOTE_APP_DIR="/home/barcode/app"
REMOTE_BACKEND_DIR="$REMOTE_APP_DIR/backend"
REMOTE_FRONTEND_DIR="$REMOTE_APP_DIR/frontend"
REMOTE_SCRIPTS_DIR="/home/barcode/scripts"
REMOTE_BACKUPS_DIR="/home/barcode/backups"

# Application settings
API_PORT="8034"
API_HOST="127.0.0.1"
API_WORKERS="2"

# ============================================
# Validation
# ============================================

validate_config() {
    local errors=0
    
    if [ "$VPS_IP" = "YOUR_VPS_IP" ]; then
        echo "❌ Error: Please set VPS_IP in config.sh"
        errors=$((errors + 1))
    fi
    
    if [ "$DOMAIN" = "YOUR_DOMAIN.com" ]; then
        echo "❌ Error: Please set DOMAIN in config.sh"
        errors=$((errors + 1))
    fi
    
    if [ "$SECRET_KEY" = "CHANGE_THIS_TO_A_RANDOM_SECRET_KEY" ]; then
        echo "❌ Error: Please generate and set SECRET_KEY in config.sh"
        echo "   Generate one with: openssl rand -hex 32"
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ]; then
        return 1
    fi
    
    return 0
}

# Export variables for use in other scripts
export VPS_IP DOMAIN VPS_USER SECRET_KEY
export SCRIPT_DIR BACKEND_SOURCE FRONTEND_SOURCE
export REMOTE_APP_DIR REMOTE_BACKEND_DIR REMOTE_FRONTEND_DIR REMOTE_SCRIPTS_DIR REMOTE_BACKUPS_DIR
export API_PORT API_HOST API_WORKERS


