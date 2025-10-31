# Deployment Files

This directory contains files for deploying the Barcode Generator application to production servers.

## Files

- **webhook-receiver.sh**: Script that receives webhook requests and automatically pulls/restarts Docker containers
- **webhook-receiver.service**: Systemd service file for running the webhook receiver
- **docker-compose.prod.yml**: Production Docker Compose configuration using GHCR images
- **GHCR_SETUP.md**: Complete setup guide for GHCR CI/CD automation

## Quick Start

1. Follow the setup guide in `GHCR_SETUP.md`
2. Copy `docker-compose.prod.yml` to your server
3. Configure environment variables in `.env`
4. Setup webhook receiver (systemd service or reverse proxy)
5. Push to main branch - images build automatically and server updates!

## Manual Deployment

If you need to manually deploy:

```bash
# On remote server
cd /opt/barcode-gen-pro
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Webhook Endpoint

The webhook receiver listens on port 9000 by default. Configure GitHub Actions to POST to:

- Direct: `http://your-server-ip:9000`
- Reverse proxy: `https://your-domain.com/webhook`

Ensure firewall allows connections and use HTTPS in production.
