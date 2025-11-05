#!/bin/bash

# Quick diagnostic for 502 error
# Run on remote server

echo "=== Diagnosing 502 Bad Gateway ==="
echo ""

echo "1. Check containers are running:"
docker ps | grep -E "barcode-v2-backend|barcode-v2-frontend"

echo ""
echo "2. Test backend directly:"
curl -s -o /dev/null -w "Backend (8034): %{http_code}\n" http://localhost:8034/healthz

echo ""
echo "3. Test frontend can reach backend via Docker network:"
docker exec barcode-v2-frontend wget -q -O- http://backend:8034/healthz 2>&1 | head -5 || echo "❌ Cannot reach backend from frontend"

echo ""
echo "4. Check nginx config in frontend container:"
docker exec barcode-v2-frontend grep -A 2 "location /api" /etc/nginx/conf.d/default.conf

echo ""
echo "5. Check backend logs (last 10 lines):"
docker logs barcode-v2-backend --tail 10

echo ""
echo "6. Check frontend nginx error logs:"
docker exec barcode-v2-frontend tail -10 /var/log/nginx/error.log 2>/dev/null || echo "No error log file"

echo ""
echo "7. Test from frontend container:"
docker exec barcode-v2-frontend curl -s http://backend:8034/api/healthz || echo "❌ Cannot reach backend API"

echo ""
echo "=== Quick Fix ==="
echo "If backend is not reachable:"
echo "  1. docker compose restart backend"
echo ""
echo "If nginx config is wrong:"
echo "  1. Rebuild frontend: docker compose build frontend"
echo "  2. Restart: docker compose up -d frontend"



