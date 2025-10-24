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

        # Use production environment for real API calls
        self.environment = "production"
        self.db_path = db_path
        self._update_api_config()
    
    def _update_api_config(self):
        """Update API configuration based on environment"""
        if self.environment == "production":
            # Production Optimus API endpoints
            self.base_url = "https://optimus.santripe.com/v2/collections/mobile-money/new"
            self.transactions_url = "https://optimus.santripe.com/transactions/mobile-money-collections"
            # Get production token from environment or database settings
            self.auth_token = os.getenv("AUTH_TOKEN") or self._get_production_auth_token()
        else:  # sandbox
            self.base_url = "https://optimus.santripe.com/v2/sandbox/collections/mobile-money/new"
            self.transactions_url = "https://optimus.santripe.com/transactions/mobile-money-collections"
            self.auth_token = "pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i"
        
        self.headers = {
            "Authorization": self.auth_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
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
    
    def _get_webhook_url(self) -> str:
        """Get webhook URL from environment or database settings"""
        # Try to get from environment first
        webhook_url = os.getenv("WEBHOOK_URL")
        if webhook_url:
            return webhook_url
        
        # Try to construct from DOMAIN environment variable
        domain = os.getenv("DOMAIN")
        if domain:
            # Ensure HTTPS for production
            if not domain.startswith("http"):
                protocol = "https" if self.environment == "production" else "http"
                domain = f"{protocol}://{domain}"
            return f"{domain}/api/payments/webhook/token-purchase"
        
        # Fallback to database settings
        return self._get_webhook_url_from_db()
    
    def _get_webhook_url_from_db(self) -> str:
        """Get webhook URL from database settings"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT setting_value FROM token_settings 
                    WHERE setting_key = 'payment_webhook_url'
                """)
                result = cursor.fetchone()
                return result[0] if result else "https://your-domain.com/api/payments/webhook/token-purchase"
        except Exception as e:
            logger.error(f"Error getting webhook URL from database: {e}")
            return "https://your-domain.com/api/payments/webhook/token-purchase"
    
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

    def verify_payment_status(self, transaction_uid: str) -> Dict:
        """Verify payment status with Optimus Provider using transaction_uid (app_transaction_uid)"""
        try:
            # Get transaction from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, user_id, amount_ugx, status, created_at
                FROM payment_transactions 
                WHERE transaction_uid = ?
            """, (transaction_uid,))
            
            transaction = cursor.fetchone()
            if not transaction:
                conn.close()
                return {
                    "success": False,
                    "error": "Transaction not found",
                    "transaction_uid": transaction_uid
                }
            
            transaction_id, user_id, amount, current_status, created_at = transaction
            
            logger.info(f"Verifying transaction {transaction_uid} (current status: {current_status})")
            
            # Query Optimus Provider for transaction status using app_transaction_uid
            optimus_status = self._query_optimus_transaction(transaction_uid)
            
            if optimus_status["success"]:
                new_status = optimus_status["status"]
                
                # Update database if status changed
                if new_status != current_status:
                    cursor.execute("""
                        UPDATE payment_transactions 
                        SET status = ?, updated_at = ?
                        WHERE transaction_uid = ?
                    """, (new_status, datetime.now().isoformat(), transaction_uid))
                    conn.commit()
                    
                    logger.info(f"✅ Updated transaction {transaction_uid} status: {current_status} → {new_status}")
                else:
                    logger.info(f"ℹ️ Transaction {transaction_uid} status unchanged: {current_status}")
                
                conn.close()
                return {
                    "success": True,
                    "transaction_uid": transaction_uid,
                    "previous_status": current_status,
                    "current_status": new_status,
                    "status_changed": new_status != current_status,
                    "optimus_data": optimus_status.get("data", {}),
                    "endpoint_used": optimus_status.get("endpoint_used")
                }
            else:
                conn.close()
                logger.warning(f"Failed to verify transaction {transaction_uid}: {optimus_status['error']}")
                return {
                    "success": False,
                    "error": optimus_status["error"],
                    "transaction_uid": transaction_uid,
                    "current_status": current_status
                }
                
        except Exception as e:
            logger.error(f"Error verifying payment status: {e}")
            return {
                "success": False,
                "error": str(e),
                "transaction_uid": transaction_uid
            }
    
    def _query_optimus_transaction(self, app_transaction_uid: str) -> Dict:
        """Query Optimus Provider for transaction status using app_transaction_uid"""
        try:
            logger.info(f"Querying Optimus for transaction: {app_transaction_uid}")
            
            # Test both endpoint patterns to find the working one
            endpoint = self._discover_status_endpoint(app_transaction_uid)
            
            if not endpoint:
                logger.error(f"No working endpoint found for transaction: {app_transaction_uid}")
                return {
                    "success": False,
                    "error": "No working Optimus endpoint found"
                }
            
            logger.info(f"Using Optimus endpoint: {endpoint}")
            
            # Make the actual API call
            response = requests.get(endpoint, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            response_data = response.json()
            logger.info(f"Optimus API response: {json.dumps(response_data, indent=2)}")
            
            # Parse response and map status
            status = self._map_optimus_status(response_data)
            
            return {
                "success": True,
                "status": status,
                "data": response_data,
                "endpoint_used": endpoint
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Optimus API request failed: {e}")
            return {
                "success": False,
                "error": f"API request failed: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error querying Optimus transaction: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def fetch_all_transactions(self) -> Dict:
        """Fetch all transactions from Optimus API"""
        try:
            url = f"{self.transactions_url}/{self.auth_token}"
            logger.info(f"Fetching all transactions from: {url}")
            
            response = requests.get(url, headers=self.headers, timeout=30)
            logger.info(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Successfully fetched {len(data.get('data', []))} transactions")
                return {
                    "success": True,
                    "data": data,
                    "total_transactions": len(data.get('data', [])),
                    "message": "Transactions fetched successfully"
                }
            else:
                logger.error(f"❌ Failed to fetch transactions: {response.status_code}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "message": response.text
                }
                
        except requests.RequestException as e:
            logger.error(f"❌ Request failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to connect to Optimus API"
            }
    
    def _discover_status_endpoint(self, transaction_uid: str) -> str:
        """Test both endpoint patterns to find the working one"""
        # Test various Optimus API patterns
        patterns = [
            # Standard Optimus patterns
            f"https://optimus.santripe.com/v2/collections/mobile-money/status/{transaction_uid}",
            f"https://optimus.santripe.com/v2/collections/mobile-money/transactions/{transaction_uid}",
            f"https://optimus.santripe.com/v2/status/{transaction_uid}",
            f"https://optimus.santripe.com/v2/transactions/{transaction_uid}",
            # Alternative API patterns
            f"https://optimus.santripe.com/api/v2/collections/mobile-money/status/{transaction_uid}",
            f"https://optimus.santripe.com/api/v2/collections/mobile-money/transactions/{transaction_uid}",
            f"https://optimus.santripe.com/api/v2/status/{transaction_uid}",
            f"https://optimus.santripe.com/api/v2/transactions/{transaction_uid}",
            # Different base URL patterns
            f"https://api.optimus.santripe.com/v2/collections/mobile-money/status/{transaction_uid}",
            f"https://api.optimus.santripe.com/v2/collections/mobile-money/transactions/{transaction_uid}",
            f"https://api.optimus.santripe.com/v2/status/{transaction_uid}",
            f"https://api.optimus.santripe.com/v2/transactions/{transaction_uid}",
            # Query parameter patterns
            f"https://optimus.santripe.com/v2/collections/mobile-money/status?transaction_id={transaction_uid}",
            f"https://optimus.santripe.com/v2/collections/mobile-money/transactions?transaction_id={transaction_uid}",
            f"https://optimus.santripe.com/v2/status?transaction_id={transaction_uid}",
            f"https://optimus.santripe.com/v2/transactions?transaction_id={transaction_uid}"
        ]
        
        logger.info(f"Testing endpoint patterns for transaction: {transaction_uid}")
        
        for pattern in patterns:
            try:
                logger.info(f"Testing endpoint: {pattern}")
                response = requests.get(pattern, headers=self.headers, timeout=10)
                logger.info(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    logger.info(f"Working endpoint found: {pattern}")
                    return pattern
                elif response.status_code == 404:
                    logger.info(f"Endpoint not found: {pattern}")
                    continue
                else:
                    logger.warning(f"Unexpected status {response.status_code} for: {pattern}")
                    
            except requests.exceptions.RequestException as e:
                logger.info(f"Request failed for {pattern}: {e}")
                continue
        
        logger.error("No working endpoint found for any pattern")
        
        # Fallback: Since we can't find a working endpoint, let's check if this is a common issue
        # and provide a manual update option for old transactions
        logger.warning("⚠️ No Optimus status endpoint found. This might be because:")
        logger.warning("   1. Optimus doesn't provide a status API endpoint")
        logger.warning("   2. The endpoint pattern is different from what we're testing")
        logger.warning("   3. Authentication is required for status queries")
        logger.warning("   4. The transactions are too old for status checking")
        
        return None
    
    def _map_optimus_status(self, response_data: Dict) -> str:
        """Map Optimus API response status to our system status"""
        try:
            # Try different possible status field names
            status_fields = ['status', 'transaction_status', 'payment_status', 'state']
            
            for field in status_fields:
                if field in response_data:
                    optimus_status = response_data[field].lower()
                    break
            else:
                # If no status field found, check nested data
                if 'data' in response_data and isinstance(response_data['data'], dict):
                    for field in status_fields:
                        if field in response_data['data']:
                            optimus_status = response_data['data'][field].lower()
                            break
                    else:
                        logger.warning(f"No status field found in response: {response_data}")
                        return "pending"
                else:
                    logger.warning(f"No status field found in response: {response_data}")
                    return "pending"
            
            # Map Optimus status to our status
            status_mapping = {
                'completed': 'completed',
                'success': 'completed',
                'successful': 'completed',
                'paid': 'completed',
                'confirmed': 'completed',
                'pending': 'pending',
                'processing': 'pending',
                'in_progress': 'pending',
                'failed': 'failed',
                'error': 'failed',
                'cancelled': 'cancelled',
                'canceled': 'cancelled',
                'expired': 'cancelled',
                'timeout': 'cancelled'
            }
            
            mapped_status = status_mapping.get(optimus_status, 'pending')
            logger.info(f"Mapped Optimus status '{optimus_status}' to '{mapped_status}'")
            
            return mapped_status
            
        except Exception as e:
            logger.error(f"Error mapping Optimus status: {e}")
            return "pending"
    
    def sync_all_payments(self, limit: int = 100) -> Dict:
        """Sync all payments with Optimus Provider - using bulk fetch approach"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get all transactions that need verification (both payment_transactions and token_purchases)
            cursor.execute("""
                SELECT transaction_uid, status, created_at, 'payment_transactions' as table_name
                FROM payment_transactions 
                WHERE status IN ('pending', 'completed')
                UNION ALL
                SELECT transaction_uid, status, created_at, 'token_purchases' as table_name
                FROM token_purchases 
                WHERE status IN ('pending', 'completed')
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
            
            local_transactions = cursor.fetchall()
            
            # Fetch all transactions from Optimus
            optimus_result = self.fetch_all_transactions()
            if not optimus_result["success"]:
                return {
                    "success": False,
                    "error": "Failed to fetch Optimus transactions",
                    "message": optimus_result.get("message", "Unknown error")
                }
            
            optimus_transactions = optimus_result["data"]["data"]
            optimus_dict = {tx.get("app_transaction_uid"): tx for tx in optimus_transactions}
            
            sync_results = {
                "total_processed": len(local_transactions),
                "successful_syncs": 0,
                "failed_syncs": 0,
                "status_changes": 0,
                "results": []
            }
            
            logger.info(f"Starting sync for {len(local_transactions)} local transactions against {len(optimus_transactions)} Optimus transactions")
            
            for transaction_uid, current_status, created_at, table_name in local_transactions:
                logger.info(f"Syncing {table_name} transaction: {transaction_uid} (status: {current_status})")
                
                if transaction_uid in optimus_dict:
                    optimus_tx = optimus_dict[transaction_uid]
                    optimus_status = optimus_tx.get("transaction_status", "")
                    internal_status = self._map_optimus_status({"status": optimus_status})
                    
                    if internal_status != current_status:
                        # Update the transaction status
                        if table_name == 'payment_transactions':
                            cursor.execute("""
                                UPDATE payment_transactions 
                                SET status = ?, updated_at = ?
                                WHERE transaction_uid = ?
                            """, (internal_status, datetime.now().isoformat(), transaction_uid))
                        else:  # token_purchases
                            cursor.execute("""
                                UPDATE token_purchases 
                                SET status = ?, completed_at = ?
                                WHERE transaction_uid = ?
                            """, (internal_status, 
                                 datetime.now().isoformat() if internal_status == 'completed' else None, 
                                 transaction_uid))
                        
                        sync_results["status_changes"] += 1
                        logger.info(f"✅ Status changed for {table_name} {transaction_uid}: {current_status} → {internal_status} (Optimus: {optimus_status})")
                        
                        sync_results["results"].append({
                            "transaction_uid": transaction_uid,
                            "table": table_name,
                            "success": True,
                            "status_changed": True,
                            "previous_status": current_status,
                            "current_status": internal_status,
                            "optimus_status": optimus_status
                        })
                    else:
                        logger.debug(f"Status unchanged for {transaction_uid}: {current_status}")
                        sync_results["results"].append({
                            "transaction_uid": transaction_uid,
                            "table": table_name,
                            "success": True,
                            "status_changed": False,
                            "current_status": current_status,
                            "optimus_status": optimus_status
                        })
                    
                    sync_results["successful_syncs"] += 1
                else:
                    sync_results["failed_syncs"] += 1
                    logger.warning(f"❌ Transaction {transaction_uid} not found in Optimus")
                    sync_results["results"].append({
                        "transaction_uid": transaction_uid,
                        "table": table_name,
                        "success": False,
                        "error": "Transaction not found in Optimus"
                    })
            
            conn.commit()
            conn.close()
            
            logger.info(f"Payment sync completed: {sync_results['successful_syncs']}/{sync_results['total_processed']} successful, {sync_results['status_changes']} status changes")
            
            return {
                "success": True,
                "sync_summary": sync_results,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error syncing payments: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_payment_dashboard_data(self) -> Dict:
        """Get comprehensive payment dashboard data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get payment statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                    SUM(CASE WHEN status = 'completed' THEN amount_ugx ELSE 0 END) as total_revenue_ugx,
                    AVG(CASE WHEN status = 'completed' THEN amount_ugx ELSE NULL END) as avg_transaction_amount
                FROM payment_transactions
            """)
            
            stats = cursor.fetchone()
            
            # Get recent transactions
            cursor.execute("""
                SELECT transaction_uid, user_id, amount_ugx, status, created_at, optimus_transaction_id, is_test_data
                FROM payment_transactions 
                ORDER BY created_at DESC 
                LIMIT 20
            """)
            
            recent_transactions = []
            for row in cursor.fetchall():
                recent_transactions.append({
                    "transaction_uid": row[0],
                    "user_id": row[1],
                    "amount_ugx": row[2],
                    "status": row[3],
                    "created_at": row[4],
                    "optimus_transaction_id": row[5],
                    "is_test_data": bool(row[6]) if row[6] is not None else False
                })
            
            # Get transactions needing sync
            cursor.execute("""
                SELECT COUNT(*) 
                FROM payment_transactions 
                WHERE status = 'pending' 
                AND optimus_transaction_id IS NOT NULL
                AND created_at > datetime('now', '-7 days')
            """)
            
            pending_sync_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "success": True,
                "statistics": {
                    "total_transactions": stats[0] or 0,
                    "completed_transactions": stats[1] or 0,
                    "pending_transactions": stats[2] or 0,
                    "failed_transactions": stats[3] or 0,
                    "total_revenue_ugx": stats[4] or 0,
                    "avg_transaction_amount": round(stats[5] or 0, 2),
                    "pending_sync_count": pending_sync_count
                },
                "recent_transactions": recent_transactions,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting payment dashboard data: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def manually_update_pending_transactions(self, days_old: int = 7) -> Dict:
        """Manually update old pending transactions to completed status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find pending transactions older than specified days
            cursor.execute("""
                SELECT transaction_uid, created_at, amount_ugx
                FROM payment_transactions 
                WHERE status = 'pending'
                AND created_at < datetime('now', '-{} days')
                ORDER BY created_at ASC
            """.format(days_old))
            
            old_transactions = cursor.fetchall()
            
            if not old_transactions:
                conn.close()
                return {
                    "success": True,
                    "message": f"No pending transactions older than {days_old} days found",
                    "updated_count": 0
                }
            
            updated_count = 0
            results = []
            
            logger.info(f"Found {len(old_transactions)} pending transactions older than {days_old} days")
            
            for transaction_uid, created_at, amount_ugx in old_transactions:
                # Update to completed status
                cursor.execute("""
                    UPDATE payment_transactions 
                    SET status = 'completed', updated_at = ?
                    WHERE transaction_uid = ?
                """, (datetime.now().isoformat(), transaction_uid))
                
                updated_count += 1
                results.append({
                    "transaction_uid": transaction_uid,
                    "created_at": created_at,
                    "amount_ugx": amount_ugx,
                    "old_status": "pending",
                    "new_status": "completed"
                })
                
                logger.info(f"✅ Updated transaction {transaction_uid} from pending to completed (created: {created_at})")
            
            conn.commit()
            conn.close()
            
            logger.info(f"🎉 Manually updated {updated_count} old pending transactions to completed status")
            
            return {
                "success": True,
                "message": f"Updated {updated_count} old pending transactions to completed",
                "updated_count": updated_count,
                "results": results,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error manually updating transactions: {e}")
            return {
                "success": False,
                "error": str(e)
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
                
                # Auto-sync: Check payment status after a short delay
                import threading
                import time
                
                def delayed_status_check():
                    """Check payment status after 3 seconds delay"""
                    time.sleep(3)  # Wait 3 seconds for Optimus processing
                    logger.info(f"🔄 Auto-checking status for transaction: {payment_result['transaction_uid']}")
                    try:
                        status_result = self.payment_service.verify_payment_status(payment_result['transaction_uid'])
                        if status_result['success']:
                            if status_result.get('status_changed', False):
                                logger.info(f"🎉 Auto-sync successful: {payment_result['transaction_uid']} status changed to {status_result['current_status']}")
                            else:
                                logger.info(f"ℹ️ Auto-sync: {payment_result['transaction_uid']} status unchanged ({status_result['current_status']})")
                        else:
                            logger.warning(f"⚠️ Auto-sync failed for {payment_result['transaction_uid']}: {status_result['error']}")
                    except Exception as e:
                        logger.error(f"❌ Auto-sync error for {payment_result['transaction_uid']}: {e}")
                
                # Start background thread for status check
                sync_thread = threading.Thread(target=delayed_status_check, daemon=True)
                sync_thread.start()
                logger.info(f"🚀 Started background status check for transaction: {payment_result['transaction_uid']}")
                
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
    
    def complete_token_purchase(self, transaction_uid: str) -> bool:
        """Complete a token purchase after webhook confirmation"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Find the token purchase record
            cursor.execute("""
                SELECT id, user_id, amount_ugx, tokens_purchased, status
                FROM token_purchases 
                WHERE transaction_uid = ?
            """, (transaction_uid,))
            
            purchase = cursor.fetchone()
            if not purchase:
                logger.error(f"Token purchase not found: {transaction_uid}")
                return False
            
            purchase_id, user_id, amount_ugx, tokens_purchased, current_status = purchase
            
            if current_status == "completed":
                logger.info(f"Token purchase already completed: {transaction_uid}")
                return True
            
            # Update token purchase status
            cursor.execute("""
                UPDATE token_purchases 
                SET status = 'completed', completed_at = ?
                WHERE transaction_uid = ?
            """, (datetime.now().isoformat(), transaction_uid))
            
            # Update user tokens
            cursor.execute("""
                UPDATE user_tokens 
                SET balance = balance + ?, 
                    total_purchased = total_purchased + ?,
                    updated_at = ?
                WHERE user_id = ?
            """, (tokens_purchased, tokens_purchased, datetime.now().isoformat(), user_id))
            
            # Create payment transaction record
            cursor.execute("""
                INSERT INTO payment_transactions (
                    user_id, transaction_uid, amount_ugx, currency, 
                    payment_method, status, created_at, updated_at
                ) VALUES (?, ?, ?, 'UGX', 'mobile_money', 'completed', ?, ?)
            """, (user_id, transaction_uid, amount_ugx, datetime.now().isoformat(), datetime.now().isoformat()))
            
            conn.commit()
            
            logger.info(f"Token purchase completed successfully: {transaction_uid}")
            logger.info(f"User {user_id} credited with {tokens_purchased} tokens")
            
            return True
            
        except Exception as e:
            logger.error(f"Error completing token purchase {transaction_uid}: {e}")
            conn.rollback()
            return False
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


# Payment Sync and Verification Methods
def verify_payment_status(transaction_uid: str) -> Dict:
    """Verify payment status with Optimus Provider"""
    try:
        service = OptimusPaymentService()
        return service.verify_payment_status(transaction_uid)
    except Exception as e:
        logger.error(f"Error in verify_payment_status: {e}")
        return {
            "success": False,
            "error": str(e),
            "transaction_uid": transaction_uid
        }


def sync_all_payments(limit: int = 100) -> Dict:
    """Sync all pending payments with Optimus Provider"""
    try:
        service = OptimusPaymentService()
        return service.sync_all_payments(limit)
    except Exception as e:
        logger.error(f"Error in sync_all_payments: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def get_payment_dashboard_data() -> Dict:
    """Get comprehensive payment dashboard data"""
    try:
        service = OptimusPaymentService()
        return service.get_payment_dashboard_data()
    except Exception as e:
        logger.error(f"Error in get_payment_dashboard_data: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def manually_update_pending_transactions(days_old: int = 7) -> Dict:
    """Manually update old pending transactions to completed status"""
    try:
        service = OptimusPaymentService()
        return service.manually_update_pending_transactions(days_old)
    except Exception as e:
        logger.error(f"Error in manually_update_pending_transactions: {e}")
        return {
            "success": False,
            "error": str(e)
        }