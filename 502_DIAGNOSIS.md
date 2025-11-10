# 502 Bad Gateway Error - Diagnosis Guide

## Problem
When uploading an Excel file, you get:
```
POST http://194.163.134.129:8080/api/barcodes/upload-excel 502 (Bad Gateway)
```

## What 502 Bad Gateway Means
A **502 Bad Gateway** error means:
- **Nginx (frontend container) received the request** ✅
- **Nginx tried to proxy to the backend** ✅
- **Backend is NOT responding or NOT accessible** ❌

## Step-by-Step Diagnosis

### Step 1: Check if Backend Container is Running

**On your VPS, run:**
```bash
docker ps
```

**Expected output should show:**
```
CONTAINER ID   IMAGE                    STATUS         PORTS                    NAMES
xxx            barcode-v2-backend      Up X minutes   0.0.0.0:8034->8034/tcp   barcode-v2-backend
xxx            barcode-v2-frontend      Up X minutes   0.0.0.0:8080->80/tcp     barcode-v2-frontend
```

**If backend is NOT running:**
```bash
# Check logs
docker logs barcode-v2-backend

# Restart backend
docker-compose restart backend

# Or rebuild and start
cd /home/deployer/barcodegenpro-dev
docker-compose up -d --build backend
```

### Step 2: Check Backend Health

**Test backend directly (bypassing Nginx):**
```bash
# From VPS
curl http://localhost:8034/healthz

# Or from your local machine
curl http://194.163.134.129:8034/healthz
```

**Expected response:**
```json
{"status":"healthy","timestamp":"..."}
```

**If this fails:**
- Backend is not running or crashed
- Check `docker logs barcode-v2-backend` for errors

### Step 3: Check Network Connectivity

**From frontend container, test backend:**
```bash
# Enter frontend container
docker exec -it barcode-v2-frontend sh

# Test backend connectivity
wget -O- http://backend:8034/healthz
# OR
curl http://backend:8034/healthz
```

**If this fails:**
- Docker network issue
- Backend service name mismatch
- Check `docker-compose.yml` network configuration

### Step 4: Check Nginx Configuration

**Verify nginx.conf is correct:**
```bash
# Check nginx config inside frontend container
docker exec barcode-v2-frontend cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /api"
```

**Should show:**
```nginx
location /api/ {
    proxy_pass http://backend:8034;
    ...
}
```

**NOT:**
```nginx
proxy_pass http://backend:8034/api/;  # ❌ WRONG - causes double /api
```

### Step 5: Check Backend Logs for Errors

**View real-time logs:**
```bash
docker logs -f barcode-v2-backend
```

**Then try uploading the Excel file again and watch for errors.**

**Common backend errors:**
- Database connection issues
- Missing dependencies
- Permission errors on uploads directory
- Port already in use

### Step 6: Check Backend Container Resources

**Check if backend is out of memory:**
```bash
docker stats barcode-v2-backend
```

**If memory is maxed out:**
- Backend may be crashing
- Increase memory limits in `docker-compose.yml`

## Quick Fixes

### Fix 1: Restart All Services
```bash
cd /home/deployer/barcodegenpro-dev
docker-compose down
docker-compose up -d
```

### Fix 2: Rebuild Backend
```bash
cd /home/deployer/barcodegenpro-dev
docker-compose build backend
docker-compose up -d backend
```

### Fix 3: Check Backend Port Binding
```bash
# Verify backend is listening on port 8034
netstat -tlnp | grep 8034
# OR
ss -tlnp | grep 8034
```

**Should show:**
```
tcp  0  0  0.0.0.0:8034  0.0.0.0:*  LISTEN  <PID>/python
```

### Fix 4: Verify Docker Network
```bash
# Check if containers are on same network
docker network inspect barcode-gen-pro-dev_barcode-v2-network
```

**Both containers should be listed in the network.**

## Most Likely Causes

1. **Backend container crashed** - Check `docker logs barcode-v2-backend`
2. **Backend not started** - Run `docker-compose up -d backend`
3. **Database permission issues** - Backend can't access database file
4. **Port conflict** - Another service using port 8034
5. **Network misconfiguration** - Containers can't communicate

## Verification Steps

After applying fixes, verify:

1. **Backend health:**
   ```bash
   curl http://194.163.134.129:8034/healthz
   ```

2. **Through Nginx:**
   ```bash
   curl http://194.163.134.129:8080/api/healthz
   ```

3. **Upload endpoint (with auth):**
   ```bash
   curl -X POST http://194.163.134.129:8080/api/barcodes/upload-excel \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test.xlsx"
   ```

## Next Steps

1. Run the diagnosis steps above
2. Share the output of `docker logs barcode-v2-backend`
3. Share the output of `docker ps`
4. Share the output of `curl http://localhost:8034/healthz` from VPS

This will help identify the exact issue.





