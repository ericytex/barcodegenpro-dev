# Full Rebuild Commands

Complete guide for rebuilding the Barcode Generator application locally and on VPS.

## 🏠 Local Rebuild Commands

### Option 1: Quick Rebuild (Recommended)
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Stop containers
docker compose down

# Rebuild and start
docker compose build
docker compose up -d

# Check logs
docker compose logs -f
```

### Option 2: Full Clean Rebuild
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Stop and remove containers
docker compose down

# Remove old images (optional - frees disk space)
docker compose rm -f
docker image prune -f

# Rebuild without cache (clean build)
docker compose build --no-cache

# Start fresh
docker compose up -d

# Monitor logs
docker compose logs -f
```

### Option 3: Rebuild Specific Service
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Rebuild only backend
docker compose build --no-cache backend
docker compose up -d backend

# Rebuild only frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Option 4: Rebuild with Frontend Build
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Build frontend first
cd frontend
npm install
npm run build
cd ..

# Rebuild Docker containers
docker compose build
docker compose up -d
```

## 🌐 VPS/Remote Rebuild Commands

### Step 1: Sync Code to VPS
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Option A: Use rsync script
./rsync-to-remote.sh

# Option B: Use sync script
./sync-to-vps.sh

# Option C: Manual rsync
rsync -avz --progress \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='__pycache__/' \
  --exclude='*.pyc' \
  --exclude='venv/' \
  --exclude='.git/' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='downloads/' \
  --exclude='logs/' \
  --exclude='uploads/' \
  --exclude='archives/' \
  --exclude='barcode_service.py' \
  ./ \
  deployer@194.163.134.129:~/barcodegenpro-dev/
```

### Step 2: SSH into VPS and Rebuild
```bash
# SSH into VPS
ssh deployer@194.163.134.129

# Navigate to project
cd ~/barcodegenpro-dev

# Option 1: Quick Rebuild
docker compose down
docker compose build
docker compose up -d

# Option 2: Full Clean Rebuild
docker compose down
docker compose rm -f
docker compose build --no-cache
docker compose up -d

# Option 3: Rebuild Specific Service
docker compose build --no-cache backend
docker compose up -d backend

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

### Step 3: One-Line Remote Rebuild (from local)
```bash
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose down && docker compose build --no-cache && docker compose up -d"
```

## 🔄 Complete Rebuild Workflow (Local → VPS)

### Full Deployment Script
```bash
#!/bin/bash
# Full rebuild and deploy script

set -e

LOCAL_DIR="/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev"
VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

echo "🔄 Step 1: Syncing code to VPS..."
cd "$LOCAL_DIR"
./rsync-to-remote.sh

echo ""
echo "🔄 Step 2: Rebuilding on VPS..."
ssh "$VPS_USER@$VPS_IP" << 'EOF'
cd ~/barcodegenpro-dev
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose ps
EOF

echo ""
echo "✅ Full rebuild complete!"
echo ""
echo "Check logs:"
echo "  ssh $VPS_USER@$VPS_IP 'cd ~/barcodegenpro-dev && docker compose logs -f'"
```

## 🧹 Clean Rebuild (Remove Everything)

### Local Clean Rebuild
```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# Stop and remove everything
docker compose down -v

# Remove all images
docker compose rm -f
docker image rm barcode-gen-pro-dev-backend barcode-gen-pro-dev-frontend 2>/dev/null || true

# Clean Docker system
docker system prune -f

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

### VPS Clean Rebuild
```bash
ssh deployer@194.163.134.129 << 'EOF'
cd ~/barcodegenpro-dev

# Stop and remove everything
docker compose down -v

# Remove images
docker compose rm -f
docker image prune -f

# Rebuild
docker compose build --no-cache
docker compose up -d

# Verify
docker compose ps
docker compose logs -f --tail=50
EOF
```

## 🔍 Verification Commands

### Check Container Status
```bash
# Local
docker compose ps

# Remote
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose ps"
```

### Check Health
```bash
# Local
curl http://localhost:8034/healthz
curl http://localhost:8080

# Remote
curl http://194.163.134.129:8034/healthz
curl http://194.163.134.129:8080
```

### View Logs
```bash
# Local - All services
docker compose logs -f

# Local - Backend only
docker compose logs -f backend

# Local - Frontend only
docker compose logs -f frontend

# Remote - All services
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose logs -f"

# Remote - Backend only
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose logs -f backend"
```

### Check for Errors
```bash
# Local
docker compose logs backend | grep -i error
docker compose logs frontend | grep -i error

# Remote
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose logs backend | grep -i error"
```

## 🚀 Quick Reference

### Most Common Commands

**Local Quick Rebuild:**
```bash
docker compose down && docker compose build && docker compose up -d
```

**Remote Quick Rebuild:**
```bash
./rsync-to-remote.sh && ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose down && docker compose build && docker compose up -d"
```

**Restart Only (No Rebuild):**
```bash
# Local
docker compose restart

# Remote
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose restart"
```

**View Logs:**
```bash
# Local
docker compose logs -f

# Remote
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose logs -f"
```

## 📝 Notes

- **`--no-cache`**: Forces a complete rebuild without using cached layers (slower but cleaner)
- **`-v` flag**: Removes volumes (use with caution - deletes data!)
- **`-f` flag**: Forces removal without confirmation
- Always backup database before clean rebuilds: `cp backend/data/barcode_generator.db backend/data/barcode_generator.db.backup`

## 🆘 Troubleshooting

### If rebuild fails:
1. Check Docker daemon: `docker ps`
2. Check disk space: `df -h`
3. Check logs: `docker compose logs`
4. Try clean rebuild: `docker compose down -v && docker compose build --no-cache`

### If containers won't start:
1. Check ports: `netstat -tulpn | grep 8034`
2. Check permissions: `ls -la backend/data/`
3. Check environment variables: `docker compose config`

