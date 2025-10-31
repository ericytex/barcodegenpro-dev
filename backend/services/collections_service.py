"""
Optimus Collections Monitoring Service
"""
import requests
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class OptimusCollectionsService:
    def __init__(self, db_path: str = "data/barcode_generator.db"):
        self.db_path = db_path
        self.base_url = "https://optimus.santripe.com/transactions/mobile-money-collections"
        self.api_key = "pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i"  # Will be loaded from settings
        self.environment = "production"  # Default to production
        self._load_api_key()
    
    def _load_api_key(self):
        """Load Optimus API key from database settings"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT setting_value FROM token_settings 
                    WHERE setting_key = 'optimus_collections_api_key'
                """)
                result = cursor.fetchone()
                if result and result[0]:
                    self.api_key = result[0]
                    logger.info("Optimus collections API key loaded from settings")
                else:
                    # Use default production API key
                    self.api_key = "pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i"
                    logger.info("Using default production collections API key")
        except Exception as e:
            logger.error(f"Error loading Optimus API key: {e}")
            # Fallback to default key
            self.api_key = "pki_7ve43chhGjdjjBag49ZNqJ6AZ3e29CGgq9494399pxfw7AdjsMqx9ZFma84993i"
    
    def set_api_key(self, api_key: str):
        """Set Optimus API key"""
        self.api_key = api_key
        logger.info("Optimus collections API key updated")
    
    def get_collections(self, limit: int = 100, offset: int = 0, 
                       start_date: Optional[str] = None, 
                       end_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get mobile money collections from Optimus
        
        Args:
            limit: Number of records to return (max 100)
            offset: Number of records to skip
            start_date: Start date filter (YYYY-MM-DD)
            end_date: End date filter (YYYY-MM-DD)
        """
        if not self.api_key:
            return {
                "success": False,
                "error": "API key not configured",
                "message": "Please configure Optimus collections API key in settings"
            }
        
        try:
            # Build URL with API key
            url = f"{self.base_url}/{self.api_key}"
            
            # Build query parameters
            params = {
                "limit": min(limit, 100),  # Optimus max limit
                "offset": offset
            }
            
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
            
            # Make request
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Process and enhance the data
                processed_data = self._process_collections_data(data)
                
                # Save to database for caching (handles incremental addition)
                collections_to_save = processed_data.get('collections', [])
                logger.info(f"Processing {len(collections_to_save)} collections from API response")
                if collections_to_save:
                    self._save_collections_to_db(collections_to_save)
                
                return {
                    "success": True,
                    "data": processed_data,
                    "total_count": processed_data.get('total_count', 0),
                    "fetched_at": datetime.now().isoformat()
                }
            else:
                logger.error(f"Optimus API error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"API error: {response.status_code}",
                    "message": response.text
                }
                
        except requests.exceptions.Timeout:
            logger.error("Optimus API timeout")
            return {
                "success": False,
                "error": "timeout",
                "message": "Request to Optimus API timed out"
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Optimus API request error: {e}")
            return {
                "success": False,
                "error": "request_error",
                "message": str(e)
            }
        except Exception as e:
            logger.error(f"Error fetching collections: {e}")
            return {
                "success": False,
                "error": "unknown_error",
                "message": str(e)
            }
    
    def _process_collections_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and enhance collections data"""
        # Handle Optimus API format (returns 'data' array) vs old format (collections array)
        if 'data' in data and isinstance(data['data'], list):
            collections = data['data']
            logger.info(f"Found {len(collections)} collections in Optimus API 'data' array")
        else:
            collections = data.get('collections', [])
            logger.info(f"Found {len(collections)} collections in 'collections' array")
        processed_collections = []
        
        total_amount = 0
        status_counts = {}
        
        for collection in collections:
            # Map Optimus API fields to our internal format
            # Optimus returns app_transaction_uid, transaction_status, api_referance, local_amount, etc.
            processed_collection = {
                "id": collection.get('id') or collection.get('api_referance'),
                "transaction_uid": collection.get('transaction_uid') or collection.get('app_transaction_uid'),
                "amount": int(collection.get('amount') or collection.get('local_amount') or 0),
                "currency": collection.get('currency') or collection.get('local_currency', 'UGX'),
                "status": collection.get('status') or collection.get('transaction_status'),
                "provider": collection.get('provider'),
                "phone": collection.get('phone') or collection.get('debit_phone_number'),
                "created_at": collection.get('created_at') or collection.get('transaction_date'),
                "completed_at": collection.get('completed_at'),
                "description": collection.get('description', ''),
                "reference": collection.get('reference') or collection.get('api_referance', ''),
                "formatted_amount": f"{int(collection.get('amount') or collection.get('local_amount') or 0):,} {collection.get('currency') or collection.get('local_currency', 'UGX')}",
                "status_badge": self._get_status_badge(collection.get('status') or collection.get('transaction_status')),
                "provider_badge": self._get_provider_badge(collection.get('provider'))
            }
            
            processed_collections.append(processed_collection)
            
            # Calculate statistics
            amount_value = collection.get('amount') or collection.get('local_amount', 0)
            if amount_value:
                total_amount += int(amount_value)
            
            status = collection.get('status') or collection.get('transaction_status') or 'unknown'
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "collections": processed_collections,
            "total_count": len(processed_collections),
            "total_amount": total_amount,
            "formatted_total_amount": f"{total_amount:,} UGX",
            "status_counts": status_counts,
            "summary": {
                "total_collections": len(processed_collections),
                "total_amount": total_amount,
                "successful_collections": status_counts.get('completed', 0),
                "pending_collections": status_counts.get('pending', 0),
                "failed_collections": status_counts.get('failed', 0)
            }
        }
    
    def _get_status_badge(self, status: str) -> Dict[str, str]:
        """Get status badge styling"""
        if not status:
            return {'color': 'gray', 'text': 'Unknown'}
        
        status_config = {
            'completed': {'color': 'green', 'text': 'Completed'},
            'pending': {'color': 'yellow', 'text': 'Pending'},
            'failed': {'color': 'red', 'text': 'Failed'},
            'cancelled': {'color': 'gray', 'text': 'Cancelled'}
        }
        
        if status in status_config:
            return status_config[status]
        else:
            # Return formatted status if not in config
            try:
                text = str(status).title() if status else 'Unknown'
            except:
                text = 'Unknown'
            return {'color': 'gray', 'text': text}
    
    def _get_provider_badge(self, provider: str) -> Dict[str, str]:
        """Get provider badge styling"""
        if not provider:
            return {'color': 'gray', 'text': 'Unknown'}
        
        provider_config = {
            'MTN': {'color': 'yellow', 'text': 'MTN'},
            'AIRTEL': {'color': 'red', 'text': 'AIRTEL'},
            'MPESA': {'color': 'green', 'text': 'MPESA'}
        }
        
        if provider in provider_config:
            return provider_config[provider]
        else:
            try:
                text = str(provider) if provider else 'Unknown'
            except:
                text = 'Unknown'
            return {'color': 'blue', 'text': text}
    
    def _save_collections_to_db(self, collections: List[Dict[str, Any]]):
        """Save collections to database for caching"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Insert or update collections in the collections table
                for collection in collections:
                    cursor.execute("""
                        INSERT OR REPLACE INTO collections (
                            collection_id, transaction_uid, amount, currency, status,
                            provider, phone, created_at, completed_at, description, reference
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        collection.get('id'),
                        collection.get('transaction_uid'),
                        collection.get('amount'),
                        collection.get('currency'),
                        collection.get('status'),
                        collection.get('provider'),
                        collection.get('phone'),
                        collection.get('created_at'),
                        collection.get('completed_at'),
                        collection.get('description'),
                        collection.get('reference')
                    ))
                
                conn.commit()
                logger.info(f"Cached {len(collections)} collections to database")
                
        except Exception as e:
            logger.error(f"Error saving collections to database: {e}")
    
    def get_cached_collections(self, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get collections from database cache"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM collections 
                    ORDER BY synced_at DESC 
                    LIMIT ? OFFSET ?
                """, (limit, offset))
                
                rows = cursor.fetchall()
                collections = [dict(row) for row in rows]
                
                # Calculate statistics
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_count,
                        SUM(amount) as total_amount,
                        status,
                        COUNT(*) as status_count
                    FROM collections 
                    GROUP BY status
                """)
                
                status_stats = cursor.fetchall()
                status_counts = {row['status']: row['status_count'] for row in status_stats}
                
                total_amount = sum(row['total_amount'] or 0 for row in status_stats)
                
                return {
                    "success": True,
                    "data": {
                        "collections": collections,
                        "total_count": len(collections),
                        "total_amount": total_amount,
                        "formatted_total_amount": f"{total_amount:,} UGX",
                        "status_counts": status_counts,
                        "summary": {
                            "total_collections": len(collections),
                            "total_amount": total_amount,
                            "successful_collections": status_counts.get('completed', 0),
                            "pending_collections": status_counts.get('pending', 0),
                            "failed_collections": status_counts.get('failed', 0)
                        }
                    },
                    "cached": True,
                    "fetched_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting cached collections: {e}")
            return {
                "success": False,
                "error": "cache_error",
                "message": str(e)
            }
    
    def get_collection_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get collection statistics for the last N days"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                # Get date range
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days)
                
                cursor.execute("""
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count,
                        SUM(amount) as total_amount,
                        status
                    FROM collections 
                    WHERE DATE(created_at) BETWEEN ? AND ?
                    GROUP BY DATE(created_at), status
                    ORDER BY date DESC
                """, (start_date.date(), end_date.date()))
                
                rows = cursor.fetchall()
                
                # Process daily stats
                daily_stats = {}
                for row in rows:
                    date = row['date']
                    if date not in daily_stats:
                        daily_stats[date] = {
                            'date': date,
                            'total_count': 0,
                            'total_amount': 0,
                            'completed': 0,
                            'pending': 0,
                            'failed': 0
                        }
                    
                    daily_stats[date]['total_count'] += row['count']
                    daily_stats[date]['total_amount'] += row['total_amount'] or 0
                    daily_stats[date][row['status']] = row['count']
                
                return {
                    "success": True,
                    "data": {
                        "daily_stats": list(daily_stats.values()),
                        "period_days": days,
                        "start_date": start_date.date().isoformat(),
                        "end_date": end_date.date().isoformat()
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {
                "success": False,
                "error": "stats_error",
                "message": str(e)
            }
    
    def get_transaction_by_uid_from_db(self, transaction_uid: str) -> Dict[str, Any]:
        """Query database for specific transaction by transaction_uid"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM collections 
                    WHERE transaction_uid = ?
                    ORDER BY updated_at DESC
                    LIMIT 1
                """, (transaction_uid,))
                
                row = cursor.fetchone()
                
                if row:
                    transaction = dict(row)
                    return {
                        "success": True,
                        "found": True,
                        "transaction": transaction,
                        "status": transaction.get('status'),
                        "source": "database"
                    }
                else:
                    return {
                        "success": True,
                        "found": False,
                        "source": "database"
                    }
                    
        except Exception as e:
            logger.error(f"Error querying database for transaction {transaction_uid}: {e}")
            return {"success": False, "error": str(e), "source": "database"}
    
    def get_transaction_by_uid(self, transaction_uid: str, check_db_first: bool = True) -> Dict[str, Any]:
        """Query for specific transaction - checks database first, then API if needed"""
        
        # Check database first
        if check_db_first:
            db_result = self.get_transaction_by_uid_from_db(transaction_uid)
            
            if db_result.get('found'):
                # Found in database
                logger.info(f"Transaction {transaction_uid} found in database with status: {db_result.get('status')}")
                return db_result
            
            logger.info(f"Transaction {transaction_uid} not in database, querying API...")
        
        # Not in database or check_db_first=False, query API
        try:
            # Get collections (fetch a reasonable batch to search through)
            url = f"{self.base_url}/{self.api_key}"
            params = {"limit": 100, "offset": 0}
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                collections = data.get('collections', [])
                
                # Save fetched collections to database
                if collections:
                    self._save_collections_to_db(collections)
                
                # Find transaction matching the UID
                for collection in collections:
                    if collection.get('transaction_uid') == transaction_uid:
                        return {
                            "success": True,
                            "found": True,
                            "transaction": collection,
                            "status": collection.get('status'),
                            "source": "api"
                        }
                
                # If not found in first 100, try pagination
                offset = 100
                while offset < 1000:  # Search up to 1000 records
                    params = {"limit": 100, "offset": offset}
                    response = requests.get(url, params=params, timeout=30)
                    
                    if response.status_code == 200:
                        data = response.json()
                        collections = data.get('collections', [])
                        
                        if not collections:
                            break
                        
                        # Save to database
                        self._save_collections_to_db(collections)
                        
                        for collection in collections:
                            if collection.get('transaction_uid') == transaction_uid:
                                return {
                                    "success": True,
                                    "found": True,
                                    "transaction": collection,
                                    "status": collection.get('status'),
                                    "source": "api"
                                }
                        
                        offset += 100
                    else:
                        break
                
                return {"success": True, "found": False, "source": "api"}
            else:
                logger.error(f"Optimus API error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"API error: {response.status_code}"}
        except Exception as e:
            logger.error(f"Error querying transaction {transaction_uid}: {e}")
            return {"success": False, "error": str(e)}