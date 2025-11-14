"""
SQLite Database Models for Barcode Generator
"""

import sqlite3
import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from models.feature_models import Feature
from models.database_connection import initialize_connection_pool, get_connection_context

logger = logging.getLogger(__name__)


@dataclass
class BarcodeRecord:
    id: Optional[int] = None
    filename: str = ""
    file_path: str = ""
    archive_path: str = ""
    file_type: str = ""  # 'png' or 'pdf'
    file_size: int = 0
    created_at: str = ""
    archived_at: str = ""
    generation_session: str = ""
    imei: Optional[str] = None
    box_id: Optional[str] = None
    model: Optional[str] = None
    product: Optional[str] = None
    color: Optional[str] = None
    dn: Optional[str] = None


@dataclass
class DeviceRecord:
    id: Optional[int] = None
    name: str = ""
    brand: str = ""
    model_code: str = ""
    device_type: str = ""
    default_dn: str = "M8N7"
    description: Optional[str] = None
    specifications: Optional[str] = None  # JSON string
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    is_active: bool = True

@dataclass
class DeviceBrandRecord:
    id: Optional[int] = None
    name: str = ""
    icon: str = "📱"
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@dataclass
class DeviceModelRecord:
    id: Optional[int] = None
    brand_id: int = 0
    device_type: str = "phone"  # phone, laptop, earphones, etc.
    model_name: str = ""
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PhoneBrandRecord:
    id: Optional[int] = None
    name: str = ""
    is_active: bool = True
    created_at: str = ""
    updated_at: str = ""


@dataclass
class PhoneModelRecord:
    id: Optional[int] = None
    brand_id: int = 0
    model_name: str = ""
    device_type: str = ""
    is_active: bool = True
    created_at: str = ""
    updated_at: str = ""


class DatabaseManager:
    def __init__(self, db_path: str = None):
        # Use environment variable or default path
        self.db_path = db_path or os.getenv("DATABASE_PATH", "data/barcode_generator.db")
        self.backup_enabled = os.getenv("DATABASE_BACKUP_ENABLED", "true").lower() == "true"
        self.backup_dir = os.getenv("DATABASE_BACKUP_DIR", "data/backups")
        self.backup_retention_days = int(os.getenv("DATABASE_BACKUP_RETENTION_DAYS", "30"))
        self.ensure_database_directory()
        self.init_database()
        
        # Initialize connection pool
        max_connections = int(os.getenv("DATABASE_MAX_CONNECTIONS", "10"))
        timeout = int(os.getenv("DATABASE_TIMEOUT", "30"))
        initialize_connection_pool(self.db_path, max_connections, timeout)
    
    def ensure_database_directory(self):
        """Ensure the database directory exists"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
    
    def init_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create barcode_files table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS barcode_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    archive_path TEXT NOT NULL,
                    file_type TEXT NOT NULL CHECK (file_type IN ('png', 'pdf')),
                    file_size INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    archived_at TEXT NOT NULL,
                    generation_session TEXT NOT NULL,
                    imei TEXT,
                    box_id TEXT,
                    model TEXT,
                    product TEXT,
                    color TEXT,
                    dn TEXT,
                    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create generation_sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS generation_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL,
                    total_files INTEGER NOT NULL,
                    png_count INTEGER NOT NULL,
                    pdf_count INTEGER NOT NULL,
                    total_size INTEGER NOT NULL,
                    excel_filename TEXT,
                    notes TEXT,
                    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create devices table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    brand TEXT NOT NULL,
                    model_code TEXT NOT NULL,
                    device_type TEXT NOT NULL,
                    default_dn TEXT NOT NULL DEFAULT 'M8N7',
                    description TEXT,
                    specifications TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    UNIQUE(brand, model_code)
                )
            """)
            
            # Create device_brands table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_brands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    icon TEXT DEFAULT '📱',
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create device_models table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    brand_id INTEGER NOT NULL,
                    device_type TEXT DEFAULT 'phone',
                    model_name TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (brand_id) REFERENCES device_brands (id),
                    UNIQUE(brand_id, device_type, model_name)
                )
            """)
                
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_filename ON barcode_files(filename)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_file_type ON barcode_files(file_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_generation_session ON barcode_files(generation_session)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON barcode_files(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_session_id ON generation_sessions(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_brand ON devices(brand)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_type ON devices(device_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_active ON devices(is_active)")
            
            # Create indexes for device_brands table
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_brands_name ON device_brands(name)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_brands_is_active ON device_brands(is_active)")
            
            # Create indexes for device_models table
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_models_brand_id ON device_models(brand_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_models_device_type ON device_models(device_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_device_models_is_active ON device_models(is_active)")
            
            # Create banners table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS banners (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    type TEXT NOT NULL DEFAULT 'info',
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    created_by INTEGER,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            # Create indexes for banners table
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_banners_expires_at ON banners(expires_at)")
            
            # Create payment-related tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS subscription_plans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price_ugx INTEGER NOT NULL,
                    duration_months INTEGER DEFAULT 1,
                    features TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL DEFAULT 1,
                    plan_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    start_date DATETIME,
                    end_date DATETIME,
                    auto_renew BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payment_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL DEFAULT 1,
                    subscription_id INTEGER,
                    transaction_uid TEXT UNIQUE NOT NULL,
                    optimus_transaction_id TEXT,
                    amount_ugx INTEGER NOT NULL,
                    currency TEXT DEFAULT 'UGX',
                    payment_method TEXT DEFAULT 'mobile_money',
                    status TEXT DEFAULT 'pending',
                    payment_url TEXT,
                    callback_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS payment_webhooks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_uid TEXT NOT NULL,
                    webhook_data TEXT NOT NULL,
                    processed BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for payment tables
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_uid ON payment_transactions(transaction_uid)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_payment_webhooks_transaction_uid ON payment_webhooks(transaction_uid)")
            
            # Insert default subscription plan if not exists
            cursor.execute("SELECT COUNT(*) FROM subscription_plans")
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO subscription_plans (name, description, price_ugx, duration_months, features, is_active)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    'BarcodeGen Pro Monthly',
                    'Unlimited barcode generation, premium templates, priority support',
                    50000,
                    1,
                    '["unlimited_barcodes", "premium_templates", "priority_support", "bulk_export", "custom_branding", "api_access"]',
                    True
                ))
            
            # Create authentication tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    is_admin BOOLEAN DEFAULT 0,
                    is_super_admin BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    refresh_token TEXT,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    user_agent TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_quotas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    monthly_barcode_limit INTEGER DEFAULT 1000,
                    barcodes_generated_this_month INTEGER DEFAULT 0,
                    month_start_date DATETIME,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Create indexes for auth tables
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id)")
            
            # Create token system tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    balance INTEGER NOT NULL DEFAULT 0,
                    total_purchased INTEGER NOT NULL DEFAULT 0,
                    total_used INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS token_purchases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    transaction_uid TEXT UNIQUE NOT NULL,
                    amount_ugx INTEGER NOT NULL,
                    tokens_purchased INTEGER NOT NULL,
                    payment_method TEXT DEFAULT 'mobile_money',
                    provider TEXT,
                    phone TEXT,
                    status TEXT DEFAULT 'pending',
                    payment_url TEXT,
                    local_country TEXT,
                    local_currency TEXT,
                    local_amount INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS token_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    tokens_used INTEGER NOT NULL,
                    operation TEXT NOT NULL,
                    details TEXT,
                    barcodes_generated INTEGER,
                    session_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
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
            
            # Create indexes for token tables
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_purchases_user_id ON token_purchases(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_purchases_transaction_uid ON token_purchases(transaction_uid)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_purchases_status ON token_purchases(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_settings_key ON token_settings(setting_key)")

            # Create collections table for Optimus Collections API data
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS collections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    collection_id TEXT UNIQUE NOT NULL,
                    transaction_uid TEXT,
                    amount INTEGER,
                    currency TEXT,
                    status TEXT,
                    provider TEXT,
                    phone TEXT,
                    created_at TEXT,
                    completed_at TEXT,
                    description TEXT,
                    reference TEXT,
                    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_transaction_uid ON collections(transaction_uid)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_synced_at ON collections(synced_at)")

            # Create withdraws table for tracking money withdrawals
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS withdraws (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_uid TEXT UNIQUE NOT NULL,
                    app_transaction_uid TEXT UNIQUE NOT NULL,
                    amount INTEGER NOT NULL,
                    currency TEXT DEFAULT 'UGX',
                    local_country TEXT NOT NULL,
                    local_telecom TEXT NOT NULL,
                    local_phone TEXT NOT NULL,
                    local_amount INTEGER NOT NULL,
                    exchange_quote_reference TEXT,
                    status TEXT DEFAULT 'pending',
                    manual_status TEXT DEFAULT NULL,
                    optimus_response TEXT,
                    error_message TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """)
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_withdraws_transaction_uid ON withdraws(transaction_uid)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_withdraws_app_transaction_uid ON withdraws(app_transaction_uid)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_withdraws_status ON withdraws(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_withdraws_created_at ON withdraws(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_withdraws_created_by ON withdraws(created_by)")
            
            # Add manual_status column if it doesn't exist (migration for existing databases)
            try:
                # Check if column exists by querying table info
                cursor.execute("PRAGMA table_info(withdraws)")
                columns = [column[1] for column in cursor.fetchall()]
                
                if 'manual_status' not in columns:
                    cursor.execute("ALTER TABLE withdraws ADD COLUMN manual_status TEXT DEFAULT NULL")
                    conn.commit()
                    logger.info("Added manual_status column to withdraws table")
            except Exception as e:
                logger.warning(f"Could not add manual_status column (may already exist): {e}")

            # Create features table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS features (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    upvotes INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'Suggestion',
                    submitted_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (submitted_by) REFERENCES users(id)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_features_status ON features(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_features_upvotes ON features(upvotes)")

            # Create bugs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bugs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT DEFAULT 'Reported',
                    priority TEXT DEFAULT 'Medium',
                    submitted_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (submitted_by) REFERENCES users(id)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_bugs_priority ON bugs(priority)")
            
            # Insert default token settings if not exists
            default_settings = [
                ('token_price_ugx', '500', 'Price per token in UGX'),
                ('welcome_bonus_tokens', '0', 'Free tokens given to new users'),
                ('min_purchase_tokens', '10', 'Minimum tokens that can be purchased'),
                ('max_purchase_tokens', '1000', 'Maximum tokens that can be purchased'),
                ('tokens_never_expire', 'true', 'Whether tokens expire or not'),
                ('discount_tier_1_min', '50', 'Minimum tokens for tier 1 discount'),
                ('discount_tier_1_percent', '10', 'Discount percentage for tier 1'),
                ('discount_tier_2_min', '100', 'Minimum tokens for tier 2 discount'),
                ('discount_tier_2_percent', '20', 'Discount percentage for tier 2'),
                ('discount_tier_3_min', '500', 'Minimum tokens for tier 3 discount'),
                ('discount_tier_3_percent', '30', 'Discount percentage for tier 3'),
                ('payment_api_environment', 'sandbox', 'Payment API environment: sandbox or production'),
                ('payment_production_auth_token', '', 'Production payment API auth token'),
                ('payment_webhook_url', '', 'Payment webhook URL for callbacks'),
                ('collections_api_url', 'https://optimus.santripe.com/transactions/mobile-money-collections/', 'Collections API base URL'),
                ('collections_api_key', 'pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i', 'Optimus collections monitoring API key'),
                ('transfers_api_key', '', 'Optimus transfers API key (for withdrawals). If empty, uses collections_api_key')
            ]
            
            for key, value, description in default_settings:
                cursor.execute("""
                    INSERT OR IGNORE INTO token_settings (setting_key, setting_value, description)
                    VALUES (?, ?, ?)
                """, (key, value, description))

            conn.commit()
    
    def insert_barcode_record(self, record: BarcodeRecord) -> int:
        """Insert a new barcode record and return the ID"""
        print(f"🔍 DatabaseManager.insert_barcode_record called for {record.filename}")
        
        # Skip connection pool entirely and use direct connection for now
        print(f"🔍 Using direct connection (bypassing pool) for {record.filename}...")
        try:
            with sqlite3.connect(self.db_path, timeout=5) as conn:
                print(f"🔍 Got direct connection for {record.filename}")
                cursor = conn.cursor()
                print(f"🔍 Executing INSERT for {record.filename}...")
                cursor.execute("""
                    INSERT INTO barcode_files (
                        filename, file_path, archive_path, file_type, file_size,
                        created_at, archived_at, generation_session, imei, box_id,
                        model, product, color, dn
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.filename, record.file_path, record.archive_path,
                    record.file_type, record.file_size, record.created_at,
                    record.archived_at, record.generation_session, record.imei,
                    record.box_id, record.model, record.product, record.color, record.dn
                ))
                print(f"🔍 Committing transaction for {record.filename}...")
                conn.commit()
                record_id = cursor.lastrowid
                print(f"🔍 Successfully inserted {record.filename} with ID {record_id}")
                return record_id
        except Exception as e:
            print(f"❌ Direct connection failed for {record.filename}: {e}")
            print(f"❌ Error type: {type(e).__name__}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            raise e
    
    def insert_generation_session(self, session_id: str, created_at: str, 
                                total_files: int, png_count: int, pdf_count: int,
                                total_size: int, excel_filename: str = None, 
                                notes: str = None) -> int:
        """Insert a new generation session record"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO generation_sessions (
                    session_id, created_at, total_files, png_count, pdf_count,
                    total_size, excel_filename, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (session_id, created_at, total_files, png_count, pdf_count, 
                  total_size, excel_filename, notes))
            conn.commit()
            return cursor.lastrowid
    
    def get_all_files(self) -> List[Dict[str, Any]]:
        """Get all barcode files with their metadata"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM barcode_files 
                ORDER BY created_timestamp DESC
            """)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_files_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all files from a specific generation session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM barcode_files 
                WHERE generation_session = ?
                ORDER BY created_timestamp DESC
            """, (session_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_recent_sessions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent generation sessions"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM generation_sessions 
                ORDER BY created_timestamp DESC 
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_file_by_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        """Get a specific file by filename"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM barcode_files 
                WHERE filename = ?
            """, (filename,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get database statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Total files
            cursor.execute("SELECT COUNT(*) FROM barcode_files")
            total_files = cursor.fetchone()[0]
            
            # PNG files
            cursor.execute("SELECT COUNT(*) FROM barcode_files WHERE file_type = 'png'")
            png_count = cursor.fetchone()[0]
            
            # PDF files
            cursor.execute("SELECT COUNT(*) FROM barcode_files WHERE file_type = 'pdf'")
            pdf_count = cursor.fetchone()[0]
            
            # Total size
            cursor.execute("SELECT SUM(file_size) FROM barcode_files")
            total_size = cursor.fetchone()[0] or 0
            
            # Total sessions
            cursor.execute("SELECT COUNT(*) FROM generation_sessions")
            total_sessions = cursor.fetchone()[0]
            
            return {
                "total_files": total_files,
                "png_count": png_count,
                "pdf_count": pdf_count,
                "total_size": total_size,
                "total_sessions": total_sessions
            }
    
    # Device Management Methods
    def insert_device(self, device: DeviceRecord) -> int:
        """Insert a new device record and return the ID"""
        import json
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO devices (
                    name, brand, model_code, device_type, default_dn,
                    description, specifications, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                device.name, device.brand, device.model_code, device.device_type,
                device.default_dn, device.description, 
                json.dumps(device.specifications) if device.specifications else None,
                device.is_active
            ))
            conn.commit()
            return cursor.lastrowid
    
    def get_all_devices(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all devices with their metadata"""
        import json
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = "SELECT * FROM devices"
            params = []
            if active_only:
                query += " WHERE is_active = 1"
            
            query += " ORDER BY brand, name"
            cursor.execute(query, params)
            
            devices = []
            for row in cursor.fetchall():
                device_dict = dict(row)
                # Parse specifications JSON
                if device_dict.get('specifications'):
                    try:
                        device_dict['specifications'] = json.loads(device_dict['specifications'])
                    except json.JSONDecodeError:
                        device_dict['specifications'] = None
                devices.append(device_dict)
            
            return devices
    
    def get_device_by_id(self, device_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific device by ID"""
        import json
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
            row = cursor.fetchone()
            if row:
                device_dict = dict(row)
                # Parse specifications JSON
                if device_dict.get('specifications'):
                    try:
                        device_dict['specifications'] = json.loads(device_dict['specifications'])
                    except json.JSONDecodeError:
                        device_dict['specifications'] = None
                return device_dict
            return None
    
    def get_devices_by_type(self, device_type: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get devices by type"""
        import json
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = "SELECT * FROM devices WHERE device_type = ?"
            params = [device_type]
            if active_only:
                query += " AND is_active = 1"
            
            query += " ORDER BY brand, name"
            cursor.execute(query, params)
            
            devices = []
            for row in cursor.fetchall():
                device_dict = dict(row)
                # Parse specifications JSON
                if device_dict.get('specifications'):
                    try:
                        device_dict['specifications'] = json.loads(device_dict['specifications'])
                    except json.JSONDecodeError:
                        device_dict['specifications'] = None
                devices.append(device_dict)
            
            return devices
    
    def update_device(self, device_id: int, device: DeviceRecord) -> bool:
        """Update a device record"""
        import json
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE devices SET 
                    name = ?, brand = ?, model_code = ?, device_type = ?,
                    default_dn = ?, description = ?, specifications = ?,
                    is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                device.name, device.brand, device.model_code, device.device_type,
                device.default_dn, device.description,
                json.dumps(device.specifications) if device.specifications else None,
                device.is_active, device_id
            ))
            conn.commit()
            return cursor.rowcount > 0
    
    def delete_device(self, device_id: int) -> bool:
        """Soft delete a device (set is_active to False)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE devices SET 
                    is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (device_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    def hard_delete_device(self, device_id: int) -> bool:
        """Permanently delete a device"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM devices WHERE id = ?", (device_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    def get_device_statistics(self) -> Dict[str, Any]:
        """Get device statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Total devices
            cursor.execute("SELECT COUNT(*) FROM devices")
            total_devices = cursor.fetchone()[0]
            
            # Active devices
            cursor.execute("SELECT COUNT(*) FROM devices WHERE is_active = 1")
            active_devices = cursor.fetchone()[0]
            
            # Devices by type
            cursor.execute("""
                SELECT device_type, COUNT(*) as count 
                FROM devices 
                WHERE is_active = 1 
                GROUP BY device_type 
                ORDER BY count DESC
            """)
            devices_by_type = dict(cursor.fetchall())
            
            # Brands
            cursor.execute("""
                SELECT brand, COUNT(*) as count 
                FROM devices 
                WHERE is_active = 1 
                GROUP BY brand 
                ORDER BY count DESC
            """)
            brands = dict(cursor.fetchall())
            
            return {
                "total_devices": total_devices,
                "active_devices": active_devices,
                "devices_by_type": devices_by_type,
                "brands": brands
            }
    
    # Feature Management Methods
    def insert_feature(self, feature: Feature) -> int:
        """Insert a new feature record and return the ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Ensure upvotes and status have defaults if None
            upvotes = feature.upvotes if feature.upvotes is not None else 0
            status = feature.status if feature.status else 'Suggestion'
            submitted_by = feature.submitted_by if feature.submitted_by else 1
            
            # Debug logging
            print(f"DEBUG insert_feature: upvotes={upvotes}, status={status}, submitted_by={submitted_by}")
            
            cursor.execute("""
                INSERT INTO features (title, description, upvotes, status, submitted_by)
                VALUES (?, ?, ?, ?, ?)
            """, (feature.title, feature.description, upvotes, status, submitted_by))
            conn.commit()
            print(f"DEBUG insert_feature: Inserted with ID {cursor.lastrowid}")
            return cursor.lastrowid

    def get_all_features(self) -> List[Dict[str, Any]]:
        """Get all features with their metadata"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM features ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
    
    def update_feature(self, feature_id: int, updates: Dict[str, Any]) -> bool:
        """Update a feature record"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Build dynamic update query
            fields = []
            values = []
            for key, value in updates.items():
                if value is not None:
                    fields.append(f"{key} = ?")
                    values.append(value)
            
            if not fields:
                return False
            
            values.append(feature_id)
            query = f"UPDATE features SET {', '.join(fields)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()
            return cursor.rowcount > 0
    
    def delete_feature(self, feature_id: int) -> bool:
        """Delete a feature record"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM features WHERE id = ?", (feature_id,))
            conn.commit()
            return cursor.rowcount > 0

    # Device Brand CRUD Methods
    def insert_device_brand(self, brand: DeviceBrandRecord) -> int:
        """Insert a new device brand and return the ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO device_brands (name, icon, is_active)
                VALUES (?, ?, ?)
            """, (brand.name, brand.icon, brand.is_active))
            conn.commit()
            return cursor.lastrowid
    
    def get_all_device_brands(self, active_only: bool = True) -> List[DeviceBrandRecord]:
        """Get all device brands"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM device_brands"
            if active_only:
                query += " WHERE is_active = 1"
            query += " ORDER BY name"
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            brands = []
            for row in rows:
                brands.append(DeviceBrandRecord(
                    id=row[0],
                    name=row[1],
                    icon=row[2],
                    is_active=bool(row[3]),
                    created_at=row[4],
                    updated_at=row[5]
                ))
            return brands
    
    def get_phone_brand_by_id(self, brand_id: int) -> Optional[PhoneBrandRecord]:
        """Get phone brand by ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM phone_brands WHERE id = ?", (brand_id,))
            row = cursor.fetchone()
            
            if row:
                return PhoneBrandRecord(
                    id=row[0],
                    name=row[1],
                    icon=row[2],
                    description=row[3],
                    country_origin=row[4],
                    market_share_uganda=row[5],
                    is_active=bool(row[6]),
                    created_at=row[7],
                    updated_at=row[8]
                )
            return None
    
    def update_phone_brand(self, brand_id: int, brand: PhoneBrandRecord) -> bool:
        """Update a phone brand"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE phone_brands 
                SET name = ?, icon = ?, description = ?, country_origin = ?, 
                    market_share_uganda = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (brand.name, brand.icon, brand.description, brand.country_origin, 
                  brand.market_share_uganda, brand.is_active, brand_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def delete_phone_brand(self, brand_id: int) -> bool:
        """Soft delete a phone brand"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE phone_brands 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (brand_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    # Phone Model CRUD Methods
    def insert_phone_model(self, model: PhoneModelRecord) -> int:
        """Insert a new phone model and return the ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO phone_models (
                    brand_id, model_name, model_code, device_type, price_range,
                    screen_size, battery_capacity, storage_options, color_options,
                    release_year, is_popular_uganda, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (model.brand_id, model.model_name, model.model_code, model.device_type,
                  model.price_range, model.screen_size, model.battery_capacity,
                  model.storage_options, model.color_options, model.release_year,
                  model.is_popular_uganda, model.is_active))
            conn.commit()
            return cursor.lastrowid
    
    def get_phone_models_by_brand(self, brand_id: int, active_only: bool = True) -> List[PhoneModelRecord]:
        """Get phone models by brand ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM phone_models WHERE brand_id = ?"
            if active_only:
                query += " AND is_active = 1"
            query += " ORDER BY model_name"
            
            cursor.execute(query, (brand_id,))
            rows = cursor.fetchall()
            
            models = []
            for row in rows:
                models.append(PhoneModelRecord(
                    id=row[0],
                    brand_id=row[1],
                    model_name=row[2],
                    model_code=row[3],
                    device_type=row[4],
                    price_range=row[5],
                    screen_size=row[6],
                    battery_capacity=row[7],
                    storage_options=row[8],
                    color_options=row[9],
                    release_year=row[10],
                    is_popular_uganda=bool(row[11]),
                    is_active=bool(row[12]),
                    created_at=row[13],
                    updated_at=row[14]
                ))
            return models
    
    def get_popular_phone_models_uganda(self) -> List[PhoneModelRecord]:
        """Get popular phone models in Uganda"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT pm.*, pb.name as brand_name 
                FROM phone_models pm
                JOIN phone_brands pb ON pm.brand_id = pb.id
                WHERE pm.is_popular_uganda = 1 AND pm.is_active = 1 AND pb.is_active = 1
                ORDER BY pb.name, pm.model_name
            """)
            rows = cursor.fetchall()
            
            models = []
            for row in rows:
                models.append(PhoneModelRecord(
                    id=row[0],
                    brand_id=row[1],
                    model_name=row[2],
                    model_code=row[3],
                    device_type=row[4],
                    price_range=row[5],
                    screen_size=row[6],
                    battery_capacity=row[7],
                    storage_options=row[8],
                    color_options=row[9],
                    release_year=row[10],
                    is_popular_uganda=bool(row[11]),
                    is_active=bool(row[12]),
                    created_at=row[13],
                    updated_at=row[14]
                ))
            return models
    def get_database_info(self) -> Dict[str, Any]:
        """Get comprehensive database information for health checks."""
        db_exists = os.path.exists(self.db_path)
        db_size = os.path.getsize(self.db_path) if db_exists else 0
        db_permissions = oct(os.stat(self.db_path).st_mode & 0o777) if db_exists else "N/A"

        last_backup = None
        if os.path.exists(self.backup_dir):
            backup_files = sorted([f for f in os.listdir(self.backup_dir) if f.startswith("barcode_generator_backup_") and f.endswith(".db.gz")], reverse=True)
            if backup_files:
                last_backup = backup_files[0]

        return {
            "database_path": self.db_path,
            "database_exists": db_exists,
            "database_size": db_size,
            "database_permissions": db_permissions,
            "backup_enabled": self.backup_enabled,
            "backup_dir": self.backup_dir,
            "last_backup": last_backup,
        }

    def get_database_statistics(self) -> Dict[str, Any]:
        """Get comprehensive database statistics."""
        with get_connection_context() as conn:
            cursor = conn.cursor()
            
            # Get table counts
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            table_counts = {}
            total_records = 0
            
            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                table_counts[table_name] = count
                total_records += count
            
            # Get database size
            db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            
            return {
                "total_tables": len(tables),
                "total_records": total_records,
                "database_size_bytes": db_size,
                "database_size_mb": round(db_size / (1024 * 1024), 2),
                "table_counts": table_counts,
                "last_updated": datetime.now().isoformat()
            }

    def optimize_database(self):
        """Optimize database by running VACUUM and ANALYZE."""
        with get_connection_context() as conn:
            cursor = conn.cursor()
            cursor.execute("VACUUM")
            cursor.execute("ANALYZE")
            conn.commit()

    def check_integrity(self) -> str:
        """Check database integrity."""
        with get_connection_context() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA integrity_check")
            result = cursor.fetchone()
            return result[0] if result else "unknown"

    def export_database(self) -> str:
        """Export database as SQL dump."""
        import subprocess
        export_path = os.path.join(os.path.dirname(self.db_path), f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql")
        
        try:
            subprocess.run([
                "sqlite3", self.db_path, ".dump"
            ], stdout=open(export_path, 'w'), check=True)
            return export_path
        except Exception as e:
            raise Exception(f"Database export failed: {e}")
