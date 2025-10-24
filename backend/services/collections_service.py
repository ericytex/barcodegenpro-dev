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
                
                # Save to database for caching
                self._save_collections_to_db(processed_data.get('collections', []))
                
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
        collections = data.get('collections', [])
        processed_collections = []
        
        total_amount = 0
        status_counts = {}
        
        for collection in collections:
            # Enhance collection data
            processed_collection = {
                "id": collection.get('id'),
                "transaction_uid": collection.get('transaction_uid'),
                "amount": collection.get('amount', 0),
                "currency": collection.get('currency', 'UGX'),
                "status": collection.get('status'),
                "provider": collection.get('provider'),
                "phone": collection.get('phone'),
                "created_at": collection.get('created_at'),
                "completed_at": collection.get('completed_at'),
                "description": collection.get('description', ''),
                "reference": collection.get('reference', ''),
                "formatted_amount": f"{collection.get('amount', 0):,} {collection.get('currency', 'UGX')}",
                "status_badge": self._get_status_badge(collection.get('status')),
                "provider_badge": self._get_provider_badge(collection.get('provider'))
            }
            
            processed_collections.append(processed_collection)
            
            # Calculate statistics
            if collection.get('amount'):
                total_amount += collection.get('amount', 0)
            
            status = collection.get('status', 'unknown')
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
        status_config = {
            'completed': {'color': 'green', 'text': 'Completed'},
            'pending': {'color': 'yellow', 'text': 'Pending'},
            'failed': {'color': 'red', 'text': 'Failed'},
            'cancelled': {'color': 'gray', 'text': 'Cancelled'}
        }
        return status_config.get(status, {'color': 'gray', 'text': status.title()})
    
    def _get_provider_badge(self, provider: str) -> Dict[str, str]:
        """Get provider badge styling"""
        provider_config = {
            'MTN': {'color': 'yellow', 'text': 'MTN'},
            'AIRTEL': {'color': 'red', 'text': 'AIRTEL'},
            'MPESA': {'color': 'green', 'text': 'MPESA'}
        }
        return provider_config.get(provider, {'color': 'blue', 'text': provider})
    
    def _save_collections_to_db(self, collections: List[Dict[str, Any]]):
        """Save collections to database for caching"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create collections cache table if not exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS optimus_collections_cache (
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
                        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Insert or update collections
                for collection in collections:
                    cursor.execute("""
                        INSERT OR REPLACE INTO optimus_collections_cache (
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
                    SELECT * FROM optimus_collections_cache 
                    ORDER BY cached_at DESC 
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
                    FROM optimus_collections_cache 
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
                    FROM optimus_collections_cache 
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
