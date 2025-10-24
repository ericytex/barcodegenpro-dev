"""
Payment and Subscription API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from services.payment_service import SubscriptionService
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])
subscription_service = SubscriptionService()

# Pydantic models for request/response
class SubscribeRequest(BaseModel):
    plan_id: int = Field(..., description="ID of the subscription plan")
    phone: str = Field(..., description="Mobile money phone number (e.g., +256700000000)")
    provider: str = Field(default="MTN", description="Mobile money provider (MPESA, MTN, AIRTEL)")

class PaymentCallback(BaseModel):
    transaction_uid: str
    status: str
    data: dict

class SubscriptionStatusResponse(BaseModel):
    has_subscription: bool
    status: str
    plan: Optional[str] = None
    end_date: Optional[str] = None

class SubscriptionPlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price_ugx: int
    duration_months: int
    features: List[str]

class SubscribeResponse(BaseModel):
    message: str
    payment_url: str
    transaction_uid: str
    amount_ugx: int
    amount_kes: int

# Import real authentication
from routes.auth import get_current_user as get_authenticated_user

# Wrapper to match expected format
async def get_current_user(user_data: dict = Depends(get_authenticated_user)):
    """Get current authenticated user"""
    return {
        "id": user_data['user_id'],
        "email": user_data['email'],
        "username": user_data.get('username', ''),
        "is_admin": user_data.get('is_admin', False)
    }

@router.post("/subscribe", response_model=SubscribeResponse)
async def create_subscription(
    request: SubscribeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new subscription and payment request"""
    try:
        # Console log incoming request
        logger.info("="*70)
        logger.info("PAYMENT SUBSCRIPTION REQUEST")
        logger.info("="*70)
        logger.info(f"👤 User ID: {current_user['id']}")
        logger.info(f"👤 Username: {current_user.get('username', 'N/A')}")
        logger.info(f"📧 Email: {current_user.get('email', 'N/A')}")
        logger.info(f"💳 Plan ID: {request.plan_id}")
        logger.info(f"📱 Phone: {request.phone}")
        logger.info(f"🏢 Provider: {request.provider}")
        logger.info("="*70)

        result = subscription_service.create_subscription(
            user_id=current_user['id'],
            plan_id=request.plan_id,
            phone=request.phone,
            provider=request.provider
        )
        
        if result['success']:
            return SubscribeResponse(
                message="Subscription created successfully",
                payment_url=result['payment_url'],
                transaction_uid=result['transaction_uid'],
                amount_ugx=result['amount_ugx'],
                amount_kes=result['amount_kes']
            )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
        
    except Exception as e:
        logger.error(f"Subscription creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: dict = Depends(get_current_user)
):
    """Get user's current subscription status"""
    try:
        status_data = subscription_service.check_subscription_status(current_user['id'])
        return SubscriptionStatusResponse(**status_data)
    except Exception as e:
        logger.error(f"Failed to get subscription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subscription status"
        )

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        plans = subscription_service.get_available_plans()
        return [SubscriptionPlanResponse(**plan) for plan in plans]
    except Exception as e:
        logger.error(f"Failed to get subscription plans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subscription plans"
        )

@router.post("/webhook")
async def payment_webhook(
    callback: PaymentCallback
):
    """Handle payment webhook from Optimus"""
    try:
        # Log webhook
        subscription_service.log_webhook(callback.transaction_uid, callback.data)
        
        # Process payment
        if callback.status == "completed":
            success = subscription_service.activate_subscription(callback.transaction_uid)
            if success:
                logger.info(f"Payment webhook processed successfully: {callback.transaction_uid}")
                return {"status": "processed", "message": "Payment completed"}
            else:
                logger.error(f"Failed to activate subscription: {callback.transaction_uid}")
                return {"status": "error", "message": "Failed to activate subscription"}
        
        return {"status": "received", "message": "Webhook received"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )

@router.post("/test-payment")
async def test_payment_completion(
    transaction_uid: str
):
    """Test endpoint to manually complete a payment (for testing)"""
    try:
        success = subscription_service.activate_subscription(transaction_uid)
        if success:
            return {"status": "success", "message": "Payment completed successfully"}
        else:
            return {"status": "error", "message": "Failed to complete payment"}
    except Exception as e:
        logger.error(f"Test payment completion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Test payment completion failed"
        )

@router.get("/transactions")
async def get_user_transactions(
    current_user: dict = Depends(get_current_user)
):
    """Get user's payment transaction history"""
    try:
        transactions = subscription_service.get_user_transactions(current_user['id'])
        return transactions
    except Exception as e:
        logger.error(f"Failed to get transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get transactions"
        )

