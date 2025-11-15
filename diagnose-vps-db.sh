#!/bin/bash
# Diagnostic script to find why database has 0 users
# Run this on VPS via SSH

VPS_IP="194.163.134.129"
VPS_USER="deployer"

echo "🔍 Diagnosing VPS Database Issue..."
echo ""

# Check 1: Where is docker-compose.yml located?
echo "1️⃣ Finding docker-compose.yml location:"
ssh ${VPS_USER}@${VPS_IP} "find /home/deployer -name 'docker-compose.yml' -type f 2>/dev/null | head -3"

echo ""
echo "2️⃣ Checking database file on HOST (outside container):"
ssh ${VPS_USER}@${VPS_IP} "ls -lh /home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db 2>/dev/null || echo '❌ Database NOT found at expected location'"

echo ""
echo "3️⃣ Checking database file INSIDE container:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db 2>/dev/null || echo '❌ Database NOT found in container'"

echo ""
echo "4️⃣ Checking database size (host vs container):"
echo "   Host size:"
ssh ${VPS_USER}@${VPS_IP} "stat -c%s /home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db 2>/dev/null || echo '0'"
echo "   Container size:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend stat -c%s /app/data/barcode_generator.db 2>/dev/null || echo '0'"

echo ""
echo "5️⃣ Checking user count in container database:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\""

echo ""
echo "6️⃣ Checking volume mount in docker-compose.yml:"
ssh ${VPS_USER}@${VPS_IP} "cd /home/deployer/barcodegenpro-dev && grep -A 2 'volumes:' docker-compose.yml | grep 'data'"

echo ""
echo "7️⃣ Checking if database directory exists:"
ssh ${VPS_USER}@${VPS_IP} "ls -la /home/deployer/barcodegenpro-dev/backend/data/ 2>/dev/null | head -10"

echo ""
echo "✅ Diagnostic complete!"

