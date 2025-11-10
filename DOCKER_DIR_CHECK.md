# Docker Directory Check Commands

## Quick Commands to Run on VPS

SSH into your VPS first:
```bash
ssh deployer@194.163.134.129
```

Then run these commands:

### 1. Check Environment Variables
```bash
docker exec barcode-v2-backend env | grep -E "UPLOAD_DIR|DOWNLOAD_DIR|LOGS_DIR|PWD"
```

### 2. Check Root Directory
```bash
docker exec barcode-v2-backend ls -la /app/
```

### 3. Check Uploads Directory
```bash
docker exec barcode-v2-backend ls -la /app/uploads/
```

### 4. Check Downloads Directory
```bash
docker exec barcode-v2-backend ls -la /app/downloads/
```

### 5. Check Downloads/Barcodes
```bash
docker exec barcode-v2-backend ls -la /app/downloads/barcodes/
```

### 6. Check Downloads/PDFs
```bash
docker exec barcode-v2-backend ls -la /app/downloads/pdfs/
```

### 7. Check Logs Directory
```bash
docker exec barcode-v2-backend ls -la /app/logs/
```

### 8. Check Current Working Directory
```bash
docker exec barcode-v2-backend pwd
```

### 9. Check Directory Permissions
```bash
docker exec barcode-v2-backend bash -c "
echo 'Uploads:'
ls -ld /app/uploads
echo 'Downloads:'
ls -ld /app/downloads
echo 'Downloads/barcodes:'
ls -ld /app/downloads/barcodes
echo 'Downloads/pdfs:'
ls -ld /app/downloads/pdfs
echo 'Logs:'
ls -ld /app/logs
"
```

### 10. Test Write Permissions
```bash
docker exec barcode-v2-backend bash -c "
test -w /app/uploads && echo '✅ /app/uploads is writable' || echo '❌ /app/uploads is NOT writable'
test -w /app/downloads && echo '✅ /app/downloads is writable' || echo '❌ /app/downloads is NOT writable'
test -w /app/downloads/barcodes && echo '✅ /app/downloads/barcodes is writable' || echo '❌ /app/downloads/barcodes is NOT writable'
test -w /app/downloads/pdfs && echo '✅ /app/downloads/pdfs is writable' || echo '❌ /app/downloads/pdfs is NOT writable'
test -w /app/logs && echo '✅ /app/logs is writable' || echo '❌ /app/logs is NOT writable'
"
```

## Or Run the Script

From your local machine:
```bash
./check-docker-directories.sh
```

This will SSH into the VPS and run all checks automatically.

