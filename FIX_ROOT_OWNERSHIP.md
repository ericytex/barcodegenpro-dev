# Fix Root Ownership Issue

## Problem
Files were synced to VPS using `root` user, so they're owned by `root:root`. 
Now when trying to rsync as `deployer`, the deployer user can't overwrite root-owned files.

## Solution

### Option 1: Run the Fix Script (Recommended)

```bash
./fix-root-ownership.sh
```

This will:
- Change ownership from `root:root` to `barcode:barcode`
- Set group permissions (775) so group members can write
- Add deployer to barcode group
- Make all files writable by group

### Option 2: Manual Fix on VPS

SSH into VPS as root:
```bash
ssh root@194.163.134.129
```

Then run:
```bash
cd /home/barcode/app/backend

# Change ownership from root to barcode
chown -R barcode:barcode /home/barcode/app/backend

# Set group permissions (775 = rwxrwxr-x for dirs, 664 = rw-rw-r-- for files)
chmod -R 775 /home/barcode/app/backend
find /home/barcode/app/backend -type d -exec chmod 775 {} \;
find /home/barcode/app/backend -type f -exec chmod 664 {} \;

# Make scripts executable
find /home/barcode/app/backend -name "*.py" -exec chmod 775 {} \;
find /home/barcode/app/backend -name "*.sh" -exec chmod 775 {} \;

# Add deployer to barcode group
usermod -a -G barcode deployer

# Verify
ls -la /home/barcode/app/backend/ | head -10
groups deployer
```

### Option 3: Change Ownership to Deployer (Alternative)

If you want deployer to own the files:
```bash
ssh root@194.163.134.129
chown -R deployer:deployer /home/barcode/app/backend
chmod -R 755 /home/barcode/app/backend
```

**Note:** This might break Docker if it expects files owned by `barcode` user.

## After Fixing

1. **Verify ownership:**
   ```bash
   ssh root@194.163.134.129 "ls -la /home/barcode/app/backend/ | head -10"
   ```

2. **Test rsync as deployer:**
   ```bash
   ./rsync-no-cache.sh
   ```

3. **If still having issues, check deployer is in barcode group:**
   ```bash
   ssh root@194.163.134.129 "groups deployer"
   ```

## Why This Works

- **barcode user/group**: Docker containers typically run as this user
- **Group permissions (775)**: Allows group members (including deployer) to write
- **deployer in barcode group**: Gives deployer write access without changing file ownership

This way:
- Docker containers can read/write files (owned by barcode)
- Deployer can rsync files (member of barcode group with write permissions)
- No permission conflicts!

