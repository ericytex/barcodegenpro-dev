# GHCR CI/CD Setup Guide

This guide walks you through setting up automated Docker image builds and deployments using GitHub Actions and GitHub Container Registry (GHCR).

## Overview

- **GitHub Actions** builds Docker images on every push to `main` and git tags
- Images are pushed to **GHCR** (`ghcr.io/ericytex/barcode-backend` and `ghcr.io/ericytex/barcode-frontend`)
- Remote server automatically pulls and restarts containers when new images are available

## Step 1: GitHub Repository Setup

### 1.1 Enable GitHub Packages

1. Go to your repository: `https://github.com/ericytex/barcodegenpro-dev`
2. Go to Settings → Actions → General
3. Under "Workflow permissions", select "Read and write permissions"
4. Check "Allow GitHub Actions to create and approve pull requests"

### 1.2 Make Packages Public (Optional)

If you want public images:
1. Go to https://github.com/orgs/ericytex/packages
2. Find your packages (`barcode-backend` and `barcode-frontend`)
3. Click on each package → Package settings → Change visibility → Make public

## Step 2: Configure Remote Server

### 2.1 Install Dependencies

```bash
# Install socat for webhook receiver (if not already installed)
sudo apt-get update
sudo apt-get install -y socat docker.io docker-compose-plugin

# Add your user to docker group (if needed)
sudo usermod -aG docker $USER
```

### 2.2 Setup Deployment Directory

**Option A: Use the setup script (Easiest)**

If you have the repository on your server, use the automated setup script:

```bash
# From within the repository directory
cd /path/to/barcodegenpro-dev
sudo ./deploy/setup-remote-server.sh
```

This script will:
- Create `/opt/barcode-gen-pro` directory
- Copy all necessary files
- Set correct permissions
- Create `.env.example` template

Then edit the `.env` file:
```bash
cd /opt/barcode-gen-pro
sudo cp .env.example .env
sudo nano .env
```

**Option B: Clone repository directly**

```bash
# On your remote server
cd /opt
sudo git clone git@github.com:ericytex/barcodegenpro-dev.git barcode-gen-pro
cd /opt/barcode-gen-pro

# Run setup script
sudo ./deploy/setup-remote-server.sh

# Edit environment file
sudo nano .env
```

**Option C: Manual file copy**

If you need to copy files manually (e.g., via SCP or downloaded ZIP):

1. First, upload/copy these files to your server:
   - `docker-compose.prod.yml`
   - `deploy/webhook-receiver.sh`
   - `deploy/webhook-receiver.service`

2. Then run these commands on your server:
```bash
# Create deployment directory
sudo mkdir -p /opt/barcode-gen-pro
cd /opt/barcode-gen-pro

# Copy docker-compose.prod.yml (wherever you saved it)
sudo cp ~/Downloads/docker-compose.prod.yml .
# OR: sudo cp /tmp/docker-compose.prod.yml .

# Copy webhook receiver script
sudo mkdir -p deploy
sudo cp ~/Downloads/webhook-receiver.sh deploy/
sudo chmod +x deploy/webhook-receiver.sh

# Create environment file
sudo nano .env
```

**What to put in `.env`:**

```env
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32
DATABASE_PATH=/app/data/barcode_generator.db
LOG_LEVEL=INFO
CORS_ORIGINS=http://194.163.134.129,http://194.163.134.129:8080
```

**Generate a secure SECRET_KEY:**
```bash
openssl rand -hex 32
```

### 2.3 Login to GHCR (for pulling images)

```bash
# Create GitHub Personal Access Token with `read:packages` permission
# Go to: https://github.com/settings/tokens

# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin
```

### 2.4 Setup Webhook Receiver

**Option A: Using systemd service (Recommended)**

```bash
# Copy service file
sudo cp deploy/webhook-receiver.service /etc/systemd/system/

# Edit service file
sudo nano /etc/systemd/system/webhook-receiver.service

# Update WEBHOOK_SECRET in the service file
# Update paths if different from /opt/barcode-gen-pro

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable webhook-receiver
sudo systemctl start webhook-receiver

# Check status
sudo systemctl status webhook-receiver
```

**Option B: Using nginx/caddy reverse proxy**

Create nginx config:
```nginx
location /webhook {
    proxy_pass http://127.0.0.1:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
}
```

### 2.5 Configure Firewall

```bash
# Allow webhook port (if using direct connection)
sudo ufw allow 9000/tcp

# Or configure reverse proxy (nginx/caddy) to handle SSL termination
```

## Step 3: GitHub Secrets Configuration

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

### Required Secrets

- **WEBHOOK_URL**: `http://194.163.134.129:9000/webhook` (or your domain)
- **WEBHOOK_SECRET**: A random secret string (use same value on server)

Generate secret:
```bash
openssl rand -hex 32
```

## Step 4: Test the Setup

### 4.1 Test Image Build

1. Push a commit to `main` branch:
```bash
git add .
git commit -m "Setup GHCR CI/CD"
git push origin main
```

2. Check GitHub Actions: https://github.com/ericytex/barcodegenpro-dev/actions
3. Verify images in GHCR: https://github.com/orgs/ericytex/packages

### 4.2 Test Manual Pull on Server

```bash
cd /opt/barcode-gen-pro
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 4.3 Test Webhook

```bash
# From your local machine or GitHub Actions
curl -X POST http://194.163.134.129:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{}' | openssl dgst -sha256 -hmac 'your-webhook-secret' | cut -d' ' -f2)" \
  -d '{"test": true}'
```

## Step 5: Using Semantic Versioning

When creating a release:

```bash
# Create and push a tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

This will:
- Build images with tag `v1.0.0`
- Also tag as `latest`
- Trigger webhook to update remote server

## Workflow Overview

1. **Developer workflow:**
   ```bash
   # Make changes
   git add .
   git commit -m "Feature: Add new feature"
   git push origin main
   
   # Or create release
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```

2. **GitHub Actions:**
   - Triggers on push to `main` or tag creation
   - Builds backend and frontend images
   - Pushes to GHCR with appropriate tags
   - Triggers webhook (if configured)

3. **Remote Server:**
   - Receives webhook
   - Pulls latest images
   - Restarts containers
   - Application updated!

## Troubleshooting

### Images not appearing in GHCR

- Check GitHub Actions workflow logs
- Ensure `GITHUB_TOKEN` has `packages: write` permission
- Verify repository settings allow Actions to write packages

### Webhook not triggering

- Check webhook receiver service status: `sudo systemctl status webhook-receiver`
- Check logs: `sudo tail -f /var/log/webhook-deploy.log`
- Verify firewall allows connections on webhook port
- Test webhook manually with curl

### Authentication errors pulling images

```bash
# Re-authenticate with GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin
```

### Containers not updating

```bash
# Force pull and recreate
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

## Security Notes

- Always use HTTPS for webhook endpoints in production
- Keep `WEBHOOK_SECRET` secure and rotate regularly
- Use firewall rules to restrict webhook endpoint access
- Consider using GitHub IP allowlist for webhook endpoint
- Regularly update Docker images and base images

## Local Development

For local development, you can still build locally:

```yaml
# In docker-compose.yml, uncomment build sections
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
```

Or use the GHCR images:
```yaml
backend:
  image: ghcr.io/ericytex/barcode-backend:latest
```

