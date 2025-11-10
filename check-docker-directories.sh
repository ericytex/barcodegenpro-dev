#!/bin/bash
# Script to check directory layout in Docker container on VPS
# Run this on the VPS or via SSH

VPS_IP="194.163.134.129"
VPS_USER="deployer"

echo "🔍 Checking Docker container directory layout..."
echo ""

# Check if container is running
echo "1. Checking if backend container is running:"
ssh ${VPS_USER}@${VPS_IP} "docker ps | grep backend"

echo ""
echo "2. Checking environment variables:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend env | grep -E 'UPLOAD_DIR|DOWNLOAD_DIR|LOGS_DIR|PWD'"

echo ""
echo "3. Root directory structure (/app):"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/"

echo ""
echo "4. Uploads directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/uploads/ 2>/dev/null || echo 'Directory does not exist'"

echo ""
echo "5. Downloads directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/downloads/ 2>/dev/null || echo 'Directory does not exist'"

echo ""
echo "6. Downloads/barcodes directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/downloads/barcodes/ 2>/dev/null || echo 'Directory does not exist'"

echo ""
echo "7. Downloads/pdfs directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/downloads/pdfs/ 2>/dev/null || echo 'Directory does not exist'"

echo ""
echo "8. Logs directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/logs/ 2>/dev/null || echo 'Directory does not exist'"

echo ""
echo "9. Data directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend ls -la /app/data/ 2>/dev/null || echo 'Directory does not exist'"

echo ""
echo "10. Current working directory:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend pwd"

echo ""
echo "11. Checking if directories are writable:"
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
docker exec barcode-v2-backend bash -c "
echo 'Testing /app/uploads:'
test -w /app/uploads && echo '  ✅ Writable' || echo '  ❌ NOT writable'
test -d /app/uploads && echo '  ✅ Exists' || echo '  ❌ Does not exist'

echo 'Testing /app/downloads:'
test -w /app/downloads && echo '  ✅ Writable' || echo '  ❌ NOT writable'
test -d /app/downloads && echo '  ✅ Exists' || echo '  ❌ Does not exist'

echo 'Testing /app/downloads/barcodes:'
test -w /app/downloads/barcodes && echo '  ✅ Writable' || echo '  ❌ NOT writable'
test -d /app/downloads/barcodes && echo '  ✅ Exists' || echo '  ❌ Does not exist'

echo 'Testing /app/downloads/pdfs:'
test -w /app/downloads/pdfs && echo '  ✅ Writable' || echo '  ❌ NOT writable'
test -d /app/downloads/pdfs && echo '  ✅ Exists' || echo '  ❌ Does not exist'

echo 'Testing /app/logs:'
test -w /app/logs && echo '  ✅ Writable' || echo '  ❌ NOT writable'
test -d /app/logs && echo '  ✅ Exists' || echo '  ❌ Does not exist'
"
EOF

echo ""
echo "✅ Directory check complete!"

