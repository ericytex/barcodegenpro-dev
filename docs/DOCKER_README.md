# 🐳 Docker Deployment Guide

This guide covers deploying the Barcode Generator application using Docker and Docker Compose.

## 📦 What's Included

- **Backend Dockerfile** (`api_all_devices/Dockerfile`) - Multi-stage Python build
- **Frontend Dockerfile** (`frontend/Dockerfile`) - Multi-stage Node + Nginx build
- **Docker Compose** (`docker-compose.yml`) - Orchestrates both containers
- **Nginx Proxy** (`nginx-proxy.conf`) - Optional reverse proxy configuration

## 🚀 Quick Start

### Local Development with Docker

```bash
# 1. Create environment file
cp env.docker.example .env
nano .env  # Update DOMAIN and SECRET_KEY

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Access application
# Frontend: http://localhost
# Backend API: http://localhost:8034
# API Docs: http://localhost:8034/docs
```

### Production Deployment to VPS

```bash
# Use the automated Docker deployment script
cd deploy-package
./docker-deploy.sh
```

## 📋 Docker Architecture

```
┌─────────────────────────────────────────────────┐
│                    VPS/Host                     │
│  ┌───────────────────────────────────────────┐  │
│  │         Docker Network (bridge)           │  │
│  │                                           │  │
│  │  ┌──────────────┐    ┌─────────────────┐ │  │
│  │  │   Frontend   │    │     Backend     │ │  │
│  │  │   (Nginx)    │    │    (FastAPI)    │ │  │
│  │  │   Port 80    │    │   Port 8034     │ │  │
│  │  └──────────────┘    └─────────────────┘ │  │
│  │         │                     │           │  │
│  │         │              ┌──────▼───────┐   │  │
│  │         │              │   Volumes:   │   │  │
│  │         │              │   - data     │   │  │
│  │         │              │   - uploads  │   │  │
│  │         │              │   - logs     │   │  │
│  │         │              └──────────────┘   │  │
│  └─────────┼───────────────────────────────┘  │
│            │                                   │
│       Port 80 (Host)                          │
│       Port 8034 (Host)                        │
└───────────────────────────────────────────────┘
```

## 🛠️ Manual Docker Commands

### Building Images

```bash
# Build backend only
docker build -t barcode-backend ./api_all_devices

# Build frontend only
docker build -t barcode-frontend ./frontend

# Build both with docker-compose
docker-compose build
```

### Running Containers

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View running containers
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Managing Containers

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop backend

# Restart services
docker-compose restart

# Remove containers (keeps volumes)
docker-compose down

# Remove containers and volumes (DESTRUCTIVE!)
docker-compose down -v
```

### Updating Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
```

## 📊 Docker Compose Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
DOMAIN=your-domain.com
SECRET_KEY=your-32-character-secret-key
API_PORT=8034
API_WORKERS=2
FRONTEND_PORT=80
```

### Volumes

Docker Compose creates persistent volumes for:

- `backend-data` - SQLite database
- `backend-uploads` - User uploads
- `backend-downloads` - Generated files
- `backend-logs` - Application logs
- `backend-archives` - Archived data

View volumes:
```bash
docker volume ls
docker volume inspect barcode-generator_backend-data
```

### Accessing Volume Data

```bash
# Backend data location on host
docker volume inspect barcode-generator_backend-data | grep Mountpoint

# Copy file from volume
docker cp barcode-backend:/app/data/barcode_generator.db ./backup.db

# Copy file to volume
docker cp ./backup.db barcode-backend:/app/data/barcode_generator.db
```

## 🔧 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Inspect container
docker inspect barcode-backend
```

### Backend Connection Issues

```bash
# Test backend from host
curl http://localhost:8034/healthz

# Test backend from frontend container
docker-compose exec frontend wget -O- http://backend:8034/healthz

# Check network
docker network inspect barcode-generator_barcode-network
```

### Database Issues

```bash
# Access backend container
docker-compose exec backend bash

# Inside container, check database
sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;"

# Backup database
docker-compose exec backend sqlite3 /app/data/barcode_generator.db ".backup /app/data/backup.db"
```

### Reset Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker rmi barcode-backend barcode-frontend

# Start fresh
docker-compose up -d --build
```

## 🔐 Production Considerations

### SSL/HTTPS Setup

1. **Option 1: Using Certbot in a container**
```bash
# Add to docker-compose.yml
services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
```

2. **Option 2: Use Cloudflare proxy** (Recommended)
   - Set DNS proxy to "Proxied" (orange cloud)
   - Cloudflare handles SSL automatically

### Environment Security

```bash
# Generate secure secret key
openssl rand -hex 32

# Set restrictive permissions on .env
chmod 600 .env
```

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Logging Configuration

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 📈 Monitoring

### Health Checks

Both containers have built-in health checks:

```bash
# Check health status
docker-compose ps

# View health check logs
docker inspect barcode-backend | grep -A 10 Health
```

### Resource Usage

```bash
# View resource usage
docker stats

# View specific container
docker stats barcode-backend
```

## 🔄 Backup & Restore

### Backup

```bash
# Backup database
docker-compose exec backend sqlite3 /app/data/barcode_generator.db ".backup /app/data/backup.db"
docker cp barcode-backend:/app/data/backup.db ./backup-$(date +%Y%m%d).db

# Backup volumes
docker run --rm -v barcode-generator_backend-data:/data -v $(pwd):/backup ubuntu tar czf /backup/backend-data-backup.tar.gz /data
```

### Restore

```bash
# Restore database
docker cp ./backup.db barcode-backend:/app/data/barcode_generator.db
docker-compose restart backend

# Restore volume
docker run --rm -v barcode-generator_backend-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/backend-data-backup.tar.gz -C /
```

## 🆚 Docker vs Native Deployment

| Feature | Docker | Native |
|---------|--------|--------|
| **Setup Time** | 10-15 min | 10-15 min |
| **Updates** | `docker-compose up -d --build` | Custom scripts |
| **Isolation** | Full | Partial |
| **Portability** | Excellent | Good |
| **Resource Usage** | +10-15% | Baseline |
| **Debugging** | docker exec | Direct |
| **Rollback** | Image tags | Git + manual |

## 🎯 When to Use Docker

✅ **Use Docker when:**
- Moving between different servers frequently
- Need guaranteed environment consistency
- Want easy rollback capability
- Planning to scale horizontally
- Using container orchestration (K8s)

❌ **Use Native when:**
- Running on a single VPS long-term
- Want maximum performance
- Prefer simpler architecture
- Have limited resources

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Python in Docker](https://docs.docker.com/language/python/best-practices/)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)

## 🤝 Integration with Existing Scripts

The `deploy-package` now includes both deployment methods:

```bash
# Native deployment (systemd + nginx)
./deploy.sh

# Docker deployment
./docker-deploy.sh
```

Both share the same `config.sh` configuration file!

---

**Need help?** Check `docs/TROUBLESHOOTING.md` or the main `README.md`.


