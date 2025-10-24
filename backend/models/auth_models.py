"""
Authentication Models
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class User:
    id: Optional[int] = None
    email: str = ""
    username: str = ""
    password_hash: str = ""
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login: Optional[str] = None


@dataclass
class UserSession:
    id: Optional[int] = None
    user_id: int = 0
    token: str = ""
    refresh_token: Optional[str] = None
    expires_at: str = ""
    created_at: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class UserQuota:
    id: Optional[int] = None
    user_id: int = 0
    monthly_barcode_limit: int = 1000
    barcodes_generated_this_month: int = 0
    month_start_date: Optional[str] = None
    updated_at: Optional[str] = None
