#!/bin/bash
# Complete fix for 502 Bad Gateway - Rebuild and restart backend

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

echo "🔧 Fixing 502 Bad Gateway - Rebuilding backend container..."
echo ""

ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
cd ~/barcodegenpro-dev

echo "=== Step 1: Stopping containers ==="
docker compose down
echo ""

echo "=== Step 2: Verifying files exist on VPS ==="
if [ -f "backend/services/barcode_service.py" ]; then
    echo "✅ backend/services/barcode_service.py exists"
    ls -lh backend/services/barcode_service.py
else
    echo "❌ ERROR: backend/services/barcode_service.py NOT FOUND!"
    exit 1
fi
echo ""

echo "=== Step 3: Rebuilding backend container (no cache) ==="
docker compose build --no-cache backend
echo ""

echo "=== Step 4: Starting containers ==="
docker compose up -d
echo ""

echo "=== Step 5: Waiting for backend to start ==="
sleep 10
echo ""

echo "=== Step 6: Checking container status ==="
docker compose ps
echo ""

echo "=== Step 7: Testing backend health ==="
sleep 5
curl -f http://localhost:8034/healthz && echo "✅ Backend is healthy" || echo "❌ Backend health check failed"
echo ""

echo "=== Step 8: Recent logs ==="
docker compose logs backend --tail=30
EOF

echo ""
echo "✅ Fix complete!"
echo ""
echo "Check if backend is working:"
echo "  ssh ${VPS_USER}@${VPS_IP} 'cd ~/barcodegenpro-dev && docker compose ps'"
echo "  ssh ${VPS_USER}@${VPS_IP} 'cd ~/barcodegenpro-dev && docker compose logs backend -f'"

