"""
Token Management API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.token_service import TokenService
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/tokens", tags=["tokens"])
token_service = TokenService()


# ==================== Request/Response Models ====================

class TokenPurchaseRequest(BaseModel):
    amount_ugx: int = Field(..., gt=0, description="Amount in UGX")
    provider: str = Field(..., description="Payment provider (MTN, AIRTEL, MPESA)")
    phone: str = Field(..., description="Phone number for payment")


class TokenPurchaseResponse(BaseModel):
    success: bool
    transaction_uid: Optional[str] = None
    tokens_purchased: Optional[int] = None
    amount_ugx: Optional[int] = None
    payment_url: Optional[str] = None
    payment_instructions: Optional[dict] = None
    error: Optional[str] = None
    message: Optional[str] = None


class TokenBalanceResponse(BaseModel):
    user_id: int
    balance: int
    total_purchased: int
    total_used: int
    created_at: str
    updated_at: str


class TokenHistoryResponse(BaseModel):
    history: List[dict]
    total: int


class PricingInfoResponse(BaseModel):
    token_price_ugx: int
    welcome_bonus: int
    min_purchase: int
    max_purchase: int
    tokens_never_expire: bool
    discount_tiers: List[dict]
    packages: List[dict]


class TokenCheckRequest(BaseModel):
    tokens_needed: int = Field(..., gt=0, description="Number of tokens needed")
    operation: str = Field(..., description="Operation description")


class TokenCheckResponse(BaseModel):
    success: bool
    has_sufficient: bool
    tokens_needed: int
    tokens_available: int
    tokens_missing: Optional[int] = None
    cost_ugx: Optional[int] = None
    tokens_remaining: Optional[int] = None


# ==================== Public Endpoints ====================

@router.get("/pricing", response_model=PricingInfoResponse)
async def get_pricing_info():
    """Get current token pricing and package information"""
    try:
        pricing = token_service.get_pricing_info()
        return pricing
    except Exception as e:
        logger.error(f"Error getting pricing info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve pricing information"
        )


@router.get("/packages")
async def get_token_packages():
    """Get predefined token packages with pricing"""
    try:
        packages = token_service.get_token_packages()
        return {"packages": packages}
    except Exception as e:
        logger.error(f"Error getting token packages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve token packages"
        )


# ==================== User Endpoints (Authenticated) ====================

@router.get("/balance", response_model=TokenBalanceResponse)
async def get_token_balance(
    current_user: dict = Depends(get_current_user)
):
    """Get user's current token balance"""
    try:
        account = token_service.get_token_account(current_user['user_id'])
        
        if not account:
            # Create account with welcome bonus
            welcome_bonus = token_service.get_setting('welcome_bonus_tokens', 10)
            token_service.create_token_account(current_user['user_id'], welcome_bonus)
            account = token_service.get_token_account(current_user['user_id'])
        
        return account
    except Exception as e:
        logger.error(f"Error getting token balance for user {current_user['user_id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve token balance"
        )


@router.post("/purchase", response_model=TokenPurchaseResponse)
async def purchase_tokens(
    request: TokenPurchaseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Purchase tokens via mobile money"""
    try:
        logger.info(f"Token purchase request from user {current_user['user_id']}: {request.dict()}")
        
        result = token_service.purchase_tokens(
            user_id=current_user['user_id'],
            amount_ugx=request.amount_ugx,
            provider=request.provider,
            phone=request.phone
        )
        
        if not result.get('success'):
            logger.warning(f"Token purchase failed: {result}")
            return TokenPurchaseResponse(**result)
        
        logger.info(f"Token purchase initiated successfully: {result.get('transaction_uid')}")
        return TokenPurchaseResponse(**result)
        
    except Exception as e:
        logger.error(f"Error processing token purchase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process token purchase: {str(e)}"
        )


@router.post("/check", response_model=TokenCheckResponse)
async def check_tokens(
    request: TokenCheckRequest,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has sufficient tokens for an operation"""
    try:
        balance = token_service.get_balance(current_user['user_id'])
        has_sufficient = balance >= request.tokens_needed
        
        response_data = {
            "success": True,
            "has_sufficient": has_sufficient,
            "tokens_needed": request.tokens_needed,
            "tokens_available": balance
        }
        
        if not has_sufficient:
            missing = request.tokens_needed - balance
            response_data["tokens_missing"] = missing
            response_data["cost_ugx"] = token_service.calculate_amount_from_tokens(missing)
        else:
            response_data["tokens_remaining"] = balance - request.tokens_needed
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error checking tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check token balance"
        )


