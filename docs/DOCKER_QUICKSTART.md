# 🐳 Docker Quick Start

## Local Development (Test on Your Machine)

```bash
# 1. Copy environment template
cp env.docker.example .env

# 2. Edit configuration (optional for local testing)
nano .env

# 3. Start services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f

# 6. Access application
# Frontend: http://localhost
# Backend: http://localhost:8034
# API Docs: http://localhost:8034/docs

# 7. Stop when done
docker-compose down
```

## Production Deployment (to VPS)

### Method 1: Automated Script (Easiest!)

```bash
cd deploy-package

# Configure
nano config.sh  # Set VPS_IP, DOMAIN, SECRET_KEY

# Deploy with Docker
./docker-deploy.sh
```

### Method 2: Manual Docker Deployment

```bash
# 1. Install Docker on VPS
ssh root@YOUR_VPS_IP
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 2. Upload code from local machine
rsync -avz --exclude='node_modules' --exclude='venv' \
  /Users/ericwatyekele/Research/BARCODE-GENERATOR/ \
  root@YOUR_VPS_IP:/home/barcode/app/

# 3. SSH to VPS and configure
ssh root@YOUR_VPS_IP
cd /home/barcode/app

# Create .env file
cat > .env << EOF
DOMAIN=your-domain.com
SECRET_KEY=$(openssl rand -hex 32)
API_PORT=8034
API_WORKERS=2
FRONTEND_PORT=80
EOF

# 4. Start services
docker-compose up -d --build

# 5. Check status
docker-compose ps
docker-compose logs -f
```

## Quick Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Check status
docker-compose ps

# Rebuild and restart
docker-compose up -d --build

# Update backend only
docker-compose up -d --build backend

# Access backend container shell
docker-compose exec backend bash

# View resource usage
docker stats
```

## Accessing Services

### Local Development
- Frontend: http://localhost
- Backend API: http://localhost:8034
- API Docs: http://localhost:8034/docs
- Health Check: http://localhost:8034/healthz

### Production (after DNS configured)
- Frontend: http://YOUR_DOMAIN.com
- Backend API: http://YOUR_DOMAIN.com:8034
- API Docs: http://YOUR_DOMAIN.com:8034/docs

## Backup Database

```bash
# From host machine
docker-compose exec backend sqlite3 /app/data/barcode_generator.db ".backup /app/data/backup.db"
docker cp barcode-backend:/app/data/backup.db ./backup-$(date +%Y%m%d).db
```

## Restore Database

```bash
docker cp ./backup.db barcode-backend:/app/data/barcode_generator.db
docker-compose restart backend
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs backend
docker-compose ps
```

### Test backend connectivity
```bash
# From host
curl http://localhost:8034/healthz

# From frontend container
docker-compose exec frontend wget -O- http://backend:8034/healthz
```

### Reset everything
```bash
docker-compose down -v  # WARNING: Deletes all data!
docker-compose up -d --build
```

## Comparing Deployments

| Aspect | Docker | Native (systemd) |
|--------|--------|------------------|
| Deploy command | `./docker-deploy.sh` | `./deploy.sh` |
| Update | `docker-compose up -d --build` | `./scripts/update-*.sh` |
| Logs | `docker-compose logs -f` | `journalctl -u barcode-api -f` |
| Restart | `docker-compose restart` | `systemctl restart barcode-api` |
| Portability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Resource usage | 90% | 100% baseline |
| Complexity | Medium | Medium |

## When to Use Docker?

✅ **Use Docker if you:**
- Want easy portability between servers
- Need guaranteed environment consistency  
- Plan to scale or use orchestration
- Want simple rollback (image versions)

✅ **Use Native (systemd) if you:**
- Running single VPS long-term
- Want maximum performance
- Prefer simpler architecture
- Have limited resources

**Both methods work great!** Choose based on your needs.

## Need More Help?

- Full Docker guide: See `DOCKER_README.md`
- Troubleshooting: See `deploy-package/docs/TROUBLESHOOTING.md`
- Native deployment: See `deploy-package/README.md`

