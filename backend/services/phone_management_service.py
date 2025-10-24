from models.database import DatabaseManager, PhoneBrandRecord, PhoneModelRecord
from models.phone_models import (
    PhoneBrandCreateRequest, PhoneBrandUpdateRequest, PhoneBrandResponse,
    PhoneBrandListResponse, PhoneModelCreateRequest, PhoneModelUpdateRequest,
    PhoneModelResponse, PhoneModelListResponse, ScalableDeviceSelectorResponse,
    PhoneBrand, PhoneModel
)
from typing import List, Dict, Any, Optional
from datetime import datetime

class PhoneManagementService:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    # Phone Brand Methods
    def create_phone_brand(self, request: PhoneBrandCreateRequest) -> PhoneBrandResponse:
        """Create a new phone brand"""
        try:
            brand_record = PhoneBrandRecord(
                name=request.name,
                icon=request.icon,
                description=request.description,
                country_origin=request.country_origin,
                market_share_uganda=request.market_share_uganda,
                is_active=True
            )
            
            brand_id = self.db_manager.insert_phone_brand(brand_record)
            created_brand = self.db_manager.get_phone_brand_by_id(brand_id)
            
            if not created_brand:
                raise Exception("Failed to retrieve created brand")
            
            brand = PhoneBrand(
                id=created_brand.id,
                name=created_brand.name,
                icon=created_brand.icon,
                description=created_brand.description,
                country_origin=created_brand.country_origin,
                market_share_uganda=created_brand.market_share_uganda,
                is_active=created_brand.is_active,
                created_at=created_brand.created_at,
                updated_at=created_brand.updated_at
            )
            
            return PhoneBrandResponse(
                success=True,
                brand=brand,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to create phone brand: {str(e)}")

    def get_all_phone_brands(self, active_only: bool = True) -> PhoneBrandListResponse:
        """Get all phone brands"""
        try:
            brands_records = self.db_manager.get_all_phone_brands(active_only)
            
            brands = []
            for brand_record in brands_records:
                brands.append(PhoneBrand(
                    id=brand_record.id,
                    name=brand_record.name,
                    icon=brand_record.icon,
                    description=brand_record.description,
                    country_origin=brand_record.country_origin,
                    market_share_uganda=brand_record.market_share_uganda,
                    is_active=brand_record.is_active,
                    created_at=brand_record.created_at,
                    updated_at=brand_record.updated_at
                ))
            
            return PhoneBrandListResponse(
                success=True,
                brands=brands,
                total_count=len(brands),
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to get phone brands: {str(e)}")

    def get_phone_brand_by_id(self, brand_id: int) -> PhoneBrandResponse:
        """Get phone brand by ID"""
        try:
            brand_record = self.db_manager.get_phone_brand_by_id(brand_id)
            
            if not brand_record:
                raise Exception(f"Phone brand with ID {brand_id} not found")
            
            brand = PhoneBrand(
                id=brand_record.id,
                name=brand_record.name,
                icon=brand_record.icon,
                description=brand_record.description,
                country_origin=brand_record.country_origin,
                market_share_uganda=brand_record.market_share_uganda,
                is_active=brand_record.is_active,
                created_at=brand_record.created_at,
                updated_at=brand_record.updated_at
            )
            
            return PhoneBrandResponse(
                success=True,
                brand=brand,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to get phone brand: {str(e)}")

    def update_phone_brand(self, brand_id: int, request: PhoneBrandUpdateRequest) -> PhoneBrandResponse:
        """Update a phone brand"""
        try:
            existing_brand = self.db_manager.get_phone_brand_by_id(brand_id)
            if not existing_brand:
                raise Exception(f"Phone brand with ID {brand_id} not found")
            
            # Update only provided fields
            update_data = PhoneBrandRecord(
                id=brand_id,
                name=request.name or existing_brand.name,
                icon=request.icon or existing_brand.icon,
                description=request.description or existing_brand.description,
                country_origin=request.country_origin or existing_brand.country_origin,
                market_share_uganda=request.market_share_uganda or existing_brand.market_share_uganda,
                is_active=request.is_active if request.is_active is not None else existing_brand.is_active
            )
            
            success = self.db_manager.update_phone_brand(brand_id, update_data)
            if not success:
                raise Exception("Failed to update phone brand")
            
            updated_brand = self.db_manager.get_phone_brand_by_id(brand_id)
            brand = PhoneBrand(
                id=updated_brand.id,
                name=updated_brand.name,
                icon=updated_brand.icon,
                description=updated_brand.description,
                country_origin=updated_brand.country_origin,
                market_share_uganda=updated_brand.market_share_uganda,
                is_active=updated_brand.is_active,
                created_at=updated_brand.created_at,
                updated_at=updated_brand.updated_at
            )
            
            return PhoneBrandResponse(
                success=True,
                brand=brand,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to update phone brand: {str(e)}")

    def delete_phone_brand(self, brand_id: int) -> Dict[str, Any]:
        """Delete a phone brand (soft delete)"""
        try:
            success = self.db_manager.delete_phone_brand(brand_id)
            if not success:
                raise Exception("Failed to delete phone brand")
            
            return {
                "success": True,
                "message": f"Phone brand {brand_id} deleted successfully",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            raise Exception(f"Failed to delete phone brand: {str(e)}")

    # Phone Model Methods
    def create_phone_model(self, request: PhoneModelCreateRequest) -> PhoneModelResponse:
        """Create a new phone model"""
        try:
            model_record = PhoneModelRecord(
                brand_id=request.brand_id,
                model_name=request.model_name,
                model_code=request.model_code,
                device_type=request.device_type,
                price_range=request.price_range,
                screen_size=request.screen_size,
                battery_capacity=request.battery_capacity,
                storage_options=request.storage_options,
                color_options=request.color_options,
                release_year=request.release_year,
                is_popular_uganda=request.is_popular_uganda,
                is_active=True
            )
            
            model_id = self.db_manager.insert_phone_model(model_record)
            created_model = self.db_manager.get_phone_models_by_brand(request.brand_id)
            created_model = next((m for m in created_model if m.id == model_id), None)
            
            if not created_model:
                raise Exception("Failed to retrieve created model")
            
            model = PhoneModel(
                id=created_model.id,
                brand_id=created_model.brand_id,
                model_name=created_model.model_name,
                model_code=created_model.model_code,
                device_type=created_model.device_type,
                price_range=created_model.price_range,
                screen_size=created_model.screen_size,
                battery_capacity=created_model.battery_capacity,
                storage_options=created_model.storage_options,
                color_options=created_model.color_options,
                release_year=created_model.release_year,
                is_popular_uganda=created_model.is_popular_uganda,
                is_active=created_model.is_active,
                created_at=created_model.created_at,
                updated_at=created_model.updated_at
            )
            
            return PhoneModelResponse(
                success=True,
                model=model,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to create phone model: {str(e)}")

    def get_phone_models_by_brand(self, brand_id: int, active_only: bool = True) -> PhoneModelListResponse:
        """Get phone models by brand ID"""
        try:
            models_records = self.db_manager.get_phone_models_by_brand(brand_id, active_only)
            brand_record = self.db_manager.get_phone_brand_by_id(brand_id)
            
            models = []
            for model_record in models_records:
                models.append(PhoneModel(
                    id=model_record.id,
                    brand_id=model_record.brand_id,
                    model_name=model_record.model_name,
                    model_code=model_record.model_code,
                    device_type=model_record.device_type,
                    price_range=model_record.price_range,
                    screen_size=model_record.screen_size,
                    battery_capacity=model_record.battery_capacity,
                    storage_options=model_record.storage_options,
                    color_options=model_record.color_options,
                    release_year=model_record.release_year,
                    is_popular_uganda=model_record.is_popular_uganda,
                    is_active=model_record.is_active,
                    created_at=model_record.created_at,
                    updated_at=model_record.updated_at
                ))
            
            brand = None
            if brand_record:
                brand = PhoneBrand(
                    id=brand_record.id,
                    name=brand_record.name,
                    icon=brand_record.icon,
                    description=brand_record.description,
                    country_origin=brand_record.country_origin,
                    market_share_uganda=brand_record.market_share_uganda,
                    is_active=brand_record.is_active,
                    created_at=brand_record.created_at,
                    updated_at=brand_record.updated_at
                )
            
            return PhoneModelListResponse(
                success=True,
                models=models,
                brand=brand,
                total_count=len(models),
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to get phone models: {str(e)}")

    def get_scalable_device_selector_data(self) -> ScalableDeviceSelectorResponse:
        """Get data for scalable device selector (brands + popular models)"""
        try:
            brands_records = self.db_manager.get_all_phone_brands(active_only=True)
            popular_models_records = self.db_manager.get_popular_phone_models_uganda()
            
            brands = []
            for brand_record in brands_records:
                brands.append(PhoneBrand(
                    id=brand_record.id,
                    name=brand_record.name,
                    icon=brand_record.icon,
                    description=brand_record.description,
                    country_origin=brand_record.country_origin,
                    market_share_uganda=brand_record.market_share_uganda,
                    is_active=brand_record.is_active,
                    created_at=brand_record.created_at,
                    updated_at=brand_record.updated_at
                ))
            
            popular_models = []
            for model_record in popular_models_records:
                popular_models.append(PhoneModel(
                    id=model_record.id,
                    brand_id=model_record.brand_id,
                    model_name=model_record.model_name,
                    model_code=model_record.model_code,
                    device_type=model_record.device_type,
                    price_range=model_record.price_range,
                    screen_size=model_record.screen_size,
                    battery_capacity=model_record.battery_capacity,
                    storage_options=model_record.storage_options,
                    color_options=model_record.color_options,
                    release_year=model_record.release_year,
                    is_popular_uganda=model_record.is_popular_uganda,
                    is_active=model_record.is_active,
                    created_at=model_record.created_at,
                    updated_at=model_record.updated_at
                ))
            
            return ScalableDeviceSelectorResponse(
                success=True,
                brands=brands,
                popular_models=popular_models,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            raise Exception(f"Failed to get scalable device selector data: {str(e)}")
