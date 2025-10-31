# Deployment Guide - Production Server

## Server Details
- **IP Address:** 194.163.134.129
- **Username:** deployer
- **Remote Path:** /Documents/Research/BARCODE-GENERATOR/barcodegen-v2
- **Port Configuration:** v2 uses port **8035** for backend, **80** for frontend
- **Container Names:** barcode-v2-backend, barcode-v2-frontend

## COPY-PASTE READY COMMANDS

### Step 1: Backup Local Database

```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev
cp backend/data/barcode_generator.db backend/data/barcode_generator_backup_$(date +%Y%m%d_%H%M%S).db
echo "✓ Local backup created"
```

### Step 2: Clean Up Before Transfer (Optional - Saves Time)

```bash
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev
rm -rf frontend/node_modules
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
rm -rf backend/downloads/barcodes/*
rm -rf backend/downloads/pdfs/*
echo "✓ Cleanup complete"
```

### Step 3: Transfer Files with rsync (MAIN COMMAND)

```bash
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  --exclude 'backend/downloads/barcodes/*' \
  --exclude 'backend/downloads/pdfs/*' \
  --exclude 'backend/logs/*' \
  /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/ \
  deployer@194.163.134.129:/Documents/Research/BARCODE-GENERATOR/barcodegen-v2/
```

**Wait 5-10 minutes** - Progress bar will show transfer status

### Step 4: SSH into Server

```bash
ssh deployer@194.163.134.129
```

Then on the server:

```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2
pwd  # Verify you're in: /Documents/Research/BARCODE-GENERATOR/barcodegen-v2
ls -la  # Check files transferred successfully
```

### Step 5: Backup Server Database & Stop V1

```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2

# Backup current database
cp backend/data/barcode_generator.db backend/data/barcode_generator_backup_$(date +%Y%m%d).db

# IMPORTANT: Stop v1 since both v1 and v2 use port 80
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v1
docker compose down

echo "✓ v1 stopped, ready to deploy v2"
```

### Step 6: Configure Environment

```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2

# Copy environment template
cp env.docker.example .env

# Edit with your production settings
x`
```

**Update these in .env:**
- `SECRET_KEY` - Your secret key
- `DOMAIN` - Set to `194.163.134.129`
- `API_PORT` - Already set to `8035` (updated in env.docker.example)

**Save:** Ctrl+X, then Y, then Enter

### Step 7: Build and Deploy

```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2

# Build fresh images (takes 3-5 minutes)
docker compose build --no-cache

# Start containers in background
docker compose up -d

# Monitor backend startup logs
docker logs -f barcode-backend
```

**Wait for:** "API startup complete" or "Collections synced to database"
**Then press:** Ctrl+C to stop following logs

### Step 8: Verify Deployment

```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2

# Check containers are running
docker compose ps
# Should show: barcode-v2-backend (port 8035) and barcode-v2-frontend (port 80)

# Test health endpoints
curl http://localhost/healthz
curl http://localhost:8035/api/health

# Check database - should show user count
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;"

# Check Collections table was created
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM collections;"

# View recent logs
docker logs barcode-v2-backend --tail 50
docker logs barcode-v2-frontend --tail 20
```

### Step 9: Access Application

**From your browser:**

Visit: **http://194.163.134.129**

**Port Information:**
- Frontend: Port 80 (http://194.163.134.129)
- Backend API: Port 8035 (internal, proxied through frontend)
- v1: Stop v1 before starting v2 (both use port 80)

**Important:** You must stop v1 before starting v2 since both use port 80.

**Test Checklist:**
- [ ] Login with existing account
- [ ] Token balance displays correctly
- [ ] Generate a barcode
- [ ] Test token purchase (mobile money)
- [ ] Check settings page (all tabs work)
- [ ] Verify Collections API syncing (check logs every 2 seconds)

### Step 10: Monitor Background Services

```bash
# Watch Collections sync running every 2 seconds
docker logs -f barcode-v2-backend | grep "Collections"

# Should see every 2 seconds:
# "Collections synced to database"
# "✅ Credited X pending purchases" (when tokens confirmed)
```

## For Future Updates (Fast Incremental - 30 seconds)

```bash
# Local machine - only syncs changed files
rsync -avz --progress --delete \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude 'backend/data/*.db*' \
  --exclude 'backend/logs/*' \
  /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/ \
  deployer@194.163.134.129:/Documents/Research/BARCODE-GENERATOR/barcodegen-v2/

# On server - quick rebuild and restart (stop v1 first if running)
ssh deployer@194.163.134.129
docker stop barcode-backend barcode-frontend 2>/dev/null  # Stop v1
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2
docker compose up -d --build
```

## Rollback Plan (If Something Goes Wrong)

```bash
ssh deployer@194.163.134.129
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2

# Stop v2 containers
docker compose down

# Restore previous database
cp backend/data/barcode_generator_backup_*.db backend/data/barcode_generator.db

# Or switch back to v1
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v1
docker compose up -d
```

## Troubleshooting

### Port Already in Use Error
```bash
# Check what's using port 8035
sudo netstat -tulpn | grep 8035

# If something is using it, stop it or change port in docker-compose.yml
```

### Container Fails to Start
```bash
# Check detailed logs
docker logs barcode-backend
docker logs barcode-frontend

# Rebuild without cache
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database Permission Issues
```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2
sudo chown -R deployer:deployer backend/data/
chmod 664 backend/data/barcode_generator.db
```

## Quick Reference Commands

**Check status:**
```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2 && docker compose ps
```

**View logs:**
```bash
docker logs barcode-backend --tail 100 --follow
```

**Restart services:**
```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2 && docker compose restart
```

**Stop services:**
```bash
cd /Documents/Research/BARCODE-GENERATOR/barcodegen-v2 && docker compose down
```

## Summary of Changes

### Port Configuration
- **v1 (existing):** Port 80 frontend, 8034 backend (stops before v2 starts)
- **v2 (new):** Port 80 frontend, 8035 backend (deployed to barcodegen-v2 directory)
- **Container Names:** barcode-v2-backend, barcode-v2-frontend

### Benefits
✅ No port conflicts (v1 stops before v2 starts)
✅ Clean v2 deployment
✅ Easy rollback if needed
✅ v2 has improved token crediting system

### Files Updated
- `docker-compose.yml` - Changed port from 8034 to 8035, unique container names
- `frontend/nginx.conf` - Updated proxy_pass to use port 8035
- `env.docker.example` - Updated API_PORT to 8035

### Container Names Changed (No More Conflicts)
- Backend: `barcode-backend` → `barcode-v2-backend`
- Frontend: `barcode-frontend` → `barcode-v2-frontend`
- Network: `barcode-network` → `barcode-v2-network`
- Volumes: All prefixed with `-v2` (e.g., `backend-data-v2`)

