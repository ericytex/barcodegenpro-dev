#!/bin/bash
# Quick one-liner to check database on remote
# Run this ON THE REMOTE SERVER

echo "=== Quick Database Check ==="
echo ""
echo "1. Host database location:"
ls -lh ~/barcodegenpro-dev/backend/data/barcode_generator.db 2>/dev/null && echo "✅ Found" || echo "❌ NOT FOUND"

echo ""
echo "2. Container database:"
docker exec barcode-v2-backend ls -lh /app/data/barcode_generator.db 2>/dev/null && echo "✅ Found in container" || echo "❌ NOT FOUND in container"

echo ""
echo "3. Users count:"
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "❌ Cannot query"

echo ""
echo "4. Token settings count:"
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT COUNT(*) FROM token_settings;" 2>/dev/null || echo "❌ Cannot query"

echo ""
echo "5. Database size:"
docker exec barcode-v2-backend du -h /app/data/barcode_generator.db 2>/dev/null || echo "❌ Cannot check size"

echo ""
echo "6. List users:"
docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db "SELECT id, email, username FROM users LIMIT 5;" 2>/dev/null || echo "❌ Cannot query users"

echo ""
echo "✅ Check complete!"



