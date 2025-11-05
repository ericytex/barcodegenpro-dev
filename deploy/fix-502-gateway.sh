#!/bin/bash

# Script to diagnose and fix 502 Bad Gateway error
# Run on remote server

echo "=== Diagnosing 502 Bad Gateway ==="
echo ""

# 1. Check if backend container is running
echo "1. Checking backend container status:"
if docker ps | grep -q barcode-v2-backend; then
    echo "   ✅ Backend container is running"
    docker ps | grep barcode-v2-backend
else
    echo "   ❌ Backend container is NOT running"
    echo ""
    echo "   Starting container..."
    cd ~/barcodegenpro-dev && docker compose up -d backend
    exit 0
fi

echo ""
echo "2. Checking backend container health:"
HEALTH=$(docker inspect barcode-v2-backend --format='{{.State.Health.Status}}' 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo "   Health status: $HEALTH"
else
    echo "   Health check not configured"
fi

echo ""
echo "3. Testing backend directly (bypassing proxy):"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8034/healthz 2>/dev/null)
if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Backend responds on port 8034 ($HTTP_CODE)"
    curl -s http://localhost:8034/healthz | head -2
else
    echo "   ❌ Backend NOT responding on port 8034 ($HTTP_CODE)"
    echo ""
    echo "   Checking container logs:"
    docker logs barcode-v2-backend --tail 20 | tail -10
fi

echo ""
echo "4. Checking port binding:"
docker port barcode-v2-backend | grep 8034 || echo "   ⚠️  Port 8034 not bound"

echo ""
echo "5. Checking network connectivity:"
if docker exec barcode-v2-backend curl -f http://localhost:8034/healthz >/dev/null 2>&1; then
    echo "   ✅ Container can reach itself on localhost:8034"
else
    echo "   ❌ Container cannot reach itself"
fi

echo ""
echo "6. Checking if nginx/frontend can reach backend:"
if docker ps | grep -q barcode-v2-frontend; then
    echo "   Frontend container is running"
    if docker exec barcode-v2-frontend wget -q -O- http://barcode-v2-backend:8034/healthz >/dev/null 2>&1; then
        echo "   ✅ Frontend can reach backend via Docker network"
    else
        echo "   ❌ Frontend cannot reach backend"
        echo "   Checking network:"
        docker network ls | grep barcode
    fi
else
    echo "   ⚠️  Frontend container not found"
fi

echo ""
echo "=== Recommended Fixes ==="
echo ""
echo "If backend is not responding:"
echo "  1. Restart backend: docker compose restart backend"
echo "  2. Check logs: docker logs barcode-v2-backend --tail 50"
echo ""
echo "If backend responds but proxy can't reach it:"
echo "  1. Check nginx/proxy configuration"
echo "  2. Verify Docker network: docker network inspect barcodegenpro-dev_barcode-v2-network"
echo "  3. Restart all containers: docker compose restart"
echo ""
echo "If port is not accessible:"
echo "  1. Check firewall: sudo ufw status"
echo "  2. Verify port binding in docker-compose.yml"
echo ""



