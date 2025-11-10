#!/bin/bash
# Script to check backend logs for PDF creation errors

VPS_IP="194.163.134.129"
VPS_USER="deployer"

echo "🔍 Checking backend logs for PDF creation errors..."
echo ""

# Check recent logs for PDF-related errors
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
echo "=== Recent PDF creation errors ==="
docker logs barcode-v2-backend --tail=200 | grep -i -A 10 -B 5 "pdf\|error\|exception\|traceback" | tail -50

echo ""
echo "=== Last 50 lines of logs ==="
docker logs barcode-v2-backend --tail=50

echo ""
echo "=== Check for 'Creating PDF' messages ==="
docker logs barcode-v2-backend --tail=500 | grep -i "creating pdf\|pdf created\|pdf error" | tail -20
EOF

echo ""
echo "✅ Log check complete!"

