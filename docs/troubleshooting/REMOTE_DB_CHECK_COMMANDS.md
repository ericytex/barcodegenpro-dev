# Quick Commands to Check Database on Remote Server

Run these commands **ON THE REMOTE SERVER**:

## Option 1: Use the Check Script

```bash
cd ~/barcodegenpro-dev
./deploy/check-remote-db.sh
```

Or if the script is in a different location:
```bash
bash ~/barcodegenpro-dev/deploy/check-remote-db.sh
```

## Option 2: Manual Commands

### Check if database file exists on host:
```bash
ls -lh ~/barcodegenpro-dev/backend/data/barcode_generator.db
```

### Check database in container:
```bash
# Check if database exists in container
docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db

# Check what's in /app/data
docker exec barcode-v2-backend ls -la /app/data/

# Check DATABASE_PATH environment variable
docker exec barcode-v2-backend env | grep DATABASE_PATH
```

### Check database tables (if sqlite3 is installed):
```bash
# List all tables
sqlite3 ~/barcodegenpro-dev/backend/data/barcode_generator.db ".tables"

# Check if users table exists
sqlite3 ~/barcodegenpro-dev/backend/data/barcode_generator.db "SELECT name FROM sqlite_master WHERE type='table' AND name='users';"

# Count users
sqlite3 ~/barcodegenpro-dev/backend/data/barcode_generator.db "SELECT COUNT(*) FROM users;"

# List users
sqlite3 ~/barcodegenpro-dev/backend/data/barcode_generator.db "SELECT id, email, username, is_active FROM users;"

# Check token_settings table
sqlite3 ~/barcodegenpro-dev/backend/data/barcode_generator.db "SELECT COUNT(*) FROM token_settings;"
```

### Or check from inside container:
```bash
# List tables from container
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db ".tables"

# Count users from container
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;"

# List users from container
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT id, email, username FROM users;"
```

### Check Docker volume mount:
```bash
# Check docker-compose.yml for volume mounts
grep -A 10 "volumes:" ~/barcodegenpro-dev/docker-compose.yml | grep -E "(data|backend/data)"
```

### Check container logs for database path:
```bash
docker logs barcode-v2-backend 2>&1 | grep -i "database\|db_path" | tail -10
```

## Quick Diagnostic One-Liner

```bash
echo "=== Database Check ===" && \
echo "Host DB:" && ls -lh ~/barcodegenpro-dev/backend/data/barcode_generator.db 2>/dev/null || echo "NOT FOUND" && \
echo "" && \
echo "Container DB:" && docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db 2>/dev/null || echo "NOT FOUND" && \
echo "" && \
echo "Users count:" && docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "Cannot query"
```



