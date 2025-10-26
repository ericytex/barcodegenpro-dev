#!/bin/bash
# Easy Local Deployment Script for BarcodeGenPro
# This script makes it super easy to deploy and run locally

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  🚀 BarcodeGenPro - Local Deployment                          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker is installed${NC}"
        HAS_DOCKER=true
    else
        echo -e "${RED}✗ Docker is not installed${NC}"
        HAS_DOCKER=false
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose is available${NC}"
        HAS_DOCKER_COMPOSE=true
    else
        echo -e "${YELLOW}! Docker Compose not found (optional)${NC}"
        HAS_DOCKER_COMPOSE=false
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        echo -e "${GREEN}✓ Python ${PYTHON_VERSION} is installed${NC}"
        HAS_PYTHON=true
    else
        echo -e "${RED}✗ Python 3 is not installed${NC}"
        HAS_PYTHON=false
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ Node.js ${NODE_VERSION} is installed${NC}"
        HAS_NODE=true
    else
        echo -e "${RED}✗ Node.js is not installed${NC}"
        HAS_NODE=false
    fi
    
    echo ""
}

select_deployment_method() {
    echo -e "${YELLOW}Select deployment method:${NC}"
    echo ""
    echo "1) Docker Compose (Recommended - Easy & Fast)"
    echo "2) Local Development (Run backend and frontend separately)"
    echo ""
    read -p "Enter choice [1-2]: " choice
    
    case $choice in
        1)
            if [ "$HAS_DOCKER" = true ] && [ "$HAS_DOCKER_COMPOSE" = true ]; then
                deploy_docker
            else
                echo -e "${RED}Docker Compose is not available. Choose option 2 for local development.${NC}"
                exit 1
            fi
            ;;
        2)
            if [ "$HAS_PYTHON" = true ] && [ "$HAS_NODE" = true ]; then
                deploy_local
            else
                echo -e "${RED}Missing prerequisites for local development${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
}

deploy_docker() {
    echo ""
    echo -e "${GREEN}🚀 Starting with Docker Compose...${NC}"
    echo ""
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file...${NC}"
        cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
DOMAIN=localhost
API_PORT=8034
EOF
        echo -e "${GREEN}✓ Created .env file${NC}"
    fi
    
    # Build and start containers
    echo ""
    echo -e "${YELLOW}Building Docker images...${NC}"
    docker-compose build
    
    echo ""
    echo -e "${YELLOW}Starting containers...${NC}"
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✓ Deployment Complete!                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Your application is now running:"
    echo -e "  ${BLUE}Frontend:${NC}  http://localhost:80"
    echo -e "  ${BLUE}Backend API:${NC}  http://localhost:8034"
    echo -e "  ${BLUE}API Docs:${NC}  http://localhost:8034/docs"
    echo ""
    echo -e "To view logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "To stop: ${YELLOW}docker-compose down${NC}"
}

deploy_local() {
    echo ""
    echo -e "${GREEN}🚀 Starting Local Development...${NC}"
    echo ""
    
    # Check if backend virtual environment exists
    if [ ! -d "backend/venv" ]; then
        echo -e "${YELLOW}Setting up backend...${NC}"
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
        echo -e "${GREEN}✓ Backend dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Backend environment already exists${NC}"
    fi
    
    # Check if frontend node_modules exists
    if [ ! -d "frontend/node_modules" ]; then
        echo ""
        echo -e "${YELLOW}Setting up frontend...${NC}"
        cd frontend
        npm install
        cd ..
        echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Starting services...${NC}"
    echo ""
    
    # Start backend in background
    echo -e "${BLUE}Starting backend on port 8034...${NC}"
    cd backend
    source venv/bin/activate
    python app.py &
    BACKEND_PID=$!
    cd ..
    
    # Give backend time to start
    sleep 3
    
    # Start frontend
    echo -e "${BLUE}Starting frontend on port 8080...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✓ Services Started!                             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Your application is now running:"
    echo -e "  ${BLUE}Frontend:${NC}  http://localhost:8080"
    echo -e "  ${BLUE}Backend API:${NC}  http://localhost:8034"
    echo -e "  ${BLUE}API Docs:${NC}  http://localhost:8034/docs"
    echo ""
    echo -e "${YELLOW}Process IDs:${NC} Backend: $BACKEND_PID | Frontend: $FRONTEND_PID"
    echo ""
    echo -e "To stop: Press Ctrl+C or run: ${YELLOW}kill $BACKEND_PID $FRONTEND_PID${NC}"
    echo -e "${RED}Note:${NC} These processes will run until you stop them"
    echo ""
    
    # Wait for user to stop
    wait
}

# Main execution
print_header
check_prerequisites
select_deployment_method


