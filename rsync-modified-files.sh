#!/bin/bash

# Rsync script to sync only the modified files from this session
# Usage: ./rsync-modified-files.sh

REMOTE="deployer@194.163.134.129:~/barcodegenpro-dev"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Syncing modified files to: $REMOTE"
echo "From: $LOCAL_DIR"
echo ""

# List of files modified in this session
FILES=(
  "backend/app.py"
  "backend/services/barcode_service.py"
  "frontend/src/components/ApiBarcodeGenerator.tsx"
  "frontend/src/components/ApiFileUpload.tsx"
  "frontend/src/hooks/useBarcodeApi.ts"
  "frontend/src/pages/Index.tsx"
  "frontend/src/pages/TestPage.tsx"
  "frontend/src/pages/UploadPage.tsx"
)

# Build rsync command with file list
rsync -avz --progress \
  --no-owner \
  --no-group \
  --files-from=<(printf '%s\n' "${FILES[@]}") \
  "$LOCAL_DIR/" "$REMOTE/"

echo ""
echo "✅ Sync complete!"
echo ""
echo "Files synced:"
for file in "${FILES[@]}"; do
  echo "  - $file"
done
echo ""
echo "On remote server, you may need to:"
echo "  cd ~/barcodegenpro-dev"
echo "  docker compose restart backend frontend"
echo "  # OR rebuild if needed:"
echo "  docker compose build backend frontend"
echo "  docker compose up -d"


