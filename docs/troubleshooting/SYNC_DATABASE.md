# Database Synchronization Guide

## Problem

The remote server is getting 401 Unauthorized errors because:
1. The database on the remote server is empty or doesn't have users
2. The database initialization creates tables but doesn't create users
3. You need to use your **existing local database** that has your users

## Solution

You need to copy your local database (which has your users) to the remote server.

## Method 1: Copy Database via Script (Recommended)

From your **local machine**, run:

```bash
./deploy/copy-db-to-remote.sh
```

This will:
1. Create a backup on the remote server
2. Copy your local database to the remote server
3. Restart the backend container

## Method 2: Manual Copy via rsync

From your **local machine**, run:

```bash
# Copy the database file
rsync -avz --progress \
  /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db \
  deployer@194.163.134.129:~/barcodegenpro-dev/backend/data/

# Restart backend on remote
ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose restart backend"
```

## Method 3: Verify and Fix on Remote Server

On the **remote server**, run:

```bash
cd ~/barcodegenpro-dev
./deploy/verify-db-users.sh
```

This will tell you:
- If the database exists
- If users table exists
- How many users are in the database
- If token_settings table exists

## Database Location

- **Local**: `/home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db`
- **Remote (host)**: `~/barcodegenpro-dev/backend/data/barcode_generator.db`
- **Remote (container)**: `/app/data/barcode_generator.db`

## Important Notes

1. **Always backup** the remote database before copying:
   ```bash
   ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev/backend/data && cp barcode_generator.db barcode_generator.db.backup_\$(date +%Y%m%d_%H%M%S)"
   ```

2. **Stop containers** before copying (optional, but safer):
   ```bash
   ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose stop backend"
   # Copy database...
   ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose start backend"
   ```

3. **After copying**, restart the backend:
   ```bash
   ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker compose restart backend"
   ```

4. **Verify users exist** after restart:
   ```bash
   ssh deployer@194.163.134.129 "cd ~/barcodegenpro-dev && docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db 'SELECT id, email, username FROM users;'"
   ```

## Quick Verification Commands

```bash
# Check if database exists on remote
ssh deployer@194.163.134.129 "ls -lh ~/barcodegenpro-dev/backend/data/barcode_generator.db"

# Check user count on remote
ssh deployer@194.163.134.129 "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db 'SELECT COUNT(*) FROM users;'"

# List users on remote
ssh deployer@194.163.134.129 "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db 'SELECT id, email, username, is_active FROM users;'"
```



