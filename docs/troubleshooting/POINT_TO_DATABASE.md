# How to Point Container to the Right Database

## Current Configuration

The `docker-compose.yml` uses a bind mount:
```yaml
volumes:
  - ./backend/data:/app/data
```

This means:
- **Host path**: `./backend/data/barcode_generator.db` (relative to where docker-compose.yml is)
- **Container path**: `/app/data/barcode_generator.db`

The backend defaults to `data/barcode_generator.db` which resolves to `/app/data/barcode_generator.db` ✅

## Steps to Ensure Correct Database

### 1. Verify Database Location on Remote Server

```bash
# On remote server, check where docker-compose.yml is
cd ~/barcodegenpro-dev
pwd

# Check if database exists
ls -lh ./backend/data/barcode_generator.db
```

### 2. Use Absolute Path (Recommended for Remote Server)

Edit `docker-compose.yml` on the remote server:

```yaml
volumes:
  # Use absolute path to avoid path resolution issues
  - ~/barcodegenpro-dev/backend/data:/app/data
```

Or use:
```yaml
volumes:
  - /home/deployer/barcodegenpro-dev/backend/data:/app/data
```

### 3. Explicitly Set DATABASE_PATH (Already Added)

I've added `DATABASE_PATH` to the environment in docker-compose.yml:
```yaml
environment:
  - DATABASE_PATH=/app/data/barcode_generator.db
```

This ensures the backend knows exactly where the database is.

### 4. Restart Container

```bash
# Stop containers
docker compose down

# Start containers (will pick up new config)
docker compose up -d

# Or just restart backend
docker compose restart backend
```

### 5. Verify It's Working

```bash
# Check database in container
docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db

# Check DATABASE_PATH environment variable
docker exec barcode-v2-backend env | grep DATABASE_PATH

# Check if backend can access database
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;"
```

## Alternative: Use Absolute Path in docker-compose.yml

If relative paths aren't working, update the volume mount to use absolute path:

```yaml
volumes:
  - /home/deployer/barcodegenpro-dev/backend/data:/app/data
```

## Quick Fix Command (Run on Remote Server)

```bash
cd ~/barcodegenpro-dev

# 1. Ensure database exists
mkdir -p backend/data
ls -lh backend/data/barcode_generator.db || echo "Database not found - need to copy it"

# 2. Check current volume mount
grep -A 1 "volumes:" docker-compose.yml | grep "backend/data"

# 3. Restart container to pick up any changes
docker compose restart backend

# 4. Verify
docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db
docker exec barcode-v2-backend env | grep DATABASE_PATH
```

## If Database is in a Different Location

If your database is elsewhere on the remote server:

1. **Copy it to the expected location:**
   ```bash
   cp /path/to/your/database.db ~/barcodegenpro-dev/backend/data/barcode_generator.db
   ```

2. **Or update the volume mount** to point to where it actually is:
   ```yaml
   volumes:
     - /actual/path/to/data:/app/data
   ```

## Troubleshooting

### Container can't see database:
- Check volume mount is correct
- Ensure database file exists on host
- Check file permissions (should be readable by container)
- Use absolute paths instead of relative

### Wrong database being used:
- Check `DATABASE_PATH` environment variable in container
- Verify volume mount is correct
- Restart container after changes



