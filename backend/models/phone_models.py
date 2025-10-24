from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PhoneBrandBase(BaseModel):
    name: str = Field(..., description="Brand name (e.g., Samsung, Tecno)")
    icon: str = Field(default="📱", description="Brand icon/emoji")
    description: Optional[str] = Field(None, description="Brand description")
    country_origin: Optional[str] = Field(None, description="Country of origin")
    market_share_uganda: Optional[float] = Field(None, description="Market share in Uganda (%)")

class PhoneBrandCreateRequest(PhoneBrandBase):
    pass

class PhoneBrandUpdateRequest(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    country_origin: Optional[str] = None
    market_share_uganda: Optional[float] = None
    is_active: Optional[bool] = None

class PhoneBrand(PhoneBrandBase):
    id: int
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PhoneModelBase(BaseModel):
    brand_id: int = Field(..., description="ID of the phone brand")
    model_name: str = Field(..., description="Model name (e.g., Galaxy S25)")
    model_code: str = Field(..., description="Model code (e.g., SM-S925)")
    device_type: str = Field(default="phone", description="Device type")
    price_range: str = Field(default="budget", description="Price range: budget, mid-range, premium")
    screen_size: Optional[str] = Field(None, description="Screen size (e.g., 6.1 inch)")
    battery_capacity: Optional[str] = Field(None, description="Battery capacity (e.g., 4000mAh)")
    storage_options: Optional[str] = Field(None, description="Storage options (JSON string)")
    color_options: Optional[str] = Field(None, description="Color options (JSON string)")
    release_year: Optional[int] = Field(None, description="Release year")
    is_popular_uganda: bool = Field(default=False, description="Is popular in Uganda")

class PhoneModelCreateRequest(PhoneModelBase):
    pass

class PhoneModelUpdateRequest(BaseModel):
    brand_id: Optional[int] = None
    model_name: Optional[str] = None
    model_code: Optional[str] = None
    device_type: Optional[str] = None
    price_range: Optional[str] = None
    screen_size: Optional[str] = None
    battery_capacity: Optional[str] = None
    storage_options: Optional[str] = None
    color_options: Optional[str] = None
    release_year: Optional[int] = None
    is_popular_uganda: Optional[bool] = None
    is_active: Optional[bool] = None

class PhoneModel(PhoneModelBase):
    id: int
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PhoneBrandResponse(BaseModel):
    success: bool
    brand: PhoneBrand
    timestamp: str

class PhoneBrandListResponse(BaseModel):
    success: bool
    brands: List[PhoneBrand]
    total_count: int
    timestamp: str

class PhoneModelResponse(BaseModel):
    success: bool
    model: PhoneModel
    brand: Optional[PhoneBrand] = None
    timestamp: str

class PhoneModelListResponse(BaseModel):
    success: bool
    models: List[PhoneModel]
    brand: Optional[PhoneBrand] = None
    total_count: int
    timestamp: str

class ScalableDeviceSelectorResponse(BaseModel):
    success: bool
    brands: List[PhoneBrand]
    popular_models: List[PhoneModel]
    timestamp: str
