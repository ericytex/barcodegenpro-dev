# 🚀 Quick Start - Deploy BarcodeGenPro Locally

## ✅ Prerequisites Installed
- ✓ Docker & Docker Compose
- ✓ Python 3
- ✓ Node.js & npm

## 🎯 Choose Your Deployment Method

### Option 1: Docker Compose (Easiest) ⭐ Recommended
```bash
# Just run this one command:
docker-compose up -d

# That's it! Your app will be running:
# - Frontend: http://localhost:80
# - Backend: http://localhost:8034
# - API Docs: http://localhost:8034/docs
```

### Option 2: Automated Script
```bash
# Run the automated deployment script:
./start-local.sh

# Follow the interactive prompts
```

### Option 3: Manual Setup (For Development)

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install  # First time only
npm run dev
```

## 📍 Access Your Application

| Service | URL | Description |
|---------|-----|-------------|
| **Landing Page** | http://localhost:80 | Public landing page |
| **Dashboard** | http://localhost:80/dashboard | Main app (login required) |
| **API** | http://localhost:8034 | Backend API |
| **API Docs** | http://localhost:8034/docs | Interactive API docs |

## 🎯 First Steps After Deployment

1. **Open your browser**: http://localhost:80
2. **Click "Get Started"** or go to http://localhost:80/register
3. **Create an account**
4. **Navigate through the app** using the sidebar
5. **Check the How-To guide**: http://localhost:80/how-to

## 🛠️ Useful Commands

### Docker
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

### Local Development
```bash
# Backend logs
cd backend && source venv/bin/activate && python app.py

# Frontend logs  
cd frontend && npm run dev
```

## 🔧 Troubleshooting

**Can't access the app?**
- Check if ports 80 and 8034 are available
- Run: `docker-compose logs` to see errors

**Port conflicts?**
- Edit `docker-compose.yml` to change ports
- Or use: `sudo lsof -i :80` to find what's using port 80

**Database issues?**
- Delete `backend/data/barcode_generator.db`
- Restart: `docker-compose restart backend`

## 📚 More Info

- Full deployment guide: `LOCAL_DEPLOYMENT.md`
- Backend docs: `backend/README.md`
- Frontend docs: `frontend/README.md`
- Project README: `README.md`


