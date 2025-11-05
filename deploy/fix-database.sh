#!/bin/bash

# Script to fix database issues on remote server
# Run this on the remote server

echo "=== Database Diagnostic and Fix ==="
echo ""

# Check database location
echo "1. Database location check:"
if [ -f "./backend/data/barcode_generator.db" ]; then
    DB_PATH="./backend/data/barcode_generator.db"
    echo "   ✅ Found: $DB_PATH"
elif [ -f "/opt/barcode-gen-pro/backend/data/barcode_generator.db" ]; then
    DB_PATH="/opt/barcode-gen-pro/backend/data/barcode_generator.db"
    echo "   ✅ Found: $DB_PATH"
else
    echo "   ❌ Database not found in expected locations"
    echo "   Searching..."
    find . -name "barcode_generator.db" -type f 2>/dev/null | head -5
    exit 1
fi

echo ""
echo "2. Checking tables:"
sqlite3 "$DB_PATH" ".tables" 2>/dev/null | tr ' ' '\n' | sort

echo ""
echo "3. Checking if token_settings exists:"
if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='token_settings';" 2>/dev/null | grep -q token_settings; then
    echo "   ✅ token_settings table exists"
    echo ""
    echo "   Current settings:"
    sqlite3 "$DB_PATH" "SELECT setting_key, setting_value FROM token_settings LIMIT 5;"
else
    echo "   ❌ token_settings table MISSING"
    echo ""
    echo "4. Creating missing token_settings table..."
    sqlite3 "$DB_PATH" << 'SQL'
CREATE TABLE IF NOT EXISTS token_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_token_settings_key ON token_settings(setting_key);

-- Insert default settings
INSERT OR IGNORE INTO token_settings (setting_key, setting_value, description) VALUES
('token_price_ugx', '500', 'Price per token in UGX'),
('welcome_bonus_tokens', '0', 'Free tokens given to new users'),
('min_purchase_tokens', '10', 'Minimum tokens that can be purchased'),
('max_purchase_tokens', '1000', 'Maximum tokens that can be purchased'),
('tokens_never_expire', 'true', 'Whether tokens expire or not'),
('payment_api_environment', 'sandbox', 'Payment API environment: sandbox or production'),
('payment_production_auth_token', '', 'Production payment API auth token'),
('payment_webhook_url', '', 'Payment webhook URL for callbacks'),
('collections_api_url', 'https://optimus.santripe.com/transactions/mobile-money-collections/', 'Collections API base URL'),
('collections_api_key', 'pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i', 'Optimus collections monitoring API key');
SQL
    echo "   ✅ token_settings table created"
fi

echo ""
echo "5. Checking users table:"
if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null | grep -q users; then
    USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null)
    echo "   ✅ users table exists with $USER_COUNT users"
    if [ "$USER_COUNT" -eq 0 ]; then
        echo ""
        echo "   ⚠️  No users found - this explains 401 Unauthorized errors"
        echo "   You need to create a user via registration or manually"
    else
        echo ""
        echo "   User list:"
        sqlite3 "$DB_PATH" "SELECT id, email, username, is_active FROM users LIMIT 5;"
    fi
else
    echo "   ❌ users table MISSING - database not properly initialized"
    echo "   Run: docker compose restart backend"
fi

echo ""
echo "6. Database file info:"
ls -lh "$DB_PATH"

echo ""
echo "✅ Diagnostic complete!"



