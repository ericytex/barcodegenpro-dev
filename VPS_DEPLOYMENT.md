# VPS Deployment Instructions

## Quick Start - Run on VPS

### Prerequisites
- SSH access to your VPS
- Docker and Docker Compose installed
- Git (if cloning repository)

### Option 1: Using Existing Repository (Recommended)

If you already have the repository on your VPS:

```bash
# SSH into your VPS
ssh deployer@194.163.134.129

# Navigate to your project directory
cd ~/barcodegenpro-dev  # or wherever your project is located

# Pull latest changes
git pull origin main

# Stop any existing containers
docker compose down

# Build and start containers
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Option 2: Fresh Setup

If setting up for the first time:

```bash
# SSH into your VPS
ssh deployer@194.163.134.129

# Clone repository (or create directory)
mkdir -p ~/barcodegenpro-dev
cd ~/barcodegenpro-dev

# If using git:
git clone https://github.com/ericytex/barcodegenpro-dev.git .

# Or transfer files using rsync from local machine:
# (Run this from your local machine)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  --exclude 'backend/downloads/barcodes/*' \
  --exclude 'backend/downloads/pdfs/*' \
  --exclude 'backend/logs/*' \
  /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/ \
  deployer@194.163.134.129:~/barcodegenpro-dev/
```

### Step 3: Configure Environment

```bash
cd ~/barcodegenpro-dev

# Copy environment template
cp env.docker.example .env

# Edit environment file
nano .env
```

**Required settings in `.env`:**
```env
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32
DOMAIN=194.163.134.129
API_PORT=8034
DATABASE_PATH=/app/data/barcode_generator.db
```

### Step 4: Build and Deploy

```bash
cd ~/barcodegenpro-dev

# Build images (first time takes 5-10 minutes)
docker compose build

# Start containers
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

### Step 5: Verify Deployment

```bash
# Check containers are running
docker compose ps
# Should show: barcode-v2-backend and barcode-v2-frontend

# Test health endpoints
curl http://localhost:8080/healthz
curl http://localhost:8034/healthz

# Check database
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;"
```

### Access Application

- **Frontend:** http://194.163.134.129:8080
- **Backend API:** http://194.163.134.129:8034

## Common Commands

### Stop Services
```bash
cd ~/barcodegenpro-dev
docker compose down
```

### Start Services
```bash
cd ~/barcodegenpro-dev
docker compose up -d
```

### Restart Services
```bash
cd ~/barcodegenpro-dev
docker compose restart
```

### View Logs
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Rebuild After Code Changes
```bash
cd ~/barcodegenpro-dev
docker compose down
docker compose up -d --build
```

### Check Container Status
```bash
docker compose ps
docker ps
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep 8034
sudo netstat -tulpn | grep 8080

# Stop conflicting containers
docker stop $(docker ps -q)
```

### Container Won't Start
```bash
# Check detailed logs
docker compose logs backend
docker compose logs frontend

# Rebuild without cache
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database Issues
```bash
# Fix permissions
sudo chown -R deployer:deployer backend/data/
chmod 664 backend/data/barcode_generator.db

# Check database
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db ".tables"
```

### 502 Bad Gateway
```bash
# Check if backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend

# Verify nginx config
docker exec barcode-v2-frontend cat /etc/nginx/conf.d/default.conf
```

## Update Instructions

### Quick Update (Code Changes Only)
```bash
# On VPS
cd ~/barcodegenpro-dev
git pull origin main
docker compose up -d --build
```

### Full Update (From Local Machine)
```bash
# From local machine - sync files
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  --exclude 'backend/data/*.db*' \
  --exclude 'backend/logs/*' \
  /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/ \
  deployer@194.163.134.129:~/barcodegenpro-dev/

# Then on VPS
ssh deployer@194.163.134.129
cd ~/barcodegenpro-dev
docker compose up -d --build
```

## Important Notes

1. **Database Location:** Database is stored in `backend/data/barcode_generator.db` and is persisted via volume mount
2. **Ports:**
   - Frontend: 8080
   - Backend: 8034
3. **Container Names:**
   - Backend: `barcode-v2-backend`
   - Frontend: `barcode-v2-frontend`
4. **Network:** Containers communicate via `barcode-v2-network`

## Backup Database

```bash
# Create backup
cd ~/barcodegenpro-dev
cp backend/data/barcode_generator.db backend/data/barcode_generator_backup_$(date +%Y%m%d_%H%M%S).db

# Or from container
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db ".backup /app/data/backup.db"
```

## Rollback

```bash
cd ~/barcodegenpro-dev

# Stop containers
docker compose down

# Restore database backup
cp backend/data/barcode_generator_backup_*.db backend/data/barcode_generator.db

# Restart
docker compose up -d
```

