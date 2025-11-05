# Quick Fix for 502 Bad Gateway

## The Problem

Nginx is trying to proxy `/api/` to `http://backend:8034/api/`, but the backend routes already have `/api` prefix, so it creates a double `/api/api/` path or can't reach the backend.

## The Fix

Change `proxy_pass http://backend:8034/api/;` to `proxy_pass http://backend:8034;`

This way:
- Request: `/api/auth/login`
- Nginx proxies: `http://backend:8034/api/auth/login` ✅
- Instead of: `http://backend:8034/api/api/auth/login` ❌

## Steps on Remote Server

```bash
# 1. Rebuild frontend with fixed nginx.conf
cd ~/barcodegenpro-dev
docker compose build frontend

# 2. Restart frontend
docker compose up -d frontend

# 3. Test
curl http://localhost:8080/api/healthz
curl http://localhost:8080/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email_or_username":"test","password":"test"}'
```

## Verify Backend is Reachable

```bash
# Test backend directly
curl http://localhost:8034/api/healthz
curl http://localhost:8034/healthz

# Check if containers are on same network
docker network inspect barcodegenpro-dev_barcode-v2-network | grep -A 5 "backend\|frontend"
```



