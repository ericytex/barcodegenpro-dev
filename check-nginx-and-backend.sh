#!/bin/bash
# Check nginx and backend connection

VPS_USER="deployer"
VPS_IP="194.163.134.129"

echo "🔍 Checking nginx and backend connection..."
echo ""

ssh "${VPS_USER}@${VPS_IP}" << 'EOF'
cd ~/barcodegenpro-dev

echo "=== Step 1: Check nginx container ==="
docker compose ps frontend
echo ""

echo "=== Step 2: Check nginx logs (last 30 lines) ==="
docker compose logs frontend --tail=30 2>&1 | grep -E "502|error|timeout|upload-excel" || echo "No relevant nginx errors found"
echo ""

echo "=== Step 3: Test backend directly ==="
echo "Testing backend health endpoint:"
curl -v http://localhost:8034/healthz 2>&1 | head -10
echo ""

echo "=== Step 4: Test through nginx ==="
echo "Testing nginx -> backend proxy:"
curl -v http://localhost:8080/api/healthz 2>&1 | head -15
echo ""

echo "=== Step 5: Check if backend receives requests ==="
echo "Backend should show request logs above. If not, nginx is not forwarding."
echo ""

echo "=== Step 6: Check nginx proxy timeout settings ==="
docker exec barcode-v2-frontend cat /etc/nginx/nginx.conf 2>&1 | grep -A 5 -B 5 "timeout\|proxy" || echo "Could not read nginx config"
echo ""

echo "=== Step 7: Check recent backend logs for any requests ==="
echo "Last 20 lines of backend logs:"
docker compose logs backend --tail=20 2>&1
EOF

