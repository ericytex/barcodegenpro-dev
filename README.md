# Barcode Generator Pro - Development Repository

A comprehensive barcode generation system with React frontend, FastAPI backend, and Docker deployment capabilities.

## 🏗️ Architecture

This is a **monorepo** containing all components of the Barcode Generator Pro system:

```
barcodegenpro-dev/
├── backend/           # FastAPI Python backend
├── frontend/          # React TypeScript frontend  
├── deploy/            # Docker deployment scripts
├── docs/              # Documentation files
├── docker-compose.yml # Main Docker orchestration
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended) or **Docker Compose v2** (`docker compose`)
- **Python 3.11+** (for local development)
- **Node.js 18+** (for frontend development)

### 🎯 Easiest Deployment (One Command!)

**For Docker Compose v2 (newer Docker versions):**
```bash
docker compose up -d
```

**For Docker Compose v1 (older installations):**
```bash
docker-compose up -d
```

That's it! Your application will be running in seconds.

### 📍 Access Your Application

Once started, access:
- **Landing Page**: http://localhost:80
- **Dashboard**: http://localhost:80/dashboard
- **Backend API**: http://localhost:8034
- **API Docs**: http://localhost:8034/docs

### 🛠️ Common Commands

```bash
# View running services
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart

# Rebuild after code changes
docker compose up -d --build
```

### 🤖 Automated Deployment Script

For an interactive deployment experience:
```bash
./start-local.sh
```

This script will:
1. Check your prerequisites (Docker, Python, Node.js)
2. Let you choose between Docker or Local development
3. Set up everything automatically
4. Start your services

### 📚 Deployment Guides

Detailed guides are available:
- **`QUICK_START.md`** - Fastest way to get started (2 minutes)
- **`LOCAL_DEPLOYMENT.md`** - Detailed local development setup
- **`DEPLOYMENT_GUIDE.md`** - Production/VPS deployment guide
- **`start-local.sh`** - Interactive deployment script

### Local Development (No Docker)

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

### Backend (`/backend`)
- **FastAPI** application with comprehensive barcode generation
- **Features**: Device management, payment processing, user authentication
- **Database**: SQLite with SQLAlchemy ORM
- **Security**: API key authentication, rate limiting
- **Documentation**: See `backend/README.md`

### Frontend (`/frontend`)
- **React 18** with TypeScript
- **UI**: shadcn/ui components with Tailwind CSS
- **Features**: Barcode generation, device management, payment dashboard
- **Build**: Vite for fast development and production builds
- **Documentation**: See `frontend/README.md`

### Deployment (`/deploy`)
- **Docker** deployment scripts and configurations
- **Production** ready with nginx reverse proxy
- **SSL** certificate generation
- **Backup** and maintenance scripts
- **Documentation**: See `deploy/README.md`

### Documentation (`/docs`)
- **Device Management Guide**: Complete device management system documentation
- **Payment System**: Payment provider integration and transaction handling
- **Docker Guides**: Quick start and comprehensive deployment instructions
- **Testing Guide**: API testing and validation procedures
- **Token System**: Authentication and authorization documentation

## 🔧 Configuration

### Environment Variables

Create `.env` files in the appropriate directories:

**Backend** (`backend/.env`):
```env
API_HOST=0.0.0.0
API_PORT=8034
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:80,http://localhost:8080
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8034
VITE_ENVIRONMENT=development
```

**Root** (`.env`):
```env
DOMAIN=localhost
SECRET_KEY=your-secret-key
```

## 🐳 Docker Services

The `docker-compose.yml` defines three main services:

- **backend**: FastAPI application (port 8034)
- **frontend**: Nginx serving React build (port 80)
- **nginx-proxy**: Reverse proxy for production (port 8080, optional)

## 📚 Documentation

### Component Documentation
- [Backend API Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)
- [Deployment Guide](deploy/README.md)

### System Documentation
- [Device Management Guide](docs/DEVICE_MANAGEMENT_GUIDE.md)
- [Payment System Documentation](docs/PAYMENT_SYSTEM.md)
- [Docker Quick Start](docs/DOCKER_QUICKSTART.md)
- [Testing Guide](docs/TESTING_GUIDE.md)
- [Token System Guide](docs/TOKEN_LOGIC_FLOW.md)

### Troubleshooting
- [Troubleshooting Guide](docs/troubleshooting/README.md) - Common issues and fixes
- [502 Bad Gateway](docs/troubleshooting/502_DIAGNOSIS.md) - Diagnosing 502 errors
- [Permission Issues](docs/troubleshooting/FIX_DEPLOYER_PERMISSIONS.md) - Fixing permission problems

## 🛠️ Development

### Adding New Features

1. **Backend**: Add routes in `backend/routes/`, services in `backend/services/`
2. **Frontend**: Add components in `frontend/src/components/`, pages in `frontend/src/pages/`
3. **Database**: Update models in `backend/models/`, run migrations
4. **Documentation**: Update relevant docs in `docs/`

### Testing

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Code Quality

```bash
# Backend linting
cd backend
flake8 .
black .

# Frontend linting
cd frontend
npm run lint
npm run format
```

## 🚀 Deployment

### Production Deployment

1. **Using deploy package:**
   ```bash
   cd deploy
   ./QUICKSTART.sh
   ```

2. **Manual Docker deployment:**
   ```bash
   docker-compose -f docker-compose.yml --env-file .env up -d
   ```

3. **VPS deployment:**
   ```bash
   cd deploy
   ./docker-deploy.sh
   ```

### Environment-Specific Configurations

- **Development**: Use `docker-compose.yml` with local settings
- **Production**: Use `deploy/docker-compose.yml` with production optimizations
- **Testing**: Use `docker-compose.test.yml` for integration tests

## 🔒 Security

- **API Authentication**: API key-based authentication
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **CORS**: Configurable CORS origins
- **Environment Variables**: Sensitive data stored in environment variables
- **Docker Security**: Non-root containers, minimal base images

## 📊 Monitoring & Logging

- **Health Checks**: Built-in health monitoring endpoints
- **Logging**: Structured logging with configurable levels
- **Metrics**: Application metrics and performance monitoring
- **Backup**: Automated database and file backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Create GitHub issues for bugs and feature requests
- **API Documentation**: Visit `/docs` endpoint when running the backend

## 🔄 Version History

- **v1.0.0**: Initial release with core barcode generation
- **v1.1.0**: Added device management system
- **v1.2.0**: Integrated payment processing
- **v1.3.0**: Enhanced security and authentication
- **v2.0.0**: Monorepo restructure and Docker optimization

---

**Repository**: https://github.com/ericytex/barcodegenpro-dev  
**Backend API**: FastAPI with comprehensive barcode generation  
**Frontend**: React with modern UI components  
**Deployment**: Docker with production-ready configurations