#!/bin/bash

# Webhook receiver script for auto-deploying Docker images
# This script receives webhook requests from GitHub Actions and pulls/restarts containers
#
# Usage:
#   Option 1: Run as systemd service
#   Option 2: Run with socat: socat TCP-LISTEN:9000,fork EXEC:./webhook-receiver.sh
#   Option 3: Run with nginx/caddy reverse proxy pointing to this script

set -euo pipefail

# Configuration
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_DIR="${COMPOSE_DIR:-$(pwd)}"
LOG_FILE="${LOG_FILE:-/var/log/webhook-deploy.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"
}

# Verify webhook secret (if set)
verify_signature() {
    if [ -z "$WEBHOOK_SECRET" ]; then
        log_warn "WEBHOOK_SECRET not set - skipping signature verification"
        return 0
    fi

    local signature="$1"
    local payload="$2"
    
    local computed=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)
    local expected="sha256=$computed"
    
    if [ "$signature" != "$expected" ]; then
        log_error "Signature verification failed"
        return 1
    fi
    
    return 0
}

# Main webhook handler
handle_webhook() {
    log "Webhook received"
    
    # Read HTTP request (when called via socat)
    local method="${REQUEST_METHOD:-POST}"
    local content_length="${CONTENT_LENGTH:-0}"
    local signature_header="${HTTP_X_HUB_SIGNATURE_256:-}"
    
    # Read request body from stdin
    local payload=""
    if [ "$content_length" -gt 0 ]; then
        # Read exactly content_length bytes
        payload=$(dd bs=1 count="$content_length" 2>/dev/null)
    else
        # Try to read all available input
        payload=$(cat)
    fi
    
    if [ -z "$payload" ] && [ "$content_length" -eq 0 ]; then
        log_warn "No payload received - might be a test request"
        payload="{}"
    fi
    
    log "Payload: $payload"
    
    # Verify signature if provided
    if [ -n "$signature_header" ] && [ -n "$WEBHOOK_SECRET" ]; then
        if ! verify_signature "$signature_header" "$payload"; then
            log_error "Invalid webhook signature"
            echo "HTTP/1.1 401 Unauthorized"
            echo "Content-Type: text/plain"
            echo ""
            echo "Unauthorized"
            exit 1
        fi
        log_success "Signature verified"
    fi
    
    # Change to compose directory
    cd "$COMPOSE_DIR" || {
        log_error "Failed to change to directory: $COMPOSE_DIR"
        exit 1
    }
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Compose file not found: $COMPOSE_FILE"
        echo "HTTP/1.1 500 Internal Server Error"
        echo "Content-Type: text/plain"
        echo ""
        echo "Compose file not found"
        exit 1
    fi
    
    # Pull latest images
    log "Pulling latest images from GHCR..."
    if docker compose -f "$COMPOSE_FILE" pull; then
        log_success "Images pulled successfully"
    else
        log_error "Failed to pull images"
        echo "HTTP/1.1 500 Internal Server Error"
        echo "Content-Type: text/plain"
        echo ""
        echo "Failed to pull images"
        exit 1
    fi
    
    # Restart containers
    log "Restarting containers..."
    if docker compose -f "$COMPOSE_FILE" up -d --remove-orphans; then
        log_success "Containers restarted successfully"
        
        # Show container status
        log "Container status:"
        docker compose -f "$COMPOSE_FILE" ps
        
        # Send success response
        echo "HTTP/1.1 200 OK"
        echo "Content-Type: text/plain"
        echo ""
        echo "Deployment successful"
    else
        log_error "Failed to restart containers"
        echo "HTTP/1.1 500 Internal Server Error"
        echo "Content-Type: text/plain"
        echo ""
        echo "Failed to restart containers"
        exit 1
    fi
}

# Check if running as HTTP server (socat/caddy/nginx)
if [ -n "${REQUEST_METHOD:-}" ] || [ -n "${HTTP_METHOD:-}" ]; then
    # Running via HTTP server (socat sets REQUEST_METHOD, others might set HTTP_METHOD)
    handle_webhook
elif [ ! -t 0 ]; then
    # Not a TTY and stdin is available - likely being called from a pipe
    handle_webhook
else
    # Direct execution mode (interactive/help)
    cat <<EOF
Webhook receiver script for Docker auto-deployment

USAGE:
  This script receives webhook requests and automatically pulls/restarts Docker containers.

SETUP OPTIONS:

  1. Systemd Service (Recommended):
     sudo cp deploy/webhook-receiver.service /etc/systemd/system/
     sudo nano /etc/systemd/system/webhook-receiver.service  # Edit paths/secrets
     sudo systemctl enable webhook-receiver
     sudo systemctl start webhook-receiver

  2. With socat:
     socat TCP-LISTEN:9000,fork,reuseaddr EXEC:$0

  3. With nginx/caddy reverse proxy:
     Configure reverse proxy to pass requests to this script

ENVIRONMENT VARIABLES:
  WEBHOOK_SECRET      Secret for verifying webhook signatures (optional but recommended)
  COMPOSE_FILE        Docker compose file (default: docker-compose.prod.yml)
  COMPOSE_DIR         Directory containing compose file (default: current directory)
  LOG_FILE            Log file path (default: /var/log/webhook-deploy.log)

TESTING:
  curl -X POST http://localhost:9000 \\
    -H "Content-Type: application/json" \\
    -d '{"test": true}'

EOF
    
    # If payload is available via environment, try to handle it
    if [ -n "${HTTP_BODY:-}" ]; then
        handle_webhook
    fi
fi

