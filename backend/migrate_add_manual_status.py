#!/usr/bin/env python3
"""
Migration script to add manual_status column to withdraws table
"""
import sqlite3
import os
import sys

def migrate_database(db_path="data/barcode_generator.db"):
    """Add manual_status column to withdraws table if it doesn't exist"""
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            # Check if column exists
            cursor.execute("PRAGMA table_info(withdraws)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'manual_status' in columns:
                print("Column 'manual_status' already exists in withdraws table")
                return True
            
            # Add the column
            cursor.execute("ALTER TABLE withdraws ADD COLUMN manual_status TEXT DEFAULT NULL")
            conn.commit()
            print("✅ Successfully added 'manual_status' column to withdraws table")
            return True
            
    except Exception as e:
        print(f"❌ Error migrating database: {e}")
        return False

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "data/barcode_generator.db"
    success = migrate_database(db_path)
    sys.exit(0 if success else 1)