@router.post("/use")
async def use_tokens(
    request: TokenCheckRequest,
    current_user: dict = Depends(get_current_user)
):
    """Use tokens for an operation"""
    try:
        result = token_service.check_and_use_tokens(
            user_id=current_user['user_id'],
            tokens_needed=request.tokens_needed,
            operation=request.operation
        )
        
        if not result['success']:
            if result.get('error') == 'insufficient_tokens':
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=result
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('message', 'Failed to use tokens')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error using tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to use tokens"
        )


@router.get("/history/purchases", response_model=TokenHistoryResponse)
async def get_purchase_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get user's token purchase history"""
    try:
        history = token_service.get_purchase_history(current_user['user_id'], limit)
        return {
            "history": history,
            "total": len(history)
        }
    except Exception as e:
        logger.error(f"Error getting purchase history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve purchase history"
        )


@router.get("/history/usage", response_model=TokenHistoryResponse)
async def get_usage_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get user's token usage history"""
    try:
        history = token_service.get_usage_history(current_user['user_id'], limit)
        return {
            "history": history,
            "total": len(history)
        }
    except Exception as e:
        logger.error(f"Error getting usage history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage history"
        )


@router.get("/history", response_model=TokenHistoryResponse)
async def get_combined_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get combined token purchase and usage history"""
    try:
        history = token_service.get_combined_history(current_user['user_id'], limit)
        return {
            "history": history,
            "total": len(history)
        }
    except Exception as e:
        logger.error(f"Error getting combined history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history"
        )


# ==================== Admin Endpoints ====================

@router.get("/admin/settings")
async def get_all_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get all token settings (Admin only)"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        settings = token_service.get_all_settings()
        return {"settings": settings}
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings"
        )


class UpdateSettingRequest(BaseModel):
    key: str
    value: str


@router.post("/admin/settings")
async def update_setting(
    request: UpdateSettingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a token setting (Admin only)"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        success = token_service.set_setting(
            key=request.key,
            value=request.value,
            updated_by=current_user['user_id']
        )
        
        if success:
            return {"success": True, "message": f"Setting {request.key} updated"}
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update setting"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update setting"
        )


@router.post("/admin/grant")
async def grant_tokens(
    user_id: int,
    tokens: int,
    reason: str = "Admin grant",
    current_user: dict = Depends(get_current_user)
):
    """Grant tokens to a user (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        transaction_uid = f"ADMIN_GRANT_{current_user['user_id']}_{user_id}_{tokens}"
        success = token_service.add_tokens(user_id, tokens, transaction_uid)
        
        if success:
            return {
                "success": True,
                "message": f"Granted {tokens} tokens to user {user_id}",
                "reason": reason
            }
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to grant tokens"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error granting tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to grant tokens"
        )


@router.get("/admin/payment-settings")
async def get_payment_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get payment API settings (Admin only)"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Get payment-related settings
        payment_settings = {}
        settings_keys = [
            'payment_api_environment',
            'payment_production_auth_token',
            'payment_webhook_url'
        ]
        
        for key in settings_keys:
            value = token_service.get_setting(key, '')
            payment_settings[key] = value
        
        return {
            "success": True,
            "settings": payment_settings
        }
        
    except Exception as e:
        logger.error(f"Error getting payment settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment settings"
        )


class PaymentSettingsRequest(BaseModel):
    payment_api_environment: str = Field(..., description="Payment API environment: sandbox or production")
    payment_production_auth_token: Optional[str] = Field(None, description="Production auth token")
    payment_webhook_url: Optional[str] = Field(None, description="Webhook URL for callbacks")


@router.post("/admin/payment-settings")
async def update_payment_settings(
    request: PaymentSettingsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update payment API settings (Admin only)"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Validate environment
        if request.payment_api_environment not in ['sandbox', 'production']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid environment. Must be 'sandbox' or 'production'"
            )
        
        # Update settings
        settings_to_update = {
            'payment_api_environment': request.payment_api_environment,
            'payment_production_auth_token': request.payment_production_auth_token or '',
            'payment_webhook_url': request.payment_webhook_url or ''
        }
        
        for key, value in settings_to_update.items():
            token_service.set_setting(key, value, current_user['user_id'])
        
        # Update payment service environment
        from services.payment_service import OptimusPaymentService
        payment_service = OptimusPaymentService()
        payment_service.set_environment(request.payment_api_environment)
        
        logger.info(f"Payment settings updated by admin {current_user['user_id']}: {request.dict()}")
        
        return {
            "success": True,
            "message": "Payment settings updated successfully",
            "settings": settings_to_update
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update payment settings"
        )


