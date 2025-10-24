"""
Device Management Models for Barcode Generator API
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class DeviceType(str, Enum):
    """Device type enumeration"""
    PHONE = "phone"
    TABLET = "tablet"
    LAPTOP = "laptop"
    WATCH = "watch"
    HEADPHONES = "headphones"
    SPEAKER = "speaker"
    CAMERA = "camera"
    GAMING_CONSOLE = "gaming_console"
    SMART_TV = "smart_tv"
    ROUTER = "router"
    OTHER = "other"


class DeviceModel(BaseModel):
    """Device model for database storage"""
    id: Optional[int] = None
    name: str = Field(..., description="Device name (e.g., 'iPhone 15 Pro')")
    brand: str = Field(..., description="Device brand (e.g., 'Apple', 'Samsung')")
    model_code: str = Field(..., description="Model code (e.g., 'A3102', 'SM-G998B')")
    device_type: DeviceType = Field(..., description="Type of device")
    default_dn: str = Field(default="M8N7", description="Default D/N number")
    description: Optional[str] = Field(None, description="Device description")
    specifications: Optional[dict] = Field(None, description="Device specifications")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = Field(default=True, description="Whether device is active")


class DeviceCreateRequest(BaseModel):
    """Request model for creating a new device"""
    name: str = Field(..., min_length=1, max_length=100, description="Device name")
    brand: str = Field(..., min_length=1, max_length=50, description="Device brand")
    model_code: str = Field(..., min_length=1, max_length=50, description="Model code")
    device_type: DeviceType = Field(..., description="Type of device")
    default_dn: str = Field(default="M8N7", description="Default D/N number")
    description: Optional[str] = Field(None, max_length=500, description="Device description")
    specifications: Optional[dict] = Field(None, description="Device specifications")


class DeviceUpdateRequest(BaseModel):
    """Request model for updating a device"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Device name")
    brand: Optional[str] = Field(None, min_length=1, max_length=50, description="Device brand")
    model_code: Optional[str] = Field(None, min_length=1, max_length=50, description="Model code")
    device_type: Optional[DeviceType] = Field(None, description="Type of device")
    default_dn: Optional[str] = Field(None, description="Default D/N number")
    description: Optional[str] = Field(None, max_length=500, description="Device description")
    specifications: Optional[dict] = Field(None, description="Device specifications")
    is_active: Optional[bool] = Field(None, description="Whether device is active")


class DeviceResponse(BaseModel):
    """Response model for device operations"""
    success: bool
    message: str
    device: Optional[DeviceModel] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class DeviceListResponse(BaseModel):
    """Response model for listing devices"""
    success: bool
    devices: List[DeviceModel] = Field(default_factory=list)
    total_count: int
    timestamp: datetime = Field(default_factory=datetime.now)


class DeviceTypeInfo(BaseModel):
    """Device type information"""
    type: DeviceType
    display_name: str
    description: str
    icon: str


class DeviceTypeListResponse(BaseModel):
    """Response model for device types"""
    success: bool
    device_types: List[DeviceTypeInfo] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)
