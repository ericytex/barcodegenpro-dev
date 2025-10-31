"""
Token Verification Service
Monitors pending token purchases and verifies them against Collections API
"""
import logging
from typing import Dict, List
import sqlite3
from services.collections_service import OptimusCollectionsService
from services.token_service import TokenService

logger = logging.getLogger(__name__)

class TokenVerificationService:
    def __init__(self, db_path: str = "data/barcode_generator.db"):
        self.db_path = db_path
        self.collections_service = OptimusCollectionsService(db_path)
        self.token_service = TokenService(db_path)
    
    def verify_and_credit_pending_purchases(self) -> Dict:
        """Verify all pending token purchases against Collections API"""
        # Get all pending purchases from last 7 days
        pending_purchases = self._get_pending_purchases()
        
        results = {
            "total_checked": len(pending_purchases),
            "credited": 0,
            "still_pending": 0,
            "failed": 0,
            "errors": []
        }
        
        for purchase in pending_purchases:
            try:
                logger.info(f"Checking transaction: {purchase['transaction_uid']} for user {purchase['user_id']}")
                # Query Collections API
                result = self.collections_service.get_transaction_by_uid(
                    purchase['transaction_uid']
                )
                
                logger.info(f"Collections API result for {purchase['transaction_uid']}: {result}")
                
                if result.get('success') and result.get('found'):
                    transaction = result['transaction']
                    status = transaction.get('status')
                    
                    logger.info(f"Found transaction {purchase['transaction_uid']} with status: {status}")
                    
                    # If completed, credit tokens
                    if status in ['completed', 'success']:
                        logger.info(f"Payment confirmed for {purchase['transaction_uid']}, crediting {purchase['tokens_purchased']} tokens...")
                        success = self.token_service.complete_purchase(
                            purchase['transaction_uid']
                        )
                        
                        if success:
                            results['credited'] += 1
                            logger.info(f"✅ Credited {purchase['tokens_purchased']} tokens to user {purchase['user_id']}")
                        else:
                            results['failed'] += 1
                            logger.error(f"❌ Failed to credit tokens for {purchase['transaction_uid']}")
                    else:
                        results['still_pending'] += 1
                        logger.debug(f"Transaction {purchase['transaction_uid']} still pending (status: {status})")
                else:
                    results['still_pending'] += 1
                    logger.debug(f"Transaction {purchase['transaction_uid']} not yet in Collections API")
                    
            except Exception as e:
                logger.error(f"Error verifying purchase {purchase['transaction_uid']}: {e}")
                results['errors'].append(str(e))
                results['failed'] += 1
        
        return results
    
    def _get_pending_purchases(self, days: int = 7) -> List[Dict]:
        """Get pending purchases from last N days"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, transaction_uid, tokens_purchased, 
                       amount_ugx, status, created_at
                FROM token_purchases
                WHERE status = 'pending'
                  AND created_at >= datetime('now', '-' || ? || ' days')
                ORDER BY created_at DESC
            """, (days,))
            return [dict(row) for row in cursor.fetchall()]


