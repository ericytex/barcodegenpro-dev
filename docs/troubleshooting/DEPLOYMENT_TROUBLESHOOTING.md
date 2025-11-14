# 🔧 Troubleshooting Guide

Common issues and their solutions for Barcode Generator deployment.

## Table of Contents
- [Deployment Issues](#deployment-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [DNS Issues](#dns-issues)
- [SSL/HTTPS Issues](#sslhttps-issues)
- [Database Issues](#database-issues)
- [Performance Issues](#performance-issues)

---

## Deployment Issues

### Error: "config.sh not found"
**Cause**: Running script from wrong directory

**Solution**:
```bash
cd /path/to/deploy-package
./deploy.sh
```

### Error: "Please set VPS_IP in config.sh"
**Cause**: Configuration not updated

**Solution**:
```bash
nano config.sh
# Update VPS_IP, DOMAIN, and SECRET_KEY
```

### Error: "SSH connection refused"
**Cause**: Wrong IP, firewall, or SSH not running

**Solution**:
```bash
# Test SSH manually
ssh root@YOUR_VPS_IP

# If it works, re-run deploy.sh
# If not, check:
# - VPS is running (check Contabo panel)
# - IP address is correct
# - SSH port is 22 (default)
```

### Error: "Permission denied (publickey)"
**Cause**: SSH key authentication required but not set up

**Solution**:
```bash
# Use password authentication or setup SSH keys
ssh-copy-id root@YOUR_VPS_IP

# Or specify password in ssh command
ssh -o PreferredAuthentications=password root@YOUR_VPS_IP
```

---

## Backend Issues

### Backend Service Won't Start

**Check service status**:
```bash
ssh root@YOUR_VPS_IP "systemctl status barcode-api"
```

**Common causes**:

1. **Port already in use**
```bash
ssh root@YOUR_VPS_IP "netstat -tulpn | grep 8034"
# If port is in use, kill the process or change port in config.sh
```

2. **Python dependencies missing**
```bash
ssh root@YOUR_VPS_IP << 'EOF'
cd /home/barcode/app/backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart barcode-api
EOF
```

3. **Database file missing**
```bash
ssh root@YOUR_VPS_IP "ls -la /home/barcode/app/backend/data/"
# If missing, the app should create it on first run
```

4. **Permission issues**
```bash
ssh root@YOUR_VPS_IP "chown -R barcode:barcode /home/barcode/app/backend"
ssh root@YOUR_VPS_IP "systemctl restart barcode-api"
```

### Backend Returns 500 Errors

**View recent logs**:
```bash
ssh root@YOUR_VPS_IP "journalctl -u barcode-api -n 100"
```

**Common issues**:
- Database corruption: Restore from backup
- Missing environment variables: Check `/home/barcode/app/backend/.env`
- Python errors: Check logs for traceback

### CORS Errors

**Symptom**: Frontend can't connect to backend, browser shows CORS error

**Solution**:
```bash
# Check CORS configuration
ssh root@YOUR_VPS_IP "cat /home/barcode/app/backend/.env | grep CORS"

# Should include your domain:
# CORS_ORIGINS=http://YOUR_DOMAIN.com,https://YOUR_DOMAIN.com

# If wrong, edit and restart:
ssh root@YOUR_VPS_IP "nano /home/barcode/app/backend/.env"
ssh root@YOUR_VPS_IP "systemctl restart barcode-api"
```

---

## Frontend Issues

### Frontend Shows Blank Page

**Check browser console** (F12):
- 404 errors: Nginx not finding files
- CORS errors: See CORS section above
- JS errors: Build issue

**Verify files exist**:
```bash
ssh root@YOUR_VPS_IP "ls -la /home/barcode/app/frontend/"
# Should show index.html and assets/
```

**Check Nginx error logs**:
```bash
ssh root@YOUR_VPS_IP "tail -50 /var/log/nginx/barcode-error.log"
```

**Rebuild and redeploy**:
```bash
./scripts/update-frontend.sh
```

### API Calls Fail (Network Error)

**Check browser network tab** (F12 → Network):
- What URL is it calling?
- What's the response?

**Common issues**:

1. **Wrong API URL in frontend**
```bash
# Frontend should use: http://YOUR_DOMAIN.com/api
# Check frontend .env was created correctly
```

2. **Backend not responding**
```bash
# Test backend directly
curl http://YOUR_DOMAIN.com/api/health
curl http://YOUR_DOMAIN.com/healthz
```

### Page Loads But Won't Authenticate

**Causes**:
- Backend database not initialized
- JWT secret key changed
- Session/token expired

**Solutions**:
```bash
# Check backend logs
ssh root@YOUR_VPS_IP "journalctl -u barcode-api -f"

# Try registering a new user
# Or check database directly:
ssh root@YOUR_VPS_IP "sqlite3 /home/barcode/app/backend/data/barcode_generator.db 'SELECT * FROM users;'"
```

---

## DNS Issues

### Domain Doesn't Resolve

**Test DNS**:
```bash
nslookup YOUR_DOMAIN.com
dig YOUR_DOMAIN.com +short
```

**If no IP returned**:
1. Check Cloudflare DNS settings
2. Verify A record exists: `@` → `YOUR_VPS_IP`
3. Wait for propagation (up to 24 hours, usually 5-30 minutes)

**If wrong IP returned**:
1. Update A record in Cloudflare
2. Wait for propagation
3. Clear local DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   
   # Windows
   ipconfig /flushdns
   ```

### Domain Resolves But Can't Connect

**Check VPS firewall**:
```bash
ssh root@YOUR_VPS_IP "ufw status"
# Should allow ports 22, 80, 443
```

**If ports not open**:
```bash
ssh root@YOUR_VPS_IP << 'EOF'
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
EOF
```

**Test connection**:
```bash
# Test HTTP port
telnet YOUR_DOMAIN.com 80

# Test HTTPS port
telnet YOUR_DOMAIN.com 443
```

---

## SSL/HTTPS Issues

### Certbot Fails to Obtain Certificate

**Common causes**:

1. **Domain not pointing to VPS yet**
```bash
# Verify DNS first
nslookup YOUR_DOMAIN.com
# Must return your VPS IP
```

2. **Port 80 blocked**
```bash
ssh root@YOUR_VPS_IP "ufw allow 80/tcp"
```

3. **Nginx not configured correctly**
```bash
ssh root@YOUR_VPS_IP "nginx -t"
# Should say "syntax is ok"
```

**Manual SSL setup**:
```bash
ssh root@YOUR_VPS_IP
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```

### Certificate Expired

**Certbot should auto-renew, but if it fails**:
```bash
ssh root@YOUR_VPS_IP "certbot renew"
```

**Setup auto-renewal** (should already be configured):
```bash
ssh root@YOUR_VPS_IP "certbot renew --dry-run"
```

### Mixed Content Warnings

**Cause**: Site is HTTPS but loading HTTP resources

**Solution**:
- Update frontend .env to use `https://` for API
- Rebuild frontend: `./scripts/update-frontend.sh`

---

## Database Issues

### Database Locked Error

**Cause**: Multiple processes accessing database simultaneously

**Solution**:
```bash
# Restart backend service
ssh root@YOUR_VPS_IP "systemctl restart barcode-api"
```

### Database Corrupted

**Restore from backup**:
```bash
ssh root@YOUR_VPS_IP << 'EOF'
cd /home/barcode/app/backend/data
# Backup current (corrupted) database
mv barcode_generator.db barcode_generator.db.corrupted

# Find latest backup
ls -lh /home/barcode/backups/

# Extract and restore (adjust filename)
gunzip -c /home/barcode/backups/barcode_db_YYYYMMDD_HHMMSS.db.gz > barcode_generator.db

# Set ownership
chown barcode:barcode barcode_generator.db

# Restart service
systemctl restart barcode-api
EOF
```

### No Backups Being Created

**Check cron job**:
```bash
ssh root@YOUR_VPS_IP "crontab -u barcode -l"
# Should show backup job
```

**Test backup script manually**:
```bash
ssh root@YOUR_VPS_IP "bash /home/barcode/scripts/backup-db.sh"
```

**Check backup log**:
```bash
ssh root@YOUR_VPS_IP "cat /home/barcode/backups/backup.log"
```

---

## Performance Issues

### Site is Slow

**Check server resources**:
```bash
ssh root@YOUR_VPS_IP << 'EOF'
# CPU usage
top -bn1 | head -20

# Memory usage
free -h

# Disk usage
df -h

# Disk I/O
iostat
EOF
```

**Common solutions**:

1. **Increase workers** (if CPU is underutilized):
```bash
nano config.sh
# Increase API_WORKERS=4
./scripts/update-backend.sh
```

2. **Add more RAM** (if memory is maxed):
- Upgrade VPS plan in Contabo

3. **Optimize database**:
```bash
ssh root@YOUR_VPS_IP << 'EOF'
cd /home/barcode/app/backend/data
sqlite3 barcode_generator.db "VACUUM;"
sqlite3 barcode_generator.db "ANALYZE;"
EOF
```

### High CPU Usage

**Check what's using CPU**:
```bash
ssh root@YOUR_VPS_IP "top -bn1"
```

**If backend (Python) is high**:
- Check for infinite loops in logs
- Consider adding caching
- Optimize database queries

### Disk Space Full

**Check usage**:
```bash
ssh root@YOUR_VPS_IP "df -h"
ssh root@YOUR_VPS_IP "du -sh /home/barcode/*"
```

**Clean up**:
```bash
ssh root@YOUR_VPS_IP << 'EOF'
# Clean old logs
find /home/barcode/app/backend/logs -name "*.log" -mtime +30 -delete

# Clean old backups (keep last 7 days)
find /home/barcode/backups -name "*.gz" -mtime +7 -delete

# Clean old uploads (if applicable)
# find /home/barcode/app/backend/uploads -mtime +90 -delete

# Clean apt cache
apt clean
EOF
```

---

## Emergency Procedures

### Complete Service Restart

```bash
ssh root@YOUR_VPS_IP << 'EOF'
systemctl restart barcode-api
systemctl restart nginx
systemctl status barcode-api --no-pager
systemctl status nginx --no-pager
EOF
```

### Rollback to Previous Version

**Backend**:
```bash
# Restore from backup (if you have one)
# Or redeploy known-good version
git checkout <previous-commit>
./scripts/update-backend.sh
```

**Frontend**:
```bash
git checkout <previous-commit>
./scripts/update-frontend.sh
```

### Complete Redeployment

```bash
# This will redeploy everything except database
./deploy.sh
```

---

## Getting More Help

### Enable Debug Logging

**Backend**:
```bash
ssh root@YOUR_VPS_IP << 'EOF'
nano /home/barcode/app/backend/.env
# Change: LOG_LEVEL=DEBUG
systemctl restart barcode-api
EOF
```

### Collect System Information

```bash
ssh root@YOUR_VPS_IP << 'EOF'
echo "=== System Info ==="
uname -a
lsb_release -a

echo "=== Services ==="
systemctl status barcode-api --no-pager
systemctl status nginx --no-pager

echo "=== Resources ==="
free -h
df -h

echo "=== Network ==="
netstat -tulpn | grep -E ':(80|443|8034)'

echo "=== Recent Backend Logs ==="
journalctl -u barcode-api -n 20 --no-pager

echo "=== Recent Nginx Errors ==="
tail -20 /var/log/nginx/barcode-error.log
EOF
```

---

## Prevention

### Regular Maintenance

**Weekly**:
- Check logs for errors: `./scripts/logs.sh`
- Verify backups are running: `ssh root@VPS_IP "ls -lh /home/barcode/backups/"`
- Check disk space: `ssh root@VPS_IP "df -h"`

**Monthly**:
- Update system packages: `ssh root@VPS_IP "apt update && apt upgrade"`
- Review and clean old backups
- Test restore procedure

**After Every Deployment**:
- Check logs for errors
- Test key functionality (login, generate barcode)
- Monitor for 30 minutes

---

If none of these solutions work, collect the system information above and seek additional help.


