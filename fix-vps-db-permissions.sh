#!/bin/bash
# Fix database permissions and verify it's accessible
# Run this on VPS

VPS_IP="194.163.134.129"
VPS_USER="deployer"

echo "🔧 Fixing database permissions on VPS..."
echo ""

# Fix ownership - change from root:root to deployer:deployer
echo "1️⃣ Changing database ownership from root to deployer..."
ssh ${VPS_USER}@${VPS_IP} "sudo chown deployer:deployer /home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db"

# Fix permissions
echo "2️⃣ Setting correct permissions (read/write for owner, read for group/others)..."
ssh ${VPS_USER}@${VPS_IP} "chmod 664 /home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db"

# Verify file ownership
echo ""
echo "3️⃣ Verifying file ownership:"
ssh ${VPS_USER}@${VPS_IP} "ls -lh /home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db"

# Check user count in HOST database
echo ""
echo "4️⃣ Checking user count in HOST database:"
ssh ${VPS_USER}@${VPS_IP} "sqlite3 /home/deployer/barcodegenpro-dev/backend/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\""

# Restart container to pick up changes
echo ""
echo "5️⃣ Restarting backend container..."
ssh ${VPS_USER}@${VPS_IP} "cd /home/deployer/barcodegenpro-dev && docker compose restart backend"

# Wait a moment for container to start
sleep 3

# Check user count in CONTAINER database
echo ""
echo "6️⃣ Checking user count in CONTAINER database (after restart):"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\""

echo ""
echo "✅ Fix complete!"

