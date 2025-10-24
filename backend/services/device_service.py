"""
Device Management Service for Barcode Generator API
"""

import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from models.device_models import (
    DeviceModel, DeviceCreateRequest, DeviceUpdateRequest, 
    DeviceResponse, DeviceListResponse, DeviceTypeInfo, DeviceTypeListResponse,
    DeviceType
)
from models.database import DatabaseManager, DeviceRecord


class DeviceService:
    def __init__(self, db_manager: DatabaseManager = None):
        self.db_manager = db_manager or DatabaseManager()
    
    def get_device_types(self) -> DeviceTypeListResponse:
        """Get all available device types with metadata"""
        device_types = [
            DeviceTypeInfo(
                type=DeviceType.PHONE,
                display_name="Smartphone",
                description="Mobile phones and smartphones",
                icon="📱"
            ),
            DeviceTypeInfo(
                type=DeviceType.TABLET,
                display_name="Tablet",
                description="Tablets and iPads",
                icon="📱"
            ),
            DeviceTypeInfo(
                type=DeviceType.LAPTOP,
                display_name="Laptop",
                description="Laptops and notebooks",
                icon="💻"
            ),
            DeviceTypeInfo(
                type=DeviceType.WATCH,
                display_name="Smart Watch",
                description="Smart watches and fitness trackers",
                icon="⌚"
            ),
            DeviceTypeInfo(
                type=DeviceType.HEADPHONES,
                display_name="Headphones",
                description="Wireless headphones and earbuds",
                icon="🎧"
            ),
            DeviceTypeInfo(
                type=DeviceType.SPEAKER,
                display_name="Speaker",
                description="Bluetooth speakers and sound systems",
                icon="🔊"
            ),
            DeviceTypeInfo(
                type=DeviceType.CAMERA,
                display_name="Camera",
                description="Digital cameras and action cameras",
                icon="📷"
            ),
            DeviceTypeInfo(
                type=DeviceType.GAMING_CONSOLE,
                display_name="Gaming Console",
                description="Gaming consoles and handheld devices",
                icon="🎮"
            ),
            DeviceTypeInfo(
                type=DeviceType.SMART_TV,
                display_name="Smart TV",
                description="Smart TVs and streaming devices",
                icon="📺"
            ),
            DeviceTypeInfo(
                type=DeviceType.ROUTER,
                display_name="Router",
                description="WiFi routers and networking equipment",
                icon="📡"
            ),
            DeviceTypeInfo(
                type=DeviceType.OTHER,
                display_name="Other",
                description="Other electronic devices",
                icon="🔧"
            )
        ]
        
        return DeviceTypeListResponse(
            success=True,
            device_types=device_types
        )
    
    def create_device(self, request: DeviceCreateRequest) -> DeviceResponse:
        """Create a new device"""
        try:
            # Check if device already exists
            existing_devices = self.db_manager.get_all_devices(active_only=False)
            for device in existing_devices:
                if (device['brand'].lower() == request.brand.lower() and 
                    device['model_code'].lower() == request.model_code.lower()):
                    return DeviceResponse(
                        success=False,
                        message=f"Device with brand '{request.brand}' and model code '{request.model_code}' already exists"
                    )
            
            # Create device record
            device_record = DeviceRecord(
                name=request.name,
                brand=request.brand,
                model_code=request.model_code,
                device_type=request.device_type.value,
                default_dn=request.default_dn,
                description=request.description,
                specifications=request.specifications,
                is_active=True
            )
            
            device_id = self.db_manager.insert_device(device_record)
            
            # Get the created device
            created_device = self.db_manager.get_device_by_id(device_id)
            if not created_device:
                return DeviceResponse(
                    success=False,
                    message="Failed to retrieve created device"
                )
            
            device_model = self._convert_to_device_model(created_device)
            
            return DeviceResponse(
                success=True,
                message=f"Device '{request.name}' created successfully",
                device=device_model
            )
            
        except Exception as e:
            return DeviceResponse(
                success=False,
                message=f"Failed to create device: {str(e)}"
            )
    
    def get_all_devices(self, active_only: bool = True) -> DeviceListResponse:
        """Get all devices"""
        try:
            devices_data = self.db_manager.get_all_devices(active_only=active_only)
            devices = [self._convert_to_device_model(device_data) for device_data in devices_data]
            
            return DeviceListResponse(
                success=True,
                devices=devices,
                total_count=len(devices)
            )
            
        except Exception as e:
            return DeviceListResponse(
                success=False,
                devices=[],
                total_count=0
            )
    
    def get_device_by_id(self, device_id: int) -> DeviceResponse:
        """Get a device by ID"""
        try:
            device_data = self.db_manager.get_device_by_id(device_id)
            if not device_data:
                return DeviceResponse(
                    success=False,
                    message=f"Device with ID {device_id} not found"
                )
            
            device_model = self._convert_to_device_model(device_data)
            
            return DeviceResponse(
                success=True,
                message="Device retrieved successfully",
                device=device_model
            )
            
        except Exception as e:
            return DeviceResponse(
                success=False,
                message=f"Failed to retrieve device: {str(e)}"
            )
    
    def get_devices_by_type(self, device_type: DeviceType, active_only: bool = True) -> DeviceListResponse:
        """Get devices by type"""
        try:
            devices_data = self.db_manager.get_devices_by_type(device_type.value, active_only=active_only)
            devices = [self._convert_to_device_model(device_data) for device_data in devices_data]
            
            return DeviceListResponse(
                success=True,
                devices=devices,
                total_count=len(devices)
            )
            
        except Exception as e:
            return DeviceListResponse(
                success=False,
                devices=[],
                total_count=0
            )
    
    def update_device(self, device_id: int, request: DeviceUpdateRequest) -> DeviceResponse:
        """Update a device"""
        try:
            # Check if device exists
            existing_device = self.db_manager.get_device_by_id(device_id)
            if not existing_device:
                return DeviceResponse(
                    success=False,
                    message=f"Device with ID {device_id} not found"
                )
            
            # Check for duplicate brand/model combination if updating those fields
            if request.brand or request.model_code:
                existing_devices = self.db_manager.get_all_devices(active_only=False)
                for device in existing_devices:
                    if device['id'] != device_id:  # Exclude current device
                        brand_match = (request.brand and device['brand'].lower() == request.brand.lower()) or (not request.brand and device['brand'].lower() == existing_device['brand'].lower())
                        model_match = (request.model_code and device['model_code'].lower() == request.model_code.lower()) or (not request.model_code and device['model_code'].lower() == existing_device['model_code'].lower())
                        
                        if brand_match and model_match:
                            return DeviceResponse(
                                success=False,
                                message=f"Device with brand '{request.brand or existing_device['brand']}' and model code '{request.model_code or existing_device['model_code']}' already exists"
                            )
            
            # Create updated device record
            updated_device = DeviceRecord(
                name=request.name or existing_device['name'],
                brand=request.brand or existing_device['brand'],
                model_code=request.model_code or existing_device['model_code'],
                device_type=request.device_type.value if request.device_type else existing_device['device_type'],
                default_dn=request.default_dn or existing_device['default_dn'],
                description=request.description if request.description is not None else existing_device['description'],
                specifications=request.specifications if request.specifications is not None else existing_device['specifications'],
                is_active=request.is_active if request.is_active is not None else existing_device['is_active']
            )
            
            success = self.db_manager.update_device(device_id, updated_device)
            if not success:
                return DeviceResponse(
                    success=False,
                    message="Failed to update device"
                )
            
            # Get the updated device
            updated_device_data = self.db_manager.get_device_by_id(device_id)
            device_model = self._convert_to_device_model(updated_device_data)
            
            return DeviceResponse(
                success=True,
                message="Device updated successfully",
                device=device_model
            )
            
        except Exception as e:
            return DeviceResponse(
                success=False,
                message=f"Failed to update device: {str(e)}"
            )
    
    def delete_device(self, device_id: int) -> DeviceResponse:
        """Soft delete a device"""
        try:
            # Check if device exists
            existing_device = self.db_manager.get_device_by_id(device_id)
            if not existing_device:
                return DeviceResponse(
                    success=False,
                    message=f"Device with ID {device_id} not found"
                )
            
            success = self.db_manager.delete_device(device_id)
            if not success:
                return DeviceResponse(
                    success=False,
                    message="Failed to delete device"
                )
            
            return DeviceResponse(
                success=True,
                message="Device deleted successfully"
            )
            
        except Exception as e:
            return DeviceResponse(
                success=False,
                message=f"Failed to delete device: {str(e)}"
            )
    
    def get_device_statistics(self) -> Dict[str, Any]:
        """Get device statistics"""
        try:
            return self.db_manager.get_device_statistics()
        except Exception as e:
            return {
                "total_devices": 0,
                "active_devices": 0,
                "devices_by_type": {},
                "brands": {}
            }
    
    def _convert_to_device_model(self, device_data: Dict[str, Any]) -> DeviceModel:
        """Convert database record to DeviceModel"""
        return DeviceModel(
            id=device_data['id'],
            name=device_data['name'],
            brand=device_data['brand'],
            model_code=device_data['model_code'],
            device_type=DeviceType(device_data['device_type']),
            default_dn=device_data['default_dn'],
            description=device_data['description'],
            specifications=device_data['specifications'],
            created_at=datetime.fromisoformat(device_data['created_at']) if device_data['created_at'] else None,
            updated_at=datetime.fromisoformat(device_data['updated_at']) if device_data['updated_at'] else None,
            is_active=bool(device_data['is_active'])
        )
