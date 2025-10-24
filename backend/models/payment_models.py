"""
Payment and Subscription Models (SQLite)
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class SubscriptionPlan:
    id: Optional[int] = None
    name: str = ""
    description: Optional[str] = None
    price_ugx: int = 50000
    duration_months: int = 1
    features: Optional[str] = None  # JSON string
    is_active: bool = True
    created_at: Optional[str] = None


@dataclass
class UserSubscription:
    id: Optional[int] = None
    user_id: int = 1  # Default mock user
    plan_id: int = 1
    status: str = "pending"  # pending, active, cancelled, expired
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_renew: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PaymentTransaction:
    id: Optional[int] = None
    user_id: int = 1  # Default mock user
    subscription_id: Optional[int] = None
    transaction_uid: str = ""
    optimus_transaction_id: Optional[str] = None
    amount_ugx: int = 0
    currency: str = "UGX"
    payment_method: str = "mobile_money"
    status: str = "pending"  # pending, completed, failed, cancelled
    payment_url: Optional[str] = None
    callback_data: Optional[str] = None  # JSON string
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PaymentWebhook:
    id: Optional[int] = None
    transaction_uid: str = ""
    webhook_data: str = ""  # JSON string
    processed: bool = False
    created_at: Optional[str] = None

