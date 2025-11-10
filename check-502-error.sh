#!/bin/bash
# Quick check for 502 error - see what's happening in backend

VPS_USER="deployer"
VPS_IP="194.163.134.129"

echo "🔍 Checking backend status and recent errors..."
echo ""

ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
cd ~/barcodegenpro-dev

echo "=== Container Status ==="
docker compose ps
echo ""

echo "=== Recent Backend Logs (last 100 lines) ==="
docker compose logs backend --tail=100 2>&1 | tail -50
echo ""

echo "=== Checking for errors in logs ==="
docker compose logs backend 2>&1 | grep -i "error\|exception\|traceback\|failed\|502" | tail -20
echo ""

echo "=== Testing backend health ==="
curl -s http://localhost:8034/healthz && echo "✅ Backend is responding" || echo "❌ Backend is NOT responding"
echo ""

echo "=== Checking if backend process is running ==="
docker exec barcode-v2-backend ps aux | grep uvicorn || echo "❌ Uvicorn process not found"
EOF

