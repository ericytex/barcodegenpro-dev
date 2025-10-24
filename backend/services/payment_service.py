import os
"""
Payment Service for Optimus Integration (SQLite)
"""
import requests
import uuid
import json
import sqlite3
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from models.payment_models import SubscriptionPlan, UserSubscription, PaymentTransaction, PaymentWebhook
import logging
import os
from dotenv import load_dotenv


logger = logging.getLogger(__name__)

class OptimusPaymentService:
    def __init__(self, db_path: str = "data/barcode_generator.db"):
        load_dotenv()
        self.environment = os.getenv("ENVIRONMENT", "production")

        # Default to sandbox environment
        self.environment = "production"  # Will be updated from settings
        self.db_path = db_path
        self._update_api_config()
    
    def _update_api_config(self):
        """Update API configuration based on environment"""
        if self.environment == "production":
            #self.base_url = "https://optimus.santripe.com/v2/collections/mobile-money/new"
            # Get production token from database settings
            #self.auth_token = self._get_production_auth_token()
            self.base_url = os.getenv("BASE_URL")
            self.auth_token = os.getenv("AUTH_TOKEN")
        else:  # sandbox
            self.base_url = "https://optimus.santripe.com/v2/collections/mobile-money/new"
            self.auth_token = "pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i"
        
        self.headers = {
            "Authorization": self.auth_token,
            "Content-Type": "application/json"
        }
    
    def _get_production_auth_token(self) -> str:
        """Get production auth token from database settings"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT setting_value FROM token_settings 
                    WHERE setting_key = 'payment_production_auth_token'
                """)
                result = cursor.fetchone()
                if result and result[0]:
                    return result[0]
                else:
                    logger.warning("Production auth token not configured, using placeholder")
                    return "YOUR_PRODUCTION_AUTH_TOKEN_HERE"
        except Exception as e:
            logger.error(f"Error getting production auth token: {e}")
            return "YOUR_PRODUCTION_AUTH_TOKEN_HERE"
    
    def set_environment(self, environment: str):
        """Set payment environment (sandbox/production)"""
        if environment in ["sandbox", "production"]:
            self.environment = environment
            self._update_api_config()
            logger.info(f"Payment API environment set to: {environment}")
        else:
            logger.error(f"Invalid payment environment: {environment}")
    
    def get_environment(self) -> str:
        """Get current payment environment"""
        return self.environment
    
    def load_environment_from_settings(self):
        """Load payment environment from database settings"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT setting_value FROM token_settings 
                    WHERE setting_key = 'payment_api_environment'
                """)
                result = cursor.fetchone()
                if result and result[0]:
                    self.set_environment(result[0])
                    logger.info(f"Payment environment loaded from settings: {result[0]}")
                else:
                    logger.info("No payment environment setting found, using default: sandbox")
        except Exception as e:
            logger.error(f"Error loading payment environment from settings: {e}")
    
    def _generate_unique_transaction_uid(self, user_id: int, provider: str) -> str:
        """
        Generate a guaranteed unique transaction UID with multiple layers of uniqueness:
        1. UUID4 (cryptographically random)
        2. Timestamp with microseconds
        3. User ID
        4. Provider
        5. Database uniqueness check
        """
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            # Generate base UUID
            base_uuid = str(uuid.uuid4())
            
            # Add timestamp with microseconds for extra uniqueness
            timestamp = str(int(time.time() * 1000000))  # microseconds
            
            # Create compound unique ID
            # Format: uuid-timestamp-userid-provider-hash
            compound_string = f"{base_uuid}-{timestamp}-{user_id}-{provider}"
            
            # Create a hash for additional uniqueness
            hash_suffix = hashlib.sha256(compound_string.encode()).hexdigest()[:8]
            
            # Final transaction UID (shortened for readability but still unique)
            transaction_uid = f"{base_uuid}-{hash_suffix}"
            
            # Verify uniqueness in database
            if self._check_transaction_uid_unique(transaction_uid):
                logger.info(f"✅ Generated unique transaction UID: {transaction_uid}")
                logger.info(f"   • Base UUID: {base_uuid}")
                logger.info(f"   • Timestamp: {timestamp}")
                logger.info(f"   • Hash: {hash_suffix}")
                logger.info(f"   • Verified unique in database")
                return transaction_uid
            
            attempt += 1
            logger.warning(f"⚠️  Transaction UID collision detected (attempt {attempt}/{max_attempts}), regenerating...")
            time.sleep(0.001)  # Small delay before retry
        
        # Fallback: If somehow we still have collisions after max attempts, add random suffix
        fallback_uid = f"{str(uuid.uuid4())}-{int(time.time() * 1000000)}-{hashlib.sha256(str(time.time()).encode()).hexdigest()[:12]}"
        logger.error(f"❌ Max attempts reached, using fallback UID: {fallback_uid}")
        return fallback_uid
    
    def _check_transaction_uid_unique(self, transaction_uid: str) -> bool:
        """Check if transaction UID already exists in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM payment_transactions 
                WHERE transaction_uid = ?
            """, (transaction_uid,))
            
            count = cursor.fetchone()[0]
            conn.close()
            
            return count == 0
        except Exception as e:
            logger.error(f"Error checking transaction UID uniqueness: {e}")
            return True  # If check fails, assume it's unique to avoid blocking
    
    def _format_phone_number(self, phone: str, country: str = "UGA") -> str:
        """Format and validate phone number for specific country"""
        # Remove all spaces and special characters except +
        phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Ensure it starts with +
        if not phone.startswith("+"):
            phone = "+" + phone
        
        # Country-specific formatting
        if country == "UGA":
            # Uganda: +256XXXXXXXXX (9 digits after country code)
            if phone.startswith("+256"):
                # Remove +256 prefix
                digits = phone[4:]
                # Keep only first 9 digits
                digits = digits[:9]
                phone = f"+256{digits}"
            elif phone.startswith("256"):
                digits = phone[3:]
                digits = digits[:9]
                phone = f"+256{digits}"
            elif phone.startswith("0"):
                # Remove leading 0 and add country code
                digits = phone[1:]
                digits = digits[:9]
                phone = f"+256{digits}"
        
        elif country == "KEN":
            # Kenya: +254XXXXXXXXX (9 digits after country code)
            if phone.startswith("+254"):
                digits = phone[4:]
                digits = digits[:9]
                phone = f"+254{digits}"
        
        return phone
    
    def create_payment(self, user_id: int, amount_ugx: int, phone: str, provider: str = "MTN", transaction_uid: str = None) -> Dict:
        """Create a new payment request with Optimus"""
        # Generate guaranteed unique transaction UID if not provided
        if not transaction_uid:
            transaction_uid = self._generate_unique_transaction_uid(user_id, provider)
        
        # Provider-specific configuration (using correct Optimus API telecom codes)
        provider_config = {
            "MPESA": {
                "country": "KEN",
                "telecom": "MPESA",
                "currency": "KES",
                "rate": 0.27  # 1 UGX = 0.27 KES
            },
            "MTN": {
                "country": "UGA",
                "telecom": "MTN_MOMO_UGA",  # ✅ Correct Optimus API code for Uganda MTN
                "currency": "UGX",
                "rate": 1.0  # No conversion needed
            },
            "AIRTEL": {
                "country": "UGA",
                "telecom": "AIRTEL_OAPI_UGA",  # ✅ Correct Optimus API code for Uganda Airtel
                "currency": "UGX",
                "rate": 1.0  # No conversion needed
            }
        }
        
        config = provider_config.get(provider, provider_config["MTN"])
        amount_local = int(amount_ugx * config["rate"])
        
        # Format phone number for the country
        formatted_phone = self._format_phone_number(phone, config["country"])
        
        payload = {
            "data": {
                "local_country": config["country"],
                "local_telecom": config["telecom"],
                "local_currency": config["currency"],
                "local_phone": formatted_phone,
                "local_amount": amount_local,
                "app_transaction_uid": transaction_uid
            }
        }
        
        # Console log payment creation
        logger.info("="*70)
        logger.info("🚀 CREATING PAYMENT WITH OPTIMUS API")
        logger.info("="*70)
        logger.info(f"📡 Endpoint: {self.base_url}")
        logger.info(f"🔑 Authorization: {self.auth_token}")
        logger.info("")
        logger.info(f"🆔 Transaction UID: {transaction_uid}")
        logger.info(f"👤 User ID: {user_id}")
        logger.info(f"🏢 Provider: {provider}")
        logger.info(f"📞 Phone: {phone} → {formatted_phone} (formatted)")
        logger.info("")
        logger.info("📋 REQUEST PARAMETERS:")
        logger.info(f"  • local_country: {config['country']}")
        logger.info(f"  • local_telecom: {config['telecom']}")
        logger.info(f"  • local_currency: {config['currency']}")
        logger.info(f"  • local_phone: {phone}")
        logger.info(f"  • local_amount: {amount_local}")
        logger.info(f"  • app_transaction_uid: {transaction_uid}")
        logger.info("")
        logger.info(f"💰 Amount Conversion: {amount_ugx} UGX → {amount_local} {config['currency']}")
        logger.info("")
        logger.info("📤 FULL PAYLOAD:")
        logger.info(json.dumps(payload, indent=2))
        logger.info("="*70)
        
        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            
            response_data = response.json()
            
            # Console log response
            logger.info("="*70)
            logger.info("OPTIMUS API RESPONSE")
            logger.info("="*70)
            logger.info(f"✅ Status Code: {response.status_code}")
            logger.info(f"📥 Response: {json.dumps(response_data, indent=2)}")
            logger.info("="*70)
            
            # For Optimus, we need to create a payment instruction URL
            # Since they don't provide a direct payment URL, we'll create one
            payment_url = f"https://optimus.santripe.com/pay/{transaction_uid}"
            
            return {
                "success": True,
                "transaction_uid": transaction_uid,
                "payment_data": response_data,
                "payment_url": payment_url,
                "amount_kes": amount_local,
                "provider": provider,
                "currency": config["currency"]
            }
            
        except requests.RequestException as e:
            logger.error("="*70)
            logger.error("PAYMENT CREATION FAILED")
            logger.error("="*70)
            logger.error(f"❌ Error: {str(e)}")
            logger.error(f"🆔 Transaction UID: {transaction_uid}")
            
            # Try to get response body for more details
            error_message = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_body = e.response.json()
                    logger.error(f"📛 Response Body: {json.dumps(error_body, indent=2)}")
                    if 'message' in error_body:
                        error_message = error_body['message']
                except:
                    logger.error(f"📛 Response Text: {e.response.text}")
                    error_message = e.response.text
            
            logger.error("="*70)
            return {
                "success": False,
                "error": error_message,
                "transaction_uid": transaction_uid
            }


