# 🚀 Local Deployment Guide

## Quick Start (Easiest Method)

```bash
./start-local.sh
```

This script will:
1. Check your prerequisites
2. Let you choose Docker or Local development
3. Set up everything automatically
4. Start your services

## Method 1: Docker Compose (Recommended)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Steps
```bash
# 1. Make sure you're in the project root
cd /home/ironscepter/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev

# 2. Start everything with one command
docker-compose up -d

# 3. View your application
# Frontend: http://localhost:80
# Backend API: http://localhost:8034
# API Docs: http://localhost:8034/docs
```

### Useful Commands
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend
```

## Method 2: Local Development (No Docker)

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Steps

#### Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend
python app.py
```

Backend will run on: `http://localhost:8034`

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:8080`

## Access Your Application

- **Landing Page**: http://localhost:8080 (or port 80 if using Docker)
- **Dashboard**: http://localhost:8080/dashboard (login required)
- **Backend API**: http://localhost:8034
- **API Documentation**: http://localhost:8034/docs

## First Time Setup

### 1. Create an Account
1. Go to http://localhost:8080/register
2. Fill in your details
3. Click "Register"

### 2. Get API Key
1. Log in to your account
2. Go to Settings → API Settings
3. Copy your API key
4. Use it for API requests

### 3. Purchase Tokens
1. Go to Dashboard
2. Click "Buy Tokens" in the navigation bar
3. Select a package
4. Complete payment (test mode for local development)

## Environment Variables

### Backend (.env in project root)
```env
SECRET_KEY=your-secret-key-here
DOMAIN=localhost
API_PORT=8034
```

### Frontend (.env in frontend/)
```env
VITE_API_BASE_URL=http://localhost:8034/api
VITE_ENVIRONMENT=development
```

## Troubleshooting

### Backend Issues
- **Port 8034 already in use**: Change `API_PORT` in `.env`
- **Database errors**: Delete `backend/data/barcode_generator.db` and restart
- **Import errors**: Activate virtual environment and reinstall dependencies

### Frontend Issues
- **Port 8080 already in use**: Edit `frontend/vite.config.ts` to change port
- **API connection errors**: Check `VITE_API_BASE_URL` in `.env`
- **Build errors**: Clear cache: `rm -rf node_modules && npm install`

### Docker Issues
- **Container won't start**: Check logs: `docker-compose logs`
- **Build fails**: Try: `docker-compose build --no-cache`
- **Port conflicts**: Edit `docker-compose.yml` to change ports

## Database

The application uses SQLite for local development:
- **Location**: `backend/data/barcode_generator.db`
- **Backup location**: `backend/data/backups/`
- **Archives**: `backend/archives/`

## Stopping Services

### Docker
```bash
docker-compose down
```

### Local Development
```bash
# Stop backend (Ctrl+C in terminal)
# Stop frontend (Ctrl+C in terminal)

# Or find and kill processes
ps aux | grep "python app.py"
kill <PID>

ps aux | grep "npm run dev"
kill <PID>
```

## Next Steps

1. ✅ Deploy locally
2. ✅ Create an account
3. ✅ Test the features
4. ✅ Check the How-To guide at `/how-to`
5. ✅ Explore the landing page at `/`

## Need Help?

Check out:
- `frontend/src/pages/HowToPage.tsx` - User guide
- `docs/` - Detailed documentation
- `backend/README.md` - Backend API docs
- `frontend/README.md` - Frontend docs


