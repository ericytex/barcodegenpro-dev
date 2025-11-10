# Issue Explanation: Double /api/api and 502 Bad Gateway

## Issue 1: Double `/api/api` in Template URLs

### Where It's Happening

**File:** `frontend/src/utils/templateManager.ts` (Line 44)

**Problem Code:**
```typescript
const { baseUrl, apiKey } = getApiConfig();
const response = await fetch(`${baseUrl}/templates`, {
```

**Why It Fails:**
1. `VITE_API_BASE_URL` is set to `/api` in production
2. `baseUrl` = `/api`
3. Code does: `${baseUrl}/templates` = `/api/templates` ✅ (This part is OK)
4. BUT: The `request()` method in `api.ts` also adds `/api` prefix when `baseUrl` is `/api`
5. Result: `/api` + `/api/templates` = `/api/api/templates` ❌

**The Fix:**
Changed to use `buildApiUrl('/templates')` which correctly handles the `/api` prefix:
```typescript
const { buildApiUrl } = await import('@/lib/api');
const response = await fetch(buildApiUrl('/templates'), {
```

**How `buildApiUrl` Works:**
- If `baseUrl` = `/api` and endpoint = `/templates`
- It detects `baseUrl` ends with `/api`
- It removes `/api` from endpoint if present
- Final URL: `/api/templates` ✅

---

## Issue 2: 502 Bad Gateway on Excel Upload

### Where It's Happening

**Request:** `POST http://194.163.134.129:8080/api/barcodes/upload-excel`

**Error:** `502 (Bad Gateway)`

### Why It's Failing

A **502 Bad Gateway** means:
- ✅ Frontend (Nginx) received the request
- ✅ Nginx tried to proxy to backend
- ❌ **Backend is NOT responding or NOT accessible**

### Request Flow

```
Browser → http://194.163.134.129:8080/api/barcodes/upload-excel
    ↓
Frontend Container (Nginx on port 80)
    ↓ (proxies to)
Backend Container (FastAPI on port 8034)
    ↓
Backend processes request
```

**The failure happens at step 3** - Nginx can't reach the backend.

### Possible Causes

1. **Backend container is not running**
   ```bash
   docker ps  # Check if barcode-v2-backend is listed
   ```

2. **Backend container crashed**
   ```bash
   docker logs barcode-v2-backend  # Check for errors
   ```

3. **Backend not listening on port 8034**
   ```bash
   curl http://localhost:8034/healthz  # Should return JSON
   ```

4. **Docker network issue**
   - Containers can't communicate
   - Service name `backend` not resolvable from frontend container

5. **Backend health check failing**
   - Backend is starting but not ready
   - Database connection issues
   - Missing dependencies

### How to Diagnose

**Step 1: Check if backend is running**
```bash
ssh deployer@194.163.134.129
cd /home/deployer/barcodegenpro-dev
docker ps
```

**Step 2: Check backend logs**
```bash
docker logs barcode-v2-backend
# Look for errors, crashes, or startup issues
```

**Step 3: Test backend directly**
```bash
# From VPS
curl http://localhost:8034/healthz

# Should return: {"status":"healthy",...}
```

**Step 4: Test from frontend container**
```bash
docker exec -it barcode-v2-frontend sh
wget -O- http://backend:8034/healthz
```

**Step 5: Check nginx config**
```bash
docker exec barcode-v2-frontend cat /etc/nginx/conf.d/default.conf | grep -A 5 "location /api"
```

Should show:
```nginx
location /api/ {
    proxy_pass http://backend:8034;  # ✅ Correct
}
```

NOT:
```nginx
proxy_pass http://backend:8034/api/;  # ❌ Wrong
```

### Quick Fixes

**Fix 1: Restart backend**
```bash
docker-compose restart backend
```

**Fix 2: Rebuild and restart**
```bash
docker-compose down
docker-compose up -d --build
```

**Fix 3: Check backend health**
```bash
docker logs -f barcode-v2-backend
# Watch for errors while trying to upload
```

### Most Likely Solution

The backend container is probably:
- Not running (check `docker ps`)
- Crashed on startup (check `docker logs`)
- Can't connect to database (permission issues)
- Out of memory (check `docker stats`)

**Run these commands on your VPS:**
```bash
# 1. Check status
docker ps -a | grep backend

# 2. Check logs
docker logs --tail 50 barcode-v2-backend

# 3. Test health
curl http://localhost:8034/healthz

# 4. Restart if needed
docker-compose restart backend
```

---

## Summary

### Fixed Issues
1. ✅ **Double `/api/api`** - Fixed `templateManager.ts` to use `buildApiUrl()`

### Remaining Issues
2. ❌ **502 Bad Gateway** - Backend connectivity issue (needs diagnosis on VPS)

### Next Steps
1. SSH into VPS: `ssh deployer@194.163.134.129`
2. Run diagnosis commands from `502_DIAGNOSIS.md`
3. Share the output to identify the exact backend issue




