#!/usr/bin/env python3
"""
Fix script to create missing token_settings table
Run this on the VPS to add the missing table
"""

import sqlite3
import os
import sys

# Get database path from environment or use default
db_path = os.getenv('DATABASE_PATH', '/app/data/barcode_generator.db')

# If running locally, use local path
if not os.path.exists(db_path):
    db_path = os.path.join(os.path.dirname(__file__), 'data', 'barcode_generator.db')

if not os.path.exists(db_path):
    print(f"❌ Database not found at: {db_path}")
    sys.exit(1)

print(f"📦 Fixing database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='token_settings'
    """)
    
    if cursor.fetchone():
        print("✅ token_settings table already exists")
    else:
        print("🔧 Creating token_settings table...")
        
        # Create the table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS token_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                description TEXT,
                updated_by INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (updated_by) REFERENCES users(id)
            )
        """)
        
        # Create index
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_token_settings_key 
            ON token_settings(setting_key)
        """)
        
        # Insert default settings
        default_settings = [
            ('token_price_ugx', '500', 'Price per token in UGX'),
            ('welcome_bonus_tokens', '0', 'Free tokens given to new users'),
            ('min_purchase_tokens', '10', 'Minimum tokens that can be purchased'),
            ('max_purchase_tokens', '1000', 'Maximum tokens that can be purchased'),
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO token_settings 
            (setting_key, setting_value, description) 
            VALUES (?, ?, ?)
        """, default_settings)
        
        conn.commit()
        print("✅ token_settings table created successfully!")
        print("✅ Default settings inserted")
        
        # Show what was created
        cursor.execute("SELECT setting_key, setting_value FROM token_settings")
        rows = cursor.fetchall()
        print(f"\n📋 Current settings ({len(rows)}):")
        for key, value in rows:
            print(f"   {key} = {value}")
    
    conn.close()
    print("\n✅ Database fix complete!")
    
except Exception as e:
    print(f"❌ Error fixing database: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

