# Safe Setup - When Containers Are Already Running

If you already have containers running and want to set up GHCR deployment **without disrupting** them:

## Step 1: Run Setup Script (Safe - Won't Touch Running Containers)

```bash
cd ~/barcodegen-v2  # or your repo path
sudo ./deploy/setup-remote-server.sh
```

The script will:
- ✅ Detect your running containers
- ✅ Only set up files (won't stop/restart anything)
- ✅ Leave your containers running as-is

## Step 2: Review What Was Created

```bash
# Check what was set up
ls -la /opt/barcode-gen-pro/

# Review the production compose file
cat /opt/barcode-gen-pro/docker-compose.prod.yml

# Check webhook receiver
ls -la /opt/barcode-gen-pro/deploy/
```

## Step 3: Configure Environment (When Ready)

```bash
cd /opt/barcode-gen-pro
sudo nano .env
```

Add:
```env
SECRET_KEY=your-secret-key
DATABASE_PATH=/app/data/barcode_generator.db
LOG_LEVEL=INFO
CORS_ORIGINS=http://194.163.134.129,http://194.163.134.129:8080
```

## Step 4: Switch to GHCR Images (Later, When Ready)

When you're ready to migrate from local builds to GHCR images:

**Option A: Use migration script**
```bash
cd ~/barcodegen-v2
sudo ./deploy/migrate-to-ghcr.sh
```

**Option B: Manual migration**
```bash
# 1. Login to GHCR
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u ericytex --password-stdin

# 2. Pull GHCR images (doesn't affect running containers)
cd /opt/barcode-gen-pro
docker compose -f docker-compose.prod.yml pull

# 3. When ready, stop old and start new
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## What Won't Happen

- ❌ Your running containers will NOT be stopped
- ❌ Your current setup will NOT be disrupted
- ❌ No data will be lost
- ✅ Files will be ready for when you want to switch

## Quick Reference

```bash
# Just set up files (safe)
sudo ./deploy/setup-remote-server.sh

# Migrate later when ready
sudo ./deploy/migrate-to-ghcr.sh

# Or manually when you want
cd /opt/barcode-gen-pro
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