class SubscriptionService:
    def __init__(self, db_path: str = "data/barcode_generator.db"):
        self.db_path = db_path
        self.payment_service = OptimusPaymentService()
    
    def _get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def create_subscription(self, user_id: int, plan_id: int, phone: str, provider: str = "MTN") -> Dict:
        """Create a new subscription"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Get plan details
            cursor.execute("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1", (plan_id,))
            plan_row = cursor.fetchone()
            
            if not plan_row:
                return {"success": False, "error": "Plan not found or not active"}
            
            plan_id_db, name, description, price_ugx, duration_months, features, is_active, created_at = plan_row
            
            logger.info(f"📋 Plan Details: {name} - UGX {price_ugx}")
            
            # Create subscription record
            cursor.execute("""
                INSERT INTO user_subscriptions (user_id, plan_id, status)
                VALUES (?, ?, 'pending')
            """, (user_id, plan_id))
            subscription_id = cursor.lastrowid
            
            logger.info(f"✅ Subscription created with ID: {subscription_id}")
            
            # Create payment
            payment_result = self.payment_service.create_payment(
                user_id=user_id,
                amount_ugx=price_ugx,
                phone=phone,
                provider=provider
            )
            
            if payment_result['success']:
                # Save payment transaction
                cursor.execute("""
                    INSERT INTO payment_transactions 
                    (user_id, subscription_id, transaction_uid, amount_ugx, payment_url, payment_method, callback_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    subscription_id,
                    payment_result['transaction_uid'],
                    price_ugx,
                    payment_result['payment_url'],
                    provider,
                    json.dumps(payment_result['payment_data'])
                ))
                
                conn.commit()
                
                logger.info("="*70)
                logger.info("PAYMENT TRANSACTION SAVED TO DATABASE")
                logger.info("="*70)
                logger.info(f"✅ Transaction UID: {payment_result['transaction_uid']}")
                logger.info(f"✅ Subscription ID: {subscription_id}")
                logger.info(f"✅ Provider: {provider}")
                logger.info(f"✅ Amount: UGX {price_ugx}")
                logger.info("="*70)
                
                return {
                    "success": True,
                    "subscription_id": subscription_id,
                    "payment_url": payment_result['payment_url'],
                    "transaction_uid": payment_result['transaction_uid'],
                    "amount_ugx": price_ugx,
                    "amount_kes": payment_result['amount_kes'],
                    "provider": provider,
                    "currency": payment_result.get('currency', 'UGX')
                }
            
            return {"success": False, "error": "Payment creation failed"}
            
        except Exception as e:
            logger.error(f"Subscription creation failed: {str(e)}")
            conn.rollback()
            return {"success": False, "error": str(e)}
        finally:
            conn.close()
    
    def activate_subscription(self, transaction_uid: str) -> bool:
        """Activate subscription after successful payment"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Get transaction details
            cursor.execute("""
                SELECT id, user_id, subscription_id 
                FROM payment_transactions 
                WHERE transaction_uid = ?
            """, (transaction_uid,))
            
            transaction_row = cursor.fetchone()
            
            if not transaction_row:
                logger.error(f"Transaction not found: {transaction_uid}")
                return False
            
            transaction_id, user_id, subscription_id = transaction_row
            
            # Update subscription status
            start_date = datetime.utcnow().isoformat()
            end_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
            
            cursor.execute("""
                UPDATE user_subscriptions 
                SET status = 'active', start_date = ?, end_date = ?, updated_at = ?
                WHERE id = ?
            """, (start_date, end_date, datetime.utcnow().isoformat(), subscription_id))
            
            # Update transaction status
            cursor.execute("""
                UPDATE payment_transactions 
                SET status = 'completed', updated_at = ?
                WHERE transaction_uid = ?
            """, (datetime.utcnow().isoformat(), transaction_uid))
            
            conn.commit()
            logger.info(f"Subscription activated for transaction: {transaction_uid}")
            return True
            
        except Exception as e:
            logger.error(f"Subscription activation failed: {str(e)}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def get_user_subscription(self, user_id: int) -> Optional[Dict]:
        """Get user's current active subscription"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT us.*, sp.name as plan_name 
                FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = ? AND us.status = 'active'
                ORDER BY us.created_at DESC
                LIMIT 1
            """, (user_id,))
            
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0],
                    "user_id": row[1],
                    "plan_id": row[2],
                    "status": row[3],
                    "start_date": row[4],
                    "end_date": row[5],
                    "auto_renew": row[6],
                    "created_at": row[7],
                    "updated_at": row[8],
                    "plan_name": row[9]
                }
            return None
            
        finally:
            conn.close()
    
    def check_subscription_status(self, user_id: int) -> Dict:
        """Check if user has active subscription"""
        subscription = self.get_user_subscription(user_id)
        
        if not subscription:
            return {
                "has_subscription": False,
                "status": "none",
                "plan": None
            }
        
        # Check if subscription is still valid
        if subscription['end_date']:
            end_date = datetime.fromisoformat(subscription['end_date'])
            if end_date < datetime.utcnow():
                # Expired subscription
                conn = self._get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE user_subscriptions 
                    SET status = 'expired'
                    WHERE id = ?
                """, (subscription['id'],))
                conn.commit()
                conn.close()
                
                return {
                    "has_subscription": False,
                    "status": "expired",
                    "plan": subscription['plan_name']
                }
        
        return {
            "has_subscription": True,
            "status": subscription['status'],
            "plan": subscription['plan_name'],
            "end_date": subscription['end_date']
        }
    
    def get_available_plans(self) -> List[Dict]:
        """Get all available subscription plans"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, name, description, price_ugx, duration_months, features
                FROM subscription_plans 
                WHERE is_active = 1
            """)
            
            plans = []
            for row in cursor.fetchall():
                plans.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "price_ugx": row[3],
                    "duration_months": row[4],
                    "features": json.loads(row[5]) if row[5] else []
                })
            
            return plans
            
        finally:
            conn.close()
    
    def log_webhook(self, transaction_uid: str, webhook_data: Dict):
        """Log payment webhook"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO payment_webhooks (transaction_uid, webhook_data)
                VALUES (?, ?)
            """, (transaction_uid, json.dumps(webhook_data)))
            
            conn.commit()
            logger.info(f"Webhook logged for transaction: {transaction_uid}")
            
        finally:
            conn.close()
    
    def get_user_transactions(self, user_id: int) -> List[Dict]:
        """Get user's payment transaction history"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, transaction_uid, amount_ugx, status, payment_method, created_at, payment_url
                FROM payment_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
            """, (user_id,))
            
            transactions = []
            for row in cursor.fetchall():
                transactions.append({
                    "id": row[0],
                    "transaction_uid": row[1],
                    "amount_ugx": row[2],
                    "status": row[3],
                    "payment_method": row[4],
                    "created_at": row[5],
                    "payment_url": row[6]
                })
            
            return transactions
            
        finally:
            conn.close()


# For compatibility with the routes that expect a get_db dependency
def get_db():
    """Compatibility function for get_db dependency"""
    return None  # We handle connections internally now