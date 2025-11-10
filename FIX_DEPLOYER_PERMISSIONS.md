# Fix Deployer User Permissions on VPS

## Problem
The `deployer` user cannot write files during rsync because:
1. Cannot change group ownership (`chgrp` fails)
2. Cannot create directories (`mkdir` fails)
3. Cannot create temporary files (`mkstemp` fails)

## Solution

### Option 1: Run the Fix Script (Recommended)

```bash
./fix-vps-permissions-deployer.sh
```

### Option 2: Manual Fix on VPS

SSH into VPS as deployer:
```bash
ssh deployer@194.163.134.129
```

Then run these commands (will prompt for sudo password):
```bash
# Switch to root or use sudo
sudo bash

# Navigate to backend
cd /home/barcode/app/backend

# Add deployer to barcode group
usermod -a -G barcode deployer

# Set group ownership
chown -R barcode:barcode /home/barcode/app/backend

# Make directories writable by group (775 = rwxrwxr-x)
chmod -R 775 /home/barcode/app/backend

# Ensure all directories are writable
find /home/barcode/app/backend -type d -exec chmod 775 {} \;

# Ensure all files are readable/writable by group (664 = rw-rw-r--)
find /home/barcode/app/backend -type f -exec chmod 664 {} \;

# Make scripts executable
find /home/barcode/app/backend -name "*.py" -exec chmod 775 {} \;
find /home/barcode/app/backend -name "*.sh" -exec chmod 775 {} \;

# Create and fix data directories
mkdir -p /home/barcode/app/backend/{uploads,downloads/barcodes,downloads/pdfs,logs,archives,data,data/backups,scripts}
chmod 775 /home/barcode/app/backend/{uploads,downloads,downloads/barcodes,downloads/pdfs,logs,archives,data,data/backups,scripts}
chown -R barcode:barcode /home/barcode/app/backend/{uploads,downloads,logs,archives,data,scripts}

# Exit sudo
exit
```

### Option 3: Give Deployer Full Ownership (Alternative)

If you want deployer to own all files:
```bash
sudo chown -R deployer:deployer /home/barcode/app/backend
sudo chmod -R 755 /home/barcode/app/backend
```

**Note:** This might break Docker if it expects files owned by `barcode` user.

### Option 4: Use rsync with --no-owner and --no-group

Add these flags to rsync to skip ownership changes:
```bash
rsync -avz --progress \
  --no-owner \
  --no-group \
  --exclude='venv' \
  --exclude='__pycache__' \
  # ... rest of excludes ...
  backend/ \
  deployer@194.163.134.129:/home/barcode/app/backend/
```

## Verify Fix

After running the fix, test rsync:
```bash
./rsync-no-cache.sh
```

The permission errors should be gone!

## What the Fix Does

1. **Adds deployer to barcode group** - Allows deployer to write files owned by barcode group
2. **Sets group permissions (775/664)** - Makes directories writable by group, files readable/writable by group
3. **Creates missing directories** - Ensures all required directories exist
4. **Sets proper ownership** - Ensures barcode user/group owns the files

This allows deployer to write files via rsync while maintaining proper ownership for Docker containers.

