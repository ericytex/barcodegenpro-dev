#!/bin/bash

# Quick fix for database permissions and verification
# Run on remote server

cd ~/barcodegenpro-dev/backend/data

echo "=== Database Check & Fix ==="
echo ""

# 1. Check current ownership
echo "1. Current file ownership:"
ls -lh barcode_generator.db

# 2. Check user count in database
echo ""
echo "2. Checking users in database:"
USER_COUNT=$(sqlite3 barcode_generator.db "SELECT COUNT(*) FROM users;" 2>/dev/null)
echo "   User count: $USER_COUNT"

if [ "$USER_COUNT" -eq 0 ]; then
    echo ""
    echo "   ⚠️  NO USERS in database!"
    echo "   This database is empty. You need to copy your local database."
else
    echo "   ✅ Database has $USER_COUNT users"
fi

# 3. Fix permissions
echo ""
echo "3. Fixing file ownership:"
sudo chown deployer:deployer barcode_generator.db* 2>/dev/null
chmod 644 barcode_generator.db 2>/dev/null

echo ""
echo "4. New ownership:"
ls -lh barcode_generator.db

echo ""
echo "✅ Done!"
echo ""
echo "If user count is 0, copy your local database:"
echo "  scp ~/Documents/Research/BARCODE-GENERATOR/Barcode-Gen-Pro-Dev/backend/data/barcode_generator.db deployer@194.163.134.129:~/barcodegenpro-dev/backend/data/"



