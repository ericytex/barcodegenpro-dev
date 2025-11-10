#!/bin/bash
# Fix 502 Bad Gateway - Backend container diagnostic and fix

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

echo "🔍 Diagnosing 502 Bad Gateway error..."
echo ""

ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
cd ~/barcodegenpro-dev

echo "=== Step 1: Check container status ==="
docker compose ps
echo ""

echo "=== Step 2: Check if backend container exists ==="
docker ps -a | grep barcode-v2-backend || echo "Container not found"
echo ""

echo "=== Step 3: Check recent backend logs ==="
docker compose logs backend --tail=100 2>&1 | tail -50
echo ""

echo "=== Step 4: Check if services directory exists in container ==="
if docker ps | grep -q barcode-v2-backend; then
    CONTAINER_ID=$(docker ps | grep barcode-v2-backend | awk '{print $1}')
    echo "Container is running: $CONTAINER_ID"
    docker exec $CONTAINER_ID ls -la /app/services/ 2>&1 | head -10
    echo ""
    
    echo "=== Step 5: Test Python import ==="
    docker exec $CONTAINER_ID python3 -c "import sys; sys.path.insert(0, '/app'); from services.barcode_service import BarcodeService; print('✅ Import successful')" 2>&1
    echo ""
    
    echo "=== Step 6: Check app.py import ==="
    docker exec $CONTAINER_ID python3 -c "import sys; sys.path.insert(0, '/app'); import app" 2>&1 | head -20
else
    echo "❌ Container is NOT running"
    echo ""
    echo "=== Checking why container stopped ==="
    docker compose logs backend --tail=100 2>&1 | grep -i "error\|exception\|traceback\|module" | tail -30
fi
echo ""

echo "=== Step 7: Checking file timestamps ==="
if [ -d "backend/services" ]; then
    echo "Local VPS files:"
    ls -lh backend/services/barcode_service.py 2>&1
    echo ""
    if docker ps | grep -q barcode-v2-backend; then
        CONTAINER_ID=$(docker ps | grep barcode-v2-backend | awk '{print $1}')
        echo "Container files:"
        docker exec $CONTAINER_ID ls -lh /app/services/barcode_service.py 2>&1
    fi
fi
EOF

echo ""
echo "🔧 If container is crashing, run this on VPS to fix:"
echo "  cd ~/barcodegenpro-dev"
echo "  docker compose down"
echo "  docker compose build --no-cache backend"
echo "  docker compose up -d"
echo "  docker compose logs backend -f"

