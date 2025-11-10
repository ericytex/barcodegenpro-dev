# Fix VPS Permissions - Manual Commands

If you prefer to run commands manually on the VPS, use these:

## Option 1: Run the Script (Recommended)

```bash
./fix-vps-permissions.sh
```

## Option 2: Manual Commands on VPS

SSH into your VPS first:
```bash
ssh root@194.163.134.129
```

Then run these commands:

```bash
# Navigate to backend directory
cd /home/barcode/app/backend

# Fix ownership (adjust user/group as needed)
chown -R barcode:barcode /home/barcode/app/backend
# OR if using root:
# chown -R root:root /home/barcode/app/backend

# Set directory permissions (755 = rwxr-xr-x)
find /home/barcode/app/backend -type d -exec chmod 755 {} \;

# Set file permissions (644 = rw-r--r--)
find /home/barcode/app/backend -type f -exec chmod 644 {} \;

# Make Python scripts executable
find /home/barcode/app/backend -name "*.py" -exec chmod 755 {} \;

# Make shell scripts executable
find /home/barcode/app/backend -name "*.sh" -exec chmod 755 {} \;

# Ensure specific directories are writable
chmod 755 /home/barcode/app/backend/utils
chmod 755 /home/barcode/app/backend/services
chmod 755 /home/barcode/app/backend/models
chmod 755 /home/barcode/app/backend/routes
chmod 755 /home/barcode/app/backend/templates

# Ensure data directories exist and are writable
mkdir -p /home/barcode/app/backend/uploads
mkdir -p /home/barcode/app/backend/downloads/barcodes
mkdir -p /home/barcode/app/backend/downloads/pdfs
mkdir -p /home/barcode/app/backend/logs
mkdir -p /home/barcode/app/backend/archives
mkdir -p /home/barcode/app/backend/data

chmod 755 /home/barcode/app/backend/uploads
chmod 755 /home/barcode/app/backend/downloads
chmod 755 /home/barcode/app/backend/downloads/barcodes
chmod 755 /home/barcode/app/backend/downloads/pdfs
chmod 755 /home/barcode/app/backend/logs
chmod 755 /home/barcode/app/backend/archives
chmod 755 /home/barcode/app/backend/data

# Verify permissions
ls -la /home/barcode/app/backend/utils/
ls -la /home/barcode/app/backend/services/
```

## Option 3: Quick Fix (If using Docker)

If files are owned by Docker container user, you may need to fix permissions inside the container:

```bash
# SSH into VPS
ssh root@194.163.134.129

# Enter backend container
docker exec -it barcode-v2-backend bash

# Inside container, fix permissions
chmod -R 755 /app/utils
chmod -R 755 /app/services
chmod -R 755 /app/models
chmod -R 755 /app/routes
chmod -R 755 /app/templates

# Exit container
exit
```

## Option 4: Fix Ownership for Docker User

If Docker is running as a specific user (e.g., UID 1000), fix ownership:

```bash
# On VPS
cd /home/barcode/app/backend

# Find Docker container user ID
docker exec barcode-v2-backend id

# Set ownership to match (example: UID 1000, GID 1000)
chown -R 1000:1000 /home/barcode/app/backend
```

## Verify Fix

After running commands, test rsync again:
```bash
./rsync-no-cache.sh
```

The permission errors should be gone!

