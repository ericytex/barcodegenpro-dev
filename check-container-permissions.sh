#!/bin/bash
# Check container permissions and file structure

VPS_USER="deployer"
VPS_IP="194.163.134.129"
VPS_PATH="~/barcodegenpro-dev"

echo "🔍 Checking container status and permissions..."
echo ""

ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
cd ~/barcodegenpro-dev

echo "=== Container Status ==="
docker compose ps
echo ""

echo "=== Checking if backend container is running ==="
if docker ps | grep -q barcode-v2-backend; then
    echo "✅ Backend container is running"
    CONTAINER_NAME=$(docker ps | grep barcode-v2-backend | awk '{print $1}')
    echo "Container ID: $CONTAINER_NAME"
    echo ""
    
    echo "=== Checking /app directory structure ==="
    docker exec $CONTAINER_NAME ls -la /app/ | head -20
    echo ""
    
    echo "=== Checking /app/services directory ==="
    docker exec $CONTAINER_NAME ls -la /app/services/ 2>&1 | head -20
    echo ""
    
    echo "=== Checking if barcode_service.py exists ==="
    docker exec $CONTAINER_NAME ls -lh /app/services/barcode_service.py 2>&1
    echo ""
    
    echo "=== Checking file permissions ==="
    docker exec $CONTAINER_NAME stat /app/services/barcode_service.py 2>&1
    echo ""
    
    echo "=== Checking Python path ==="
    docker exec $CONTAINER_NAME python3 -c "import sys; print('\n'.join(sys.path))"
    echo ""
    
    echo "=== Testing import ==="
    docker exec $CONTAINER_NAME python3 -c "import sys; sys.path.insert(0, '/app'); from services.barcode_service import BarcodeService; print('✅ Import successful')" 2>&1
    echo ""
    
    echo "=== Recent container logs ==="
    docker compose logs backend --tail=30
else
    echo "❌ Backend container is NOT running"
    echo ""
    echo "=== Checking why container stopped ==="
    docker compose logs backend --tail=50
fi
EOF

