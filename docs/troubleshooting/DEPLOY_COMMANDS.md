# Deployment Commands

## Changes Pushed ✅
All fixes for VPS compatibility and PDF duplication have been pushed to `main` branch.

## RSYNC Commands (Sync Code to VPS)

### Option 1: Sync Backend Only (Recommended for quick updates)
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

rsync -avz --progress \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='downloads/barcodes/*' \
  --exclude='downloads/pdfs/*' \
  --exclude='logs/*' \
  --exclude='uploads/*' \
  --exclude='archives/*' \
  --exclude='node_modules' \
  backend/ \
  root@194.163.134.129:/home/barcode/app/backend/
```

### Option 2: Sync Entire Project
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

rsync -avz --progress \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='backend/downloads/barcodes/*' \
  --exclude='backend/downloads/pdfs/*' \
  --exclude='backend/logs/*' \
  --exclude='backend/uploads/*' \
  --exclude='backend/archives/*' \
  --exclude='node_modules' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/dist' \
  ./ \
  root@194.163.134.129:/home/barcode/app/
```

### Option 3: Quick Sync (Only Modified Files)
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Sync only the files we modified
rsync -avz --progress \
  backend/app.py \
  backend/services/barcode_service.py \
  backend/services/samsung_galaxy_service.py \
  backend/utils/file_utils.py \
  root@194.163.134.129:/home/barcode/app/backend/
```

## Docker Commands (On VPS)

### SSH into VPS First
```bash
ssh root@194.163.134.129
```

### Navigate to Project Directory
```bash
cd /home/barcode/app
# OR if using docker-compose.yml in root:
cd /path/to/your/project
```

### Option 1: Rebuild and Restart (Recommended)
```bash
# Stop existing containers
docker compose down

# Rebuild backend with new changes
docker compose build backend

# Start containers
docker compose up -d

# Check logs
docker compose logs -f backend
```

### Option 2: Quick Restart (If no Dockerfile changes)
```bash
# Restart backend container
docker compose restart backend

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

### Option 3: Full Rebuild (Clean slate)
```bash
# Stop and remove containers
docker compose down

# Remove old images (optional)
docker compose rm -f

# Rebuild everything
docker compose build --no-cache

# Start fresh
docker compose up -d

# Monitor logs
docker compose logs -f
```

## Verify Deployment

### Check Container Status
```bash
docker compose ps
```

### Check Backend Health
```bash
curl http://localhost:8034/healthz
```

### Check Logs for Errors
```bash
docker compose logs backend | grep -i error
docker compose logs backend | grep -i "PDF\|directory\|permission"
```

### Test PDF Generation
```bash
# Check if directories exist
docker compose exec backend ls -la /app/downloads/
docker compose exec backend ls -la /app/uploads/
docker compose exec backend ls -la /app/logs/
```

## Environment Variables (Ensure These Are Set)

If using docker-compose.yml, these should already be set:
```yaml
environment:
  - UPLOAD_DIR=/app/uploads
  - DOWNLOAD_DIR=/app/downloads
  - LOGS_DIR=/app/logs
```

If deploying without Docker, set these in your `.env` file or system environment:
```bash
export UPLOAD_DIR=/app/uploads
export DOWNLOAD_DIR=/app/downloads
export LOGS_DIR=/app/logs
```

## Quick Deploy Script

Create a file `quick-deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying to VPS..."

# Sync backend files
rsync -avz --progress \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='*.db' \
  --exclude='downloads/*' \
  --exclude='logs/*' \
  --exclude='uploads/*' \
  backend/ \
  root@194.163.134.129:/home/barcode/app/backend/

# SSH and restart
ssh root@194.163.134.129 << 'EOF'
cd /home/barcode/app
docker compose restart backend
docker compose logs -f backend --tail=50
EOF

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```

