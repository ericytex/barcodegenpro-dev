#!/bin/bash
# Script to fix permissions on VPS for rsync and backend operations
# Run this on the VPS after rsync or if you get permission errors

VPS_IP="194.163.134.129"
VPS_USER="root"

echo "🔧 Fixing permissions on VPS..."

ssh ${VPS_USER}@${VPS_IP} << 'EOF'
# Navigate to backend directory
cd /home/deployer/barcodegenpro-dev/backend

# Fix ownership - make sure deployer user owns everything
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend

# Set directory permissions (755 = rwxr-xr-x)
find /home/deployer/barcodegenpro-dev/backend -type d -exec chmod 755 {} \;

# Set file permissions (644 = rw-r--r--)
find /home/deployer/barcodegenpro-dev/backend -type f -exec chmod 644 {} \;

# Make Python scripts executable
find /home/deployer/barcodegenpro-dev/backend -name "*.py" -exec chmod 755 {} \;

# Make shell scripts executable
find /home/deployer/barcodegenpro-dev/backend -name "*.sh" -exec chmod 755 {} \;

# Ensure specific directories are writable
chmod 755 /home/deployer/barcodegenpro-dev/backend/utils
chmod 755 /home/deployer/barcodegenpro-dev/backend/services
chmod 755 /home/deployer/barcodegenpro-dev/backend/models
chmod 755 /home/deployer/barcodegenpro-dev/backend/routes
chmod 755 /home/deployer/barcodegenpro-dev/backend/templates

# Ensure data directories exist and are writable
mkdir -p /home/deployer/barcodegenpro-dev/backend/uploads
mkdir -p /home/deployer/barcodegenpro-dev/backend/downloads/barcodes
mkdir -p /home/deployer/barcodegenpro-dev/backend/downloads/pdfs
mkdir -p /home/deployer/barcodegenpro-dev/backend/logs
mkdir -p /home/deployer/barcodegenpro-dev/backend/archives
mkdir -p /home/deployer/barcodegenpro-dev/backend/data

chmod 755 /home/deployer/barcodegenpro-dev/backend/uploads
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads/barcodes
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads/pdfs
chmod 755 /home/deployer/barcodegenpro-dev/backend/logs
chmod 755 /home/deployer/barcodegenpro-dev/backend/archives
chmod 755 /home/deployer/barcodegenpro-dev/backend/data

echo "✅ Permissions fixed!"
echo "📁 Directory permissions:"
ls -la /home/deployer/barcodegenpro-dev/backend/ | head -20
EOF

echo "✅ Permission fix complete!"