# ==================== Collections Settings Endpoints ====================

class CollectionsSettingsRequest(BaseModel):
    collections_api_url: str
    collections_api_key: str


class TokenSettingsRequest(BaseModel):
    welcome_bonus_tokens: int
    token_price_ugx: int
    min_purchase_tokens: int
    max_purchase_tokens: int


@router.get("/admin/collections-settings")
async def get_collections_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get collections API settings (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        # Get collections-related settings
        collections_settings = {}
        settings_keys = [
            'collections_api_url',
            'collections_api_key'
        ]
        
        for key in settings_keys:
            value = token_service.get_setting(key)
            collections_settings[key] = value
        
        return {
            "success": True,
            "settings": collections_settings
        }
        
    except Exception as e:
        logger.error(f"Error getting collections settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get collections settings"
        )


@router.post("/admin/collections-settings")
async def update_collections_settings(
    request: CollectionsSettingsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update collections API settings (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        # Validate URL format
        if request.collections_api_url and not request.collections_api_url.startswith('http'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Collections API URL must start with http:// or https://"
            )
        
        # Update settings
        settings_to_update = {
            'collections_api_url': request.collections_api_url,
            'collections_api_key': request.collections_api_key
        }
        
        for key, value in settings_to_update.items():
            token_service.set_setting(key, value, current_user['user_id'])
            logger.info(f"Setting updated: {key} = {value[:20]}... by user {current_user['user_id']}")
        
        logger.info(f"Collections settings updated by super admin {current_user['user_id']}: {settings_to_update}")
        
        return {
            "success": True,
            "message": "Collections settings updated successfully",
            "settings": settings_to_update
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating collections settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update collections settings"
        )


# ==================== Token Settings Endpoints ====================

@router.get("/admin/token-settings")
async def get_token_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get token settings (Admin only)"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Get token-related settings
        token_settings = {}
        settings_keys = [
            'welcome_bonus_tokens',
            'token_price_ugx',
            'min_purchase_tokens',
            'max_purchase_tokens'
        ]
        
        for key in settings_keys:
            value = token_service.get_setting(key)
            # Convert to int for numeric settings
            if key in ['welcome_bonus_tokens', 'token_price_ugx', 'min_purchase_tokens', 'max_purchase_tokens']:
                token_settings[key] = int(value) if isinstance(value, str) and value.isdigit() else (int(value) if isinstance(value, int) else 0)
            else:
                token_settings[key] = value
        
        return {
            "success": True,
            "settings": token_settings
        }
        
    except Exception as e:
        logger.error(f"Error getting token settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get token settings"
        )


@router.post("/admin/token-settings")
async def update_token_settings(
    request: TokenSettingsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update token settings (Admin only)"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # Validate values
        if request.welcome_bonus_tokens < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Welcome bonus tokens cannot be negative"
            )
        
        if request.token_price_ugx <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token price must be greater than 0"
            )
        
        if request.min_purchase_tokens <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum purchase tokens must be greater than 0"
            )
        
        if request.max_purchase_tokens <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum purchase tokens must be greater than 0"
            )
        
        if request.min_purchase_tokens > request.max_purchase_tokens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum purchase cannot be greater than maximum purchase"
            )
        
        # Update settings
        settings_to_update = {
            'welcome_bonus_tokens': str(request.welcome_bonus_tokens),
            'token_price_ugx': str(request.token_price_ugx),
            'min_purchase_tokens': str(request.min_purchase_tokens),
            'max_purchase_tokens': str(request.max_purchase_tokens)
        }
        
        for key, value in settings_to_update.items():
            token_service.set_setting(key, value, current_user['user_id'])
            logger.info(f"Setting updated: {key} = {value} by user {current_user['user_id']}")
        
        logger.info(f"Token settings updated by admin {current_user['user_id']}: {request.dict()}")
        
        return {
            "success": True,
            "message": "Token settings updated successfully",
            "settings": settings_to_update
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating token settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update token settings"
        )


# ==================== Admin Token Purchases Dashboard ====================

