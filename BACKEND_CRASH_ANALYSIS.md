# Backend Crash Analysis - 502 Bad Gateway

## Error from Frontend Container Logs

```
2025/11/07 19:00:19 [error] 28#28: *9 upstream prematurely closed connection 
while reading response header from upstream, client: 102.86.10.23, server: localhost, 
request: "POST /api/barcodes/upload-excel HTTP/1.1", 
upstream: "http://10.0.7.2:8034/api/barcodes/upload-excel"
```

## What This Means

1. ✅ **Nginx received the request** - Frontend container got the POST request
2. ✅ **Nginx forwarded to backend** - Proxied to `http://10.0.7.2:8034/api/barcodes/upload-excel`
3. ❌ **Backend crashed/closed connection** - Backend started processing but closed connection before sending response
4. ❌ **Nginx returned 502** - No valid response from backend

## Root Cause

The backend is **crashing during Excel upload processing**. This happens when:
- An unhandled exception occurs
- The backend process dies
- The connection is closed before a response is sent

## Next Steps - Check Backend Logs

We need to see the actual error from the backend container:

```bash
# SSH into VPS
ssh deployer@194.163.134.129

# Check backend container logs
docker logs barcode-v2-backend --tail=100

# Or follow logs in real-time
docker logs -f barcode-v2-backend
```

Look for:
- Python tracebacks
- Permission errors
- Directory not found errors
- Import errors
- Database connection errors

## Most Likely Causes (Based on Recent Changes)

1. **Environment Variables Missing** - `UPLOAD_DIR`, `DOWNLOAD_DIR`, `LOGS_DIR` not set in Docker
2. **Directory Permissions** - Backend can't write to directories
3. **Path Issues** - Code expects `/app/...` but directories don't exist
4. **Unhandled Exception** - Error in PDF creation or file operations

## Quick Diagnosis Commands

```bash
# Check if backend container is running
docker ps | grep backend

# Check backend logs for errors
docker logs barcode-v2-backend 2>&1 | grep -i "error\|exception\|traceback" | tail -50

# Check environment variables
docker exec barcode-v2-backend env | grep -E "UPLOAD_DIR|DOWNLOAD_DIR|LOGS_DIR"

# Check directory permissions
docker exec barcode-v2-backend ls -la /app/
docker exec barcode-v2-backend ls -la /app/downloads/
docker exec barcode-v2-backend ls -la /app/uploads/
```

