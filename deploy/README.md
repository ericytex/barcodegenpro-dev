# 🚀 Barcode Generator - Complete Deployment Package

This is a **single, portable deployment package** that contains everything you need to deploy your Barcode Generator application to any VPS.

## 📦 What's Inside

```
deploy-package/
├── config.sh              # Your deployment configuration (EDIT THIS FIRST!)
├── deploy.sh              # Main deployment script (RUN THIS!)
├── scripts/               # Supporting scripts
│   ├── vps-setup.sh      # VPS initial setup
│   ├── backup-db.sh      # Database backup automation
│   ├── setup-https.sh    # HTTPS/SSL setup with Let's Encrypt
│   ├── update-backend.sh # Quick backend update
│   ├── update-frontend.sh# Quick frontend update
│   └── logs.sh           # Log viewer utility
├── configs/              # Configuration files
│   └── barcode-api.service  # Systemd service file
└── docs/                 # Documentation
    └── TROUBLESHOOTING.md   # Common issues and solutions
```

## ⚡ Quick Start (3 Steps)

### Step 1: Configure
```bash
# Edit config.sh with your details
nano config.sh

# Required changes:
# - VPS_IP="YOUR_VPS_IP"          → Your VPS IP address
# - DOMAIN="YOUR_DOMAIN.com"      → Your domain name
# - SECRET_KEY="..."              → Generate with: openssl rand -hex 32
```

### Step 2: Deploy
```bash
# Make sure you're in the deploy-package directory
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Configure DNS
- Go to Cloudflare Dashboard
- Add A record: `@` → Your VPS IP
- Wait 5-30 minutes for DNS propagation
- Visit your domain!

## 📋 Prerequisites

- **VPS**: Ubuntu 20.04/22.04 with root SSH access
- **Domain**: Configured in Cloudflare
- **Local Machine**: 
  - SSH access to VPS
  - rsync installed
  - Node.js and npm installed

## 🎯 What the Main Script Does

The `deploy.sh` script automatically:

1. ✅ Sets up your VPS (installs packages, creates users)
2. ✅ Deploys backend code and configures Python environment
3. ✅ Builds and deploys frontend
4. ✅ Configures Nginx reverse proxy
5. ✅ Sets up database backups (every 6 hours)
6. ✅ Configures firewall (UFW)
7. ✅ Tests the deployment
8. ✅ Provides next steps

**Estimated time: ~10-15 minutes** (plus DNS propagation)

## 🔧 Configuration Guide

### Editing config.sh

```bash
# Open the config file
nano config.sh
```

**Required Settings:**
- `VPS_IP` - Your VPS IP address from Contabo
- `DOMAIN` - Your domain name (without http://)
- `SECRET_KEY` - Generate one with: `openssl rand -hex 32`

**Optional Settings** (usually fine as-is):
- `VPS_USER` - SSH user (default: root)
- `API_PORT` - Backend port (default: 8034)
- `API_WORKERS` - Number of workers (default: 2)

## 📖 Detailed Usage

### Initial Deployment

```bash
# 1. Edit configuration
nano config.sh

# 2. Run deployment
./deploy.sh

# 3. Follow the on-screen instructions
```

### Updating Your Application

**Update Backend Only:**
```bash
./scripts/update-backend.sh
```

**Update Frontend Only:**
```bash
./scripts/update-frontend.sh
```

**Update Both:**
```bash
./deploy.sh  # The main script is idempotent
```

### Setting Up HTTPS

After HTTP deployment works:
```bash
./scripts/setup-https.sh
```

### Viewing Logs

```bash
./scripts/logs.sh
```

Or directly:
```bash
# Backend logs
ssh root@YOUR_VPS_IP "journalctl -u barcode-api -f"

# Nginx logs
ssh root@YOUR_VPS_IP "tail -f /var/log/nginx/barcode-error.log"
```

## 🔐 Security Notes

1. **Never commit your config.sh** to version control after adding your secrets
2. Use a strong SECRET_KEY (32+ characters)
3. Keep your VPS updated: `ssh root@VPS_IP "apt update && apt upgrade"`
4. Setup HTTPS as soon as possible after initial deployment
5. Consider changing SSH port and disabling password auth

## 🚨 Troubleshooting

### Deployment fails at VPS setup
- Verify SSH access: `ssh root@YOUR_VPS_IP`
- Check VPS has internet: `ssh root@YOUR_VPS_IP "ping -c 3 google.com"`

### Backend won't start
```bash
# Check service status
ssh root@YOUR_VPS_IP "systemctl status barcode-api"

# View logs
ssh root@YOUR_VPS_IP "journalctl -u barcode-api -n 50"

# Check if port is in use
ssh root@YOUR_VPS_IP "netstat -tulpn | grep 8034"
```

### Frontend shows blank page
```bash
# Check if files exist
ssh root@YOUR_VPS_IP "ls -la /home/barcode/app/frontend/"