@router.get("/admin/purchases")
async def get_all_token_purchases(
    limit: int = Query(50, ge=1, le=200, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    status: Optional[str] = Query(None, description="Filter by status (pending, completed, failed)"),
    current_user: dict = Depends(get_current_user)
):
    """Get all token purchases for admin dashboard (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        purchases = token_service.get_all_token_purchases(limit, offset, status)
        
        # Get summary statistics
        stats = token_service.get_purchase_statistics()
        
        return {
            "success": True,
            "purchases": purchases,
            "total_count": len(purchases),
            "statistics": stats
        }
    except Exception as e:
        logger.error(f"Error getting all token purchases: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve token purchases"
        )


# ==================== Webhook Endpoint ====================

@router.post("/webhook/payment-complete")
async def payment_webhook(data: dict):
    """Webhook to receive payment completion notifications"""
    try:
        logger.info(f"Token payment webhook received: {data}")
        
        transaction_uid = data.get('transaction_uid') or data.get('app_transaction_uid')
        status_value = data.get('status')
        
        if not transaction_uid:
            logger.error("No transaction_uid in webhook data")
            return {"success": False, "error": "Missing transaction_uid"}
        
        if status_value == 'completed' or status_value == 'success':
            success = token_service.complete_purchase(transaction_uid)
            
            if success:
                logger.info(f"Token purchase completed via webhook: {transaction_uid}")
                return {"success": True, "message": "Tokens added successfully"}
            
            logger.error(f"Failed to complete token purchase: {transaction_uid}")
            return {"success": False, "error": "Failed to complete purchase"}
        
        logger.info(f"Payment status not completed: {status_value}")
        return {"success": False, "status": status_value}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return {"success": False, "error": str(e)}


# ==================== Token Verification Endpoint ====================

@router.get("/verify-transaction/{transaction_uid}")
async def verify_transaction_status(
    transaction_uid: str,
    current_user: dict = Depends(get_current_user)
):
    """Verify a specific transaction with Collections API and credit tokens if confirmed"""
    try:
        logger.info(f"Verifying transaction: {transaction_uid}")
        from services.collections_service import OptimusCollectionsService
        from services.token_service import TokenService
        
        collections_service = OptimusCollectionsService()
        token_service = TokenService()
        
        # Query Collections API
        logger.info(f"Querying Collections API for transaction: {transaction_uid}")
        result = collections_service.get_transaction_by_uid(transaction_uid)
        logger.info(f"Collections API result: {result}")
        
        if result.get('success') and result.get('found'):
            transaction = result['transaction']
            status = transaction.get('status')
            logger.info(f"Transaction found in Collections with status: {status}")
            
            # If completed, credit tokens
            if status in ['completed', 'success']:
                logger.info(f"Transaction confirmed (status: {status}), crediting tokens...")
                success = token_service.complete_purchase(transaction_uid)
                logger.info(f"Token crediting result: {success}")
                
                return {
                    "success": True,
                    "confirmed": True,
                    "status": status,
                    "tokens_credited": success,
                    "message": "Transaction confirmed and tokens credited" if success else "Transaction confirmed but failed to credit tokens"
                }
            else:
                logger.info(f"Transaction not yet confirmed (status: {status})")
                return {
                    "success": True,
                    "confirmed": False,
                    "status": status,
                    "message": f"Payment status: {status}"
                }
        else:
            logger.info(f"Transaction not found in Collections API or API error")
            
            # Check if transaction is already completed in our database
            # If it is, assume Collections confirmed it and try to credit
            db_status = token_service._get_purchase_status(transaction_uid)
            if db_status == 'completed':
                logger.info(f"Transaction already marked completed in DB, crediting tokens...")
                success = token_service.complete_purchase(transaction_uid)
                logger.info(f"Token crediting result: {success}")
                
                return {
                    "success": True,
                    "confirmed": success,
                    "found_in_collections": False,
                    "tokens_credited": success,
                    "message": "Transaction completed in database, tokens credited" if success else "Failed to credit tokens"
                }
            
            return {
                "success": True,
                "confirmed": False,
                "found": False,
                "message": "Transaction not yet found in Collections API"
            }
            
    except Exception as e:
        logger.error(f"Error verifying transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying transaction: {str(e)}"
        )

@router.post("/admin/verify-pending-purchases")
async def verify_pending_purchases(
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger verification of pending token purchases"""
    # Check if user is admin
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        from services.token_verification_service import TokenVerificationService
        verification_service = TokenVerificationService()
        
        results = verification_service.verify_and_credit_pending_purchases()
        
        return {
            "success": True,
            "message": "Verification completed",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error in verify_pending_purchases: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )

