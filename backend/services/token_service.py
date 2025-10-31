"""
Token Service for managing user tokens, purchases, and usage
"""

import sqlite3
import logging
import hashlib
import uuid
from datetime import datetime
from typing import Optional, Dict, List, Any
from services.payment_service import OptimusPaymentService
from utils.encryption import get_sensitive_field_manager

logger = logging.getLogger(__name__)


class TokenService:
    """Service for managing user tokens"""
    
    def __init__(self, db_path: str = "data/barcode_generator.db"):
        self.db_path = db_path
        self.payment_service = OptimusPaymentService()
        self.encryption_manager = get_sensitive_field_manager()
    
    # ==================== Token Balance Management ====================
    
    def get_balance(self, user_id: int) -> int:
        """Get user's current token balance"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT balance FROM user_tokens WHERE user_id = ?
            """, (user_id,))
            result = cursor.fetchone()
            return result[0] if result else 0
    
    def get_token_account(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get complete token account information"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM user_tokens WHERE user_id = ?
            """, (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def create_token_account(self, user_id: int, initial_balance: int = 0) -> bool:
        """Create a token account for a new user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO user_tokens (user_id, balance, total_purchased, total_used)
                    VALUES (?, ?, ?, 0)
                """, (user_id, initial_balance, initial_balance))
                conn.commit()
                logger.info(f"Created token account for user {user_id} with {initial_balance} tokens")
                return True
        except sqlite3.IntegrityError:
            logger.warning(f"Token account already exists for user {user_id}")
            return False
    
    def add_tokens(self, user_id: int, tokens: int, transaction_uid: str) -> bool:
        """Add tokens to user's balance"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if account exists
                cursor.execute("SELECT id FROM user_tokens WHERE user_id = ?", (user_id,))
                if not cursor.fetchone():
                    # Create account if it doesn't exist
                    self.create_token_account(user_id, tokens)
                else:
                    # Update existing account
                    cursor.execute("""
                        UPDATE user_tokens 
                        SET balance = balance + ?,
                            total_purchased = total_purchased + ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ?
                    """, (tokens, tokens, user_id))
                conn.commit()
                
                logger.info(f"Added {tokens} tokens to user {user_id} (transaction: {transaction_uid})")
                return True
        except Exception as e:
            logger.error(f"Error adding tokens to user {user_id}: {e}")
            return False
    
    def deduct_tokens(self, user_id: int, tokens: int, operation: str, details: Optional[Dict] = None) -> bool:
        """Deduct tokens from user's balance and log usage"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if user has enough tokens
                cursor.execute("SELECT balance FROM user_tokens WHERE user_id = ?", (user_id,))
                result = cursor.fetchone()
                if not result or result[0] < tokens:
                    logger.warning(f"Insufficient tokens for user {user_id}. Required: {tokens}, Available: {result[0] if result else 0}")
                    return False
                
                # Deduct tokens
                cursor.execute("""
                    UPDATE user_tokens 
                    SET balance = balance - ?,
                        total_used = total_used + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """, (tokens, tokens, user_id))
                
                # Log usage
                import json
                cursor.execute("""
                    INSERT INTO token_usage (user_id, tokens_used, operation, details)
                    VALUES (?, ?, ?, ?)
                """, (user_id, tokens, operation, json.dumps(details) if details else None))
                
                conn.commit()
                logger.info(f"Deducted {tokens} tokens from user {user_id} for operation: {operation}")
                return True
        except Exception as e:
            logger.error(f"Error deducting tokens from user {user_id}: {e}")
            return False
    
    # ==================== Token Purchase ====================
    
    def calculate_tokens_from_amount(self, amount_ugx: int) -> int:
        """Calculate how many tokens can be purchased with given amount"""
        token_price = self.get_setting('token_price_ugx', 500)
        base_tokens = amount_ugx / token_price
        
        # Apply bulk discounts
        discount_tiers = [
            (self.get_setting('discount_tier_3_min', 500), self.get_setting('discount_tier_3_percent', 30)),
            (self.get_setting('discount_tier_2_min', 100), self.get_setting('discount_tier_2_percent', 20)),
            (self.get_setting('discount_tier_1_min', 50), self.get_setting('discount_tier_1_percent', 10)),
        ]
        
        for min_tokens, discount_percent in discount_tiers:
            if base_tokens >= min_tokens:
                bonus_tokens = base_tokens * (discount_percent / 100)
                return int(base_tokens + bonus_tokens)
        
        return int(base_tokens)
    
    def calculate_amount_from_tokens(self, tokens: int) -> int:
        """Calculate cost for a given number of tokens"""
        token_price = self.get_setting('token_price_ugx', 500)
        return tokens * token_price
    
    def get_discount_info(self, tokens: int) -> Dict[str, Any]:
        """Get discount information for a token quantity"""
        discount_tiers = [
            (self.get_setting('discount_tier_1_min', 50), self.get_setting('discount_tier_1_percent', 10)),
            (self.get_setting('discount_tier_2_min', 100), self.get_setting('discount_tier_2_percent', 20)),
            (self.get_setting('discount_tier_3_min', 500), self.get_setting('discount_tier_3_percent', 30)),
        ]
        
        for min_tokens, discount_percent in discount_tiers:
            if tokens >= min_tokens:
                base_amount = self.calculate_amount_from_tokens(tokens)
                bonus_tokens = int(tokens * (discount_percent / 100))
                return {
                    "has_discount": True,
                    "discount_percent": discount_percent,
                    "base_tokens": tokens,
                    "bonus_tokens": bonus_tokens,
                    "total_tokens": tokens + bonus_tokens,
                    "amount_ugx": base_amount
                }
        
        return {
            "has_discount": False,
            "discount_percent": 0,
            "base_tokens": tokens,
            "bonus_tokens": 0,
            "total_tokens": tokens,
            "amount_ugx": self.calculate_amount_from_tokens(tokens)
        }
    
    def purchase_tokens(
        self,
        user_id: int,
        amount_ugx: int,
        provider: str,
        phone: str,
        check_collections_immediately: bool = True
    ) -> Dict[str, Any]:
        """Initiate a token purchase"""
        try:
            # Calculate tokens
            tokens = self.calculate_tokens_from_amount(amount_ugx)
            
            # Validate purchase amount
            min_purchase = self.get_setting('min_purchase_tokens', 10)
            max_purchase = self.get_setting('max_purchase_tokens', 1000)
            
            if tokens < min_purchase:
                return {
                    "success": False,
                    "error": "below_minimum",
                    "message": f"Minimum purchase is {min_purchase} tokens (UGX {self.calculate_amount_from_tokens(min_purchase)})"
                }
            
            if tokens > max_purchase:
                return {
                    "success": False,
                    "error": "above_maximum",
                    "message": f"Maximum purchase is {max_purchase} tokens (UGX {self.calculate_amount_from_tokens(max_purchase)})"
                }
            
            # Generate unique transaction UID
            transaction_uid = self._generate_unique_transaction_uid(user_id, provider)
            
            # Create payment with Optimus
            payment_result = self.payment_service.create_payment(
                user_id=user_id,
                amount_ugx=amount_ugx,
                provider=provider,
                phone=phone,
                transaction_uid=transaction_uid
            )
            
            if not payment_result.get("success"):
                return payment_result
            
            # Save purchase record
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO token_purchases (
                        user_id, transaction_uid, amount_ugx, tokens_purchased,
                        payment_method, provider, phone, status, payment_url,
                        local_country, local_currency, local_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    transaction_uid,
                    amount_ugx,
                    tokens,
                    'mobile_money',
                    provider,
                    phone,
                    'pending',
                    self.encryption_manager.encrypt_for_storage('token_purchases', 'payment_url', payment_result.get('payment_url')),
                    payment_result.get('local_country'),
                    payment_result.get('local_currency'),
                    payment_result.get('local_amount')
                ))
                conn.commit()
            
            logger.info(f"Token purchase initiated: user={user_id}, tokens={tokens}, amount={amount_ugx}, txn={transaction_uid}")
            
            # DO NOT credit tokens yet - wait for Collections API confirmation
            logger.info(f"Token purchase recorded with status 'pending' - awaiting payment confirmation from Collections API")
            logger.info(f"Tokens ({tokens}) will be credited ONLY after payment is confirmed in Collections API")
            
            # Optional: Check Collections API to see if payment was already completed
            if check_collections_immediately:
                try:
                    from services.collections_service import OptimusCollectionsService
                    collections_service = OptimusCollectionsService()
                    result = collections_service.get_transaction_by_uid(transaction_uid)
                    
                    if result.get('success') and result.get('found'):
                        transaction = result['transaction']
                        status = transaction.get('status')
                        
                        # Only credit tokens if payment is confirmed as completed
                        if status in ['completed', 'success']:
                            logger.info(f"Payment already completed in Collections API, crediting tokens: {transaction_uid}")
                            success = self.complete_purchase(transaction_uid)
                            if success:
                                logger.info(f"✅ Tokens credited after Collections confirmation: {transaction_uid}")
                            else:
                                logger.error(f"Failed to credit tokens for completed transaction: {transaction_uid}")
                        else:
                            logger.info(f"Payment not yet completed in Collections (status: {status}). Tokens will be credited when payment is confirmed.")
                    else:
                        logger.info(f"Transaction not yet in Collections API. Will be verified when payment completes.")
                except Exception as e:
                    logger.warning(f"Error checking Collections API immediately: {e}")
            else:
                logger.info("Will verify payment with Collections API in background and credit tokens after confirmation")
            
            return {
                "success": True,
                "transaction_uid": transaction_uid,
                "tokens_purchased": tokens,
                "amount_ugx": amount_ugx,
                "payment_url": payment_result.get('payment_url'),
                "payment_instructions": payment_result.get('payment_instructions', {})
            }
            
        except Exception as e:
            logger.error(f"Error purchasing tokens: {e}")
            return {
                "success": False,
                "error": "purchase_failed",
                "message": str(e)
            }
    
    def _get_purchase_status(self, transaction_uid: str) -> Optional[str]:
        """Get the status of a token purchase"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT status FROM token_purchases
                    WHERE transaction_uid = ?
                """, (transaction_uid,))
                result = cursor.fetchone()
                return result[0] if result else None
        except Exception as e:
            logger.error(f"Error getting purchase status: {e}")
            return None
    
    def complete_purchase(self, transaction_uid: str) -> bool:
        """Complete a token purchase after payment confirmation
        
        IMPORTANT: This function is IDEMPOTENT - safe to call multiple times
        Will only credit tokens once per transaction_uid
        
        Args:
            transaction_uid: The transaction UID to complete
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("BEGIN IMMEDIATE")  # Lock to prevent race conditions
                cursor = conn.cursor()
                
                # Get purchase details with row-level locking
                cursor.execute("""
                    SELECT user_id, tokens_purchased, status
                    FROM token_purchases
                    WHERE transaction_uid = ?
                    LIMIT 1
                """, (transaction_uid,))
                result = cursor.fetchone()
                
                if not result:
                    conn.rollback()
                    logger.error(f"Purchase not found: {transaction_uid}")
                    return False
                
                user_id, tokens, status = result
                
                # SAFETY CHECK: If already completed, return immediately
                # This prevents double crediting even in race conditions
                if status == 'completed':
                    conn.rollback()
                    logger.info(f"Purchase already completed (idempotent check): {transaction_uid}")
                    return True
                
                # No Collections API verification - credit tokens immediately
                # Verification happens later via webhook or scheduled job
                
                # Atomic operation: Update status first, THEN credit tokens
                # This ensures status is changed before crediting, preventing duplicates
                cursor.execute("""
                    UPDATE token_purchases
                    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                    WHERE transaction_uid = ? AND status != 'completed'
                """, (transaction_uid,))
                
                # Check if update actually happened (rowcount > 0)
                if cursor.rowcount == 0:
                    # Another process already completed this
                    conn.rollback()
                    logger.info(f"Purchase was completed by another process: {transaction_uid}")
                    return True
                
                conn.commit()
            
            # Only add tokens if we successfully updated the status
            # This is critical for preventing double crediting
            
            # Get balance BEFORE adding tokens
            balance_before = self.get_balance(user_id)
            
            # Attempt to add tokens
            success = self.add_tokens(user_id, tokens, transaction_uid)
            
            # Verify balance increased
            balance_after = self.get_balance(user_id)
            balance_increased = (balance_after - balance_before) >= tokens
            
            # Update the tokens_credited flag ONLY if balance actually increased
            if success and balance_increased:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE token_purchases
                        SET tokens_credited = 1
                        WHERE transaction_uid = ?
                    """, (transaction_uid,))
                    conn.commit()
                logger.info(f"✅ Tokens credited: user={user_id}, balance {balance_before} → {balance_after} (+{tokens}), txn={transaction_uid}")
            else:
                logger.warning(f"⚠️ Tokens NOT credited: user={user_id}, add_tokens returned {success}, balance {balance_before} → {balance_after} (expected +{tokens}), txn={transaction_uid}")
            
            logger.info(f"Token purchase completed: user={user_id}, tokens={tokens}, credited={balance_increased}, txn={transaction_uid}")
            return balance_increased
            
        except sqlite3.OperationalError as e:
            # Database locked - another process is handling this
            logger.warning(f"Database locked for transaction {transaction_uid}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error completing purchase: {e}")
            return False
    
    # ==================== Token History ====================
    
    def get_purchase_history(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's token purchase history"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM token_purchases
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (user_id, limit))
            purchases = [dict(row) for row in cursor.fetchall()]
            
            # Decrypt sensitive fields
            decrypted_purchases = []
            for purchase in purchases:
                decrypted_purchase = self.encryption_manager.decrypt_record('token_purchases', purchase)
                decrypted_purchases.append(decrypted_purchase)
            
            return decrypted_purchases
    
    def get_usage_history(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user's token usage history"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM token_usage
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (user_id, limit))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_combined_history(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get combined purchase and usage history"""
        purchases = self.get_purchase_history(user_id, limit)
        usage = self.get_usage_history(user_id, limit)
        
        # Add type identifier
        for p in purchases:
            p['type'] = 'purchase'
        for u in usage:
            u['type'] = 'usage'
        
        # Combine and sort by created_at
        combined = purchases + usage
        combined.sort(key=lambda x: x['created_at'], reverse=True)
        
        return combined[:limit]
    
    # ==================== Settings Management ====================
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a token setting value"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT setting_value FROM token_settings WHERE setting_key = ?
                """, (key,))
                result = cursor.fetchone()
                
                if result:
                    value = result[0]
                    # Try to convert to appropriate type
                    if value.lower() in ['true', 'false']:
                        return value.lower() == 'true'
                    try:
                        return int(value)
                    except ValueError:
                        try:
                            return float(value)
                        except ValueError:
                            return value
                
                return default
        except Exception as e:
            logger.error(f"Error getting setting {key}: {e}")
            return default
    
    def set_setting(self, key: str, value: Any, updated_by: Optional[int] = None) -> bool:
        """Set a token setting value"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO token_settings (setting_key, setting_value, updated_by, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(setting_key) DO UPDATE SET
                        setting_value = excluded.setting_value,
                        updated_by = excluded.updated_by,
                        updated_at = CURRENT_TIMESTAMP
                """, (key, str(value), updated_by))
                conn.commit()
                logger.info(f"Setting updated: {key} = {value} by user {updated_by}")
                return True
        except Exception as e:
            logger.error(f"Error setting {key}: {e}")
            return False
    
    def get_all_settings(self) -> Dict[str, Any]:
        """Get all token settings"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM token_settings ORDER BY setting_key")
                settings = {}
                for row in cursor.fetchall():
                    settings[row['setting_key']] = {
                        'value': row['setting_value'],
                        'description': row['description'],
                        'updated_at': row['updated_at']
                    }
                return settings
        except Exception as e:
            logger.error(f"Error getting all settings: {e}")
            return {}
    
    def get_pricing_info(self) -> Dict[str, Any]:
        """Get current pricing and discount information"""
        token_price = self.get_setting('token_price_ugx', 500)
        
        return {
            "token_price_ugx": token_price,
            "welcome_bonus": self.get_setting('welcome_bonus_tokens', 10),
            "min_purchase": self.get_setting('min_purchase_tokens', 10),
            "max_purchase": self.get_setting('max_purchase_tokens', 1000),
            "tokens_never_expire": self.get_setting('tokens_never_expire', True),
            "discount_tiers": [
                {
                    "min_tokens": self.get_setting('discount_tier_1_min', 50),
                    "discount_percent": self.get_setting('discount_tier_1_percent', 10),
                    "price_per_token": token_price * (1 - self.get_setting('discount_tier_1_percent', 10) / 100)
                },
                {
                    "min_tokens": self.get_setting('discount_tier_2_min', 100),
                    "discount_percent": self.get_setting('discount_tier_2_percent', 20),
                    "price_per_token": token_price * (1 - self.get_setting('discount_tier_2_percent', 20) / 100)
                },
                {
                    "min_tokens": self.get_setting('discount_tier_3_min', 500),
                    "discount_percent": self.get_setting('discount_tier_3_percent', 30),
                    "price_per_token": token_price * (1 - self.get_setting('discount_tier_3_percent', 30) / 100)
                }
            ],
            "packages": self.get_token_packages()
        }
    
    def get_token_packages(self) -> List[Dict[str, Any]]:
        """Get predefined token packages with pricing"""
        packages_config = [
            {"tokens": 10, "label": "Starter"},
            {"tokens": 20, "label": "Basic"},
            {"tokens": 50, "label": "Popular", "badge": "🔥"},
            {"tokens": 100, "label": "Pro"},
            {"tokens": 200, "label": "Business"},
            {"tokens": 500, "label": "Enterprise"},
        ]
        
        packages = []
        for config in packages_config:
            tokens = config["tokens"]
            discount_info = self.get_discount_info(tokens)
            packages.append({
                **config,
                **discount_info
            })
        
        return packages
    
    # ==================== Utility Methods ====================
    
    def _generate_unique_transaction_uid(self, user_id: int, provider: str, max_retries: int = 3) -> str:
        """Generate a unique transaction UID with collision prevention"""
        for attempt in range(max_retries):
            # Create a unique string
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            random_uuid = str(uuid.uuid4())[:8]
            unique_string = f"{user_id}_{provider}_{timestamp}_{random_uuid}"
            
            # Hash it
            transaction_uid = hashlib.sha256(unique_string.encode()).hexdigest()[:32].upper()
            
            # Check uniqueness
            if self._check_transaction_uid_unique(transaction_uid):
                return transaction_uid
            
            logger.warning(f"Transaction UID collision detected (attempt {attempt + 1})")
        
        # Fallback: use UUID4
        return str(uuid.uuid4()).replace('-', '').upper()[:32]
    
    def get_all_token_purchases(self, limit: int = 50, offset: int = 0, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all token purchases for admin dashboard"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT tp.*, u.username, u.email
                FROM token_purchases tp
                LEFT JOIN users u ON tp.user_id = u.id
            """
            params = []
            
            if status_filter:
                query += " WHERE tp.status = ?"
                params.append(status_filter)
            
            query += " ORDER BY tp.created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_purchase_statistics(self) -> Dict[str, Any]:
        """Get token purchase statistics for admin dashboard"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Total purchases
            cursor.execute("SELECT COUNT(*) FROM token_purchases")
            total_purchases = cursor.fetchone()[0]
            
            # Total revenue
            cursor.execute("SELECT SUM(amount_ugx) FROM token_purchases WHERE status = 'completed'")
            total_revenue = cursor.fetchone()[0] or 0
            
            # Status breakdown
            cursor.execute("""
                SELECT status, COUNT(*) as count, SUM(amount_ugx) as amount
                FROM token_purchases 
                GROUP BY status
            """)
            status_breakdown = {row[0]: {'count': row[1], 'amount': row[2] or 0} for row in cursor.fetchall()}
            
            # Provider breakdown
            cursor.execute("""
                SELECT provider, COUNT(*) as count, SUM(amount_ugx) as amount
                FROM token_purchases 
                WHERE status = 'completed'
                GROUP BY provider
            """)
            provider_breakdown = {row[0]: {'count': row[1], 'amount': row[2] or 0} for row in cursor.fetchall()}
            
            return {
                "total_purchases": total_purchases,
                "total_revenue": total_revenue,
                "status_breakdown": status_breakdown,
                "provider_breakdown": provider_breakdown
            }

    def _check_transaction_uid_unique(self, transaction_uid: str) -> bool:
        """Check if a transaction UID is unique"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM token_purchases WHERE transaction_uid = ?
            """, (transaction_uid,))
            count = cursor.fetchone()[0]
            return count == 0
    
    def check_and_use_tokens(self, user_id: int, tokens_needed: int, operation: str) -> Dict[str, Any]:
        """Check if user has enough tokens and use them if available"""
        balance = self.get_balance(user_id)
        
        if balance < tokens_needed:
            return {
                "success": False,
                "error": "insufficient_tokens",
                "required": tokens_needed,
                "available": balance,
                "missing": tokens_needed - balance,
                "cost_ugx": self.calculate_amount_from_tokens(tokens_needed - balance)
            }
        
        # Deduct tokens
        if self.deduct_tokens(user_id, tokens_needed, operation):
            return {
                "success": True,
                "tokens_used": tokens_needed,
                "tokens_remaining": balance - tokens_needed
            }
        
        return {
            "success": False,
            "error": "deduction_failed",
            "message": "Failed to deduct tokens"
        }