# Check nginx logs
ssh root@YOUR_VPS_IP "tail -f /var/log/nginx/barcode-error.log"
```

### Domain not accessible
- Wait for DNS propagation (test with: `nslookup YOUR_DOMAIN.com`)
- Verify A record points to correct IP in Cloudflare
- Check firewall allows port 80: `ssh root@YOUR_VPS_IP "ufw status"`

### CORS errors
- Verify domain in backend .env: `ssh root@YOUR_VPS_IP "cat /home/barcode/app/backend/.env | grep CORS"`
- Restart backend: `ssh root@YOUR_VPS_IP "systemctl restart barcode-api"`

## 📊 Testing Your Deployment

```bash
# Test backend health
curl http://YOUR_DOMAIN.com/healthz

# Should return: {"status":"healthy"}

# Test frontend
curl -I http://YOUR_DOMAIN.com

# Should return: HTTP/1.1 200 OK
```

## 🔄 Moving This Package

This entire directory is portable! To use it on another machine or for another deployment:

```bash
# Copy to another location
cp -r deploy-package /path/to/new/location/

# Or create a tarball
tar -czf deploy-package.tar.gz deploy-package/

# Extract on another machine
tar -xzf deploy-package.tar.gz
cd deploy-package
nano config.sh  # Update with new VPS details
./deploy.sh
```

## 📁 Directory Structure After Deployment

On your VPS, files will be at:
```
/home/barcode/
├── app/
│   ├── backend/          # FastAPI application
│   │   ├── venv/         # Python virtual environment
│   │   ├── data/         # SQLite database
│   │   ├── uploads/      # User uploads
│   │   ├── downloads/    # Generated files
│   │   └── logs/         # Application logs
│   └── frontend/         # React build files
├── scripts/
│   └── backup-db.sh      # Backup script
└── backups/              # Database backups
```

## 🎓 Understanding the Deployment

### Architecture
- **Frontend**: Static React build served by Nginx
- **Backend**: FastAPI running as systemd service
- **Reverse Proxy**: Nginx forwards `/api` requests to backend
- **Database**: SQLite in `/home/barcode/app/backend/data/`
- **SSL**: Let's Encrypt (optional, after HTTP works)

### Services
- **barcode-api**: Backend service (systemd)
- **nginx**: Web server and reverse proxy
- **cron**: Automated database backups

### Ports
- **80**: HTTP (Nginx)
- **443**: HTTPS (Nginx, after SSL setup)
- **8034**: Backend API (localhost only)

## 🆘 Getting Help

1. Check `docs/TROUBLESHOOTING.md`
2. View logs with `./scripts/logs.sh`
3. Test each component:
   - Backend: `curl http://localhost:8034/healthz` (on VPS)
   - Nginx: `systemctl status nginx` (on VPS)
   - Frontend: Check if files exist in `/home/barcode/app/frontend/`

## ✅ Success Indicators

Your deployment is successful when:
- ✅ `http://YOUR_DOMAIN.com` loads your frontend
- ✅ `http://YOUR_DOMAIN.com/healthz` returns `{"status":"healthy"}`
- ✅ You can login to your application
- ✅ You can generate barcodes
- ✅ `systemctl status barcode-api` shows "active (running)"
- ✅ `systemctl status nginx` shows "active (running)"

## 🔮 Next Steps After Deployment

1. **Test thoroughly** - Try all features
2. **Setup HTTPS** - Run `./scripts/setup-https.sh`
3. **Enable Cloudflare proxy** - Turn on orange cloud in DNS
4. **Setup monitoring** - Consider UptimeRobot or Pingdom
5. **Create super admin** - Log in and assign admin rights
6. **Configure payment API** - Add your payment API keys in settings
7. **Test backups** - Verify backups are being created in `/home/barcode/backups/`

## 📞 Maintenance Commands

```bash
# View all service statuses
ssh root@YOUR_VPS_IP "./scripts/logs.sh"

# Restart backend
ssh root@YOUR_VPS_IP "systemctl restart barcode-api"

# Restart nginx
ssh root@YOUR_VPS_IP "systemctl restart nginx"

# Manual backup
ssh root@YOUR_VPS_IP "/home/barcode/scripts/backup-db.sh"

# Check disk space
ssh root@YOUR_VPS_IP "df -h"

# Check memory usage
ssh root@YOUR_VPS_IP "free -h"

# Update system packages
ssh root@YOUR_VPS_IP "apt update && apt upgrade -y"
```

## 🎉 That's It!

You now have a production-ready deployment of your Barcode Generator application.

**Estimated Total Time:**
- Configuration: 5 minutes
- Deployment: 10-15 minutes
- DNS propagation: 5-30 minutes
- HTTPS setup: 5 minutes

**Total: ~30-60 minutes to fully deployed with HTTPS**

Good luck! 🚀

