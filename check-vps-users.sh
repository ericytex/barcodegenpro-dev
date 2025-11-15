#!/bin/bash
# Script to check users in VPS database
# Usage: ./check-vps-users.sh

VPS_IP="194.163.134.129"
VPS_USER="deployer"
REMOTE_PATH="/home/deployer/barcodegenpro-dev"

echo "🔍 Checking users in VPS database..."
echo ""

# Check users in the database via Docker container
echo "📊 User count:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\""

echo ""
echo "👥 User list:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT id, username, email, is_active, is_admin, created_at FROM users;\""

echo ""
echo "🔐 Checking password hashes (first 3 users):"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT id, username, email, CASE WHEN password_hash IS NULL THEN 'NULL' WHEN password_hash = '' THEN 'EMPTY' ELSE 'HAS_HASH' END as hash_status FROM users LIMIT 3;\""

echo ""
echo "📋 Checking if user_sessions table exists:"
ssh ${VPS_USER}@${VPS_IP} "docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions';\""

echo ""
echo "✅ Check complete!"

