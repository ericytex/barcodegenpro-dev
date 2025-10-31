# Direct Docker Compose Commands

## Using GHCR Images (docker-compose.prod.yml)

```bash
# Pull latest images from GHCR
docker compose -f docker-compose.prod.yml pull

# Stop and remove containers
docker compose -f docker-compose.prod.yml down

# Start containers
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

## All-in-One (Pull, Stop, Start)

```bash
docker compose -f docker-compose.prod.yml pull && \
docker compose -f docker-compose.prod.yml down && \
docker compose -f docker-compose.prod.yml up -d
```

## Quick Commands

```bash
# Stop
docker compose -f docker-compose.prod.yml down

# Start
docker compose -f docker-compose.prod.yml up -d

# Restart
docker compose -f docker-compose.prod.yml restart

# Recreate (force rebuild containers)
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

