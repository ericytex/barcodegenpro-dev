#!/bin/bash
# Comprehensive 502 diagnosis and fix

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

echo "🔍 Diagnosing 502 Bad Gateway error..."
echo ""

ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
cd ~/barcodegenpro-dev

echo "=== Step 1: Container Status ==="
docker compose ps
echo ""

echo "=== Step 2: Check if backend is responding ==="
if curl -s -f http://localhost:8034/healthz > /dev/null 2>&1; then
    echo "✅ Backend is responding on port 8034"
else
    echo "❌ Backend is NOT responding on port 8034"
fi
echo ""

echo "=== Step 3: Recent backend logs (last 50 lines) ==="
docker compose logs backend --tail=50 2>&1
echo ""

echo "=== Step 4: Check for errors in logs ==="
ERROR_COUNT=$(docker compose logs backend 2>&1 | grep -i "error\|exception\|traceback\|failed" | wc -l)
echo "Found $ERROR_COUNT error/exception lines in logs"
if [ $ERROR_COUNT -gt 0 ]; then
    echo "Recent errors:"
    docker compose logs backend 2>&1 | grep -i "error\|exception\|traceback" | tail -10
fi
echo ""

echo "=== Step 5: Check backend process ==="
if docker ps | grep -q barcode-v2-backend; then
    CONTAINER_ID=$(docker ps | grep barcode-v2-backend | awk '{print $1}')
    echo "✅ Container is running: $CONTAINER_ID"
    echo "Processes inside container:"
    docker exec $CONTAINER_ID ps aux | head -5
else
    echo "❌ Backend container is NOT running"
    echo "Checking stopped containers:"
    docker ps -a | grep barcode-v2-backend
fi
echo ""

echo "=== Step 6: Check file permissions ==="
if [ -d "backend/services" ]; then
    echo "Checking backend/services/barcode_service.py:"
    ls -lh backend/services/barcode_service.py 2>&1
    echo "File exists: $(test -f backend/services/barcode_service.py && echo 'YES' || echo 'NO')"
fi
echo ""

echo "=== Step 7: Testing Python import in container ==="
if docker ps | grep -q barcode-v2-backend; then
    CONTAINER_ID=$(docker ps | grep barcode-v2-backend | awk '{print $1}')
    echo "Testing import..."
    docker exec $CONTAINER_ID python3 -c "import sys; sys.path.insert(0, '/app'); from services.barcode_service import BarcodeService; print('✅ Import successful')" 2>&1
fi
echo ""

echo "=== RECOMMENDED FIX ==="
echo "If backend is not responding, run these commands:"
echo "  cd ~/barcodegenpro-dev"
echo "  docker compose down"
echo "  docker compose build --no-cache backend"
echo "  docker compose up -d"
echo "  docker compose logs backend -f"
EOF

echo ""
echo "✅ Diagnosis complete!"
echo ""
echo "To fix the 502 error, sync code and rebuild:"
echo "  ./sync-now.sh"
echo ""
echo "Or manually on VPS:"
echo "  ssh deployer@194.163.134.129"
echo "  cd ~/barcodegenpro-dev"
echo "  docker compose restart backend"
echo "  docker compose logs backend -f"

