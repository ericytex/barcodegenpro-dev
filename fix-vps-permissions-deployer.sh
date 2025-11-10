#!/bin/bash
# Script to fix permissions on VPS for deployer user
# This allows deployer to write files via rsync

VPS_IP="194.163.134.129"
VPS_USER="deployer"  # Use deployer to fix permissions

echo "🔧 Fixing permissions on VPS for deployer user..."

ssh ${VPS_USER}@${VPS_IP} << 'EOF'
# Switch to root or use sudo to fix permissions
sudo bash << 'SUDO_EOF'

# Navigate to backend directory
cd /home/deployer/barcodegenpro-dev/backend

# Give deployer user ownership
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend

# Make directory writable
chmod -R 755 /home/deployer/barcodegenpro-dev/backend

# Ensure all directories are writable
find /home/deployer/barcodegenpro-dev/backend -type d -exec chmod 755 {} \;

# Ensure all files are readable/writable
find /home/deployer/barcodegenpro-dev/backend -type f -exec chmod 644 {} \;

# Make scripts executable
find /home/deployer/barcodegenpro-dev/backend -name "*.py" -exec chmod 755 {} \;
find /home/deployer/barcodegenpro-dev/backend -name "*.sh" -exec chmod 755 {} \;

# Ensure data directories exist and are writable
mkdir -p /home/deployer/barcodegenpro-dev/backend/uploads
mkdir -p /home/deployer/barcodegenpro-dev/backend/downloads/barcodes
mkdir -p /home/deployer/barcodegenpro-dev/backend/downloads/pdfs
mkdir -p /home/deployer/barcodegenpro-dev/backend/logs
mkdir -p /home/deployer/barcodegenpro-dev/backend/archives
mkdir -p /home/deployer/barcodegenpro-dev/backend/data
mkdir -p /home/deployer/barcodegenpro-dev/backend/data/backups
mkdir -p /home/deployer/barcodegenpro-dev/backend/scripts

# Set permissions on data directories
chmod 755 /home/deployer/barcodegenpro-dev/backend/uploads
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads/barcodes
chmod 755 /home/deployer/barcodegenpro-dev/backend/downloads/pdfs
chmod 755 /home/deployer/barcodegenpro-dev/backend/logs
chmod 755 /home/deployer/barcodegenpro-dev/backend/archives
chmod 755 /home/deployer/barcodegenpro-dev/backend/data
chmod 755 /home/deployer/barcodegenpro-dev/backend/data/backups
chmod 755 /home/deployer/barcodegenpro-dev/backend/scripts

# Set ownership on data directories
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend/uploads
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend/downloads
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend/logs
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend/archives
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend/data
chown -R deployer:deployer /home/deployer/barcodegenpro-dev/backend/scripts

echo "✅ Permissions fixed!"
echo "📁 Verifying permissions:"
ls -la /home/deployer/barcodegenpro-dev/backend/ | head -10
ls -ld /home/deployer/barcodegenpro-dev/backend/downloads
ls -ld /home/deployer/barcodegenpro-dev/backend/data

SUDO_EOF
EOF

echo "✅ Permission fix complete!"
echo ""
echo "Now try rsync again:"
echo "./rsync-no-cache.sh"

