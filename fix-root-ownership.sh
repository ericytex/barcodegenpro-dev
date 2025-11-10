#!/bin/bash
# Script to fix ownership of files created by root user
# Changes ownership from root to barcode user/group so deployer can write

VPS_IP="194.163.134.129"
VPS_USER="root"  # Use root to fix ownership

echo "🔧 Fixing ownership of files created by root..."

ssh ${VPS_USER}@${VPS_IP} << 'EOF'
# Navigate to backend directory
cd /home/deployer/barcodegenpro-dev/backend

echo "📁 Current ownership (before fix):"
ls -la /home/deployer/barcodegenpro-dev/backend/ | head -10

# Change ownership from root to deployer user
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend

# Set group permissions so deployer can write
chmod -R 755 /home/deployer/barcodegenpro-dev/backend

# Ensure all directories are writable
find /home/deployer/barcodegenpro-dev/backend -type d -exec chmod 755 {} \;

# Ensure all files are readable/writable
find /home/deployer/barcodegenpro-dev/backend -type f -exec chmod 644 {} \;

# Make scripts executable
find /home/deployer/barcodegenpro-dev/backend -name "*.py" -exec chmod 755 {} \;
find /home/deployer/barcodegenpro-dev/backend -name "*.sh" -exec chmod 755 {} \;

# Ensure data directories are writable
chmod 755 /home/deployer/barcodegenpro-dev/backend/uploads 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads/barcodes 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads/pdfs 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/logs 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/archives 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/data 2>/dev/null || true
chmod 755 /home/deployer/barcodegenpro-dev/backend/scripts 2>/dev/null || true

echo ""
echo "✅ Ownership fixed!"
echo "📁 New ownership (after fix):"
ls -la /home/deployer/barcodegenpro-dev/backend/ | head -10
EOF

echo ""
echo "✅ Ownership fix complete!"
echo ""
echo "Now you can run rsync as deployer:"
echo "./rsync-no-cache.sh"

