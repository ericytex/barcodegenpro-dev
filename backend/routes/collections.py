"""
Optimus Collections Monitoring API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.collections_service import OptimusCollectionsService
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/collections", tags=["collections"])
collections_service = OptimusCollectionsService()

# ==================== Request/Response Models ====================

class CollectionsResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    total_count: Optional[int] = None
    cached: Optional[bool] = None
    fetched_at: Optional[str] = None
    error: Optional[str] = None
    message: Optional[str] = None

class CollectionStatsResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    message: Optional[str] = None

class ApiKeyRequest(BaseModel):
    api_key: str = Field(..., description="Optimus collections API key")

# ==================== Super Admin Endpoints ====================

@router.get("/", response_model=CollectionsResponse)
async def get_collections(
    limit: int = Query(100, ge=1, le=100, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    use_cache: bool = Query(False, description="Use cached data instead of API"),
    current_user: dict = Depends(get_current_user)
):
    """Get mobile money collections from Optimus (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        if use_cache:
            result = collections_service.get_cached_collections(limit, offset)
        else:
            result = collections_service.get_collections(limit, offset, start_date, end_date)
        
        return CollectionsResponse(**result)
        
    except Exception as e:
        logger.error(f"Error getting collections: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get collections: {str(e)}"
        )

@router.get("/stats", response_model=CollectionStatsResponse)
async def get_collection_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: dict = Depends(get_current_user)
):
    """Get collection statistics (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        result = collections_service.get_collection_stats(days)
        return CollectionStatsResponse(**result)
        
    except Exception as e:
        logger.error(f"Error getting collection stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get collection stats: {str(e)}"
        )

@router.post("/configure")
async def configure_api_key(
    request: ApiKeyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Configure Optimus collections API key (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        # Update API key in service
        collections_service.set_api_key(request.api_key)
        
        # Save to database settings
        from services.token_service import TokenService
        token_service = TokenService()
        token_service.set_setting('optimus_collections_api_key', request.api_key, current_user['user_id'])
        
        logger.info(f"Optimus collections API key configured by super admin {current_user['user_id']}")
        
        return {
            "success": True,
            "message": "API key configured successfully"
        }
        
    except Exception as e:
        logger.error(f"Error configuring API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure API key: {str(e)}"
        )

@router.get("/status")
async def get_collections_status(
    current_user: dict = Depends(get_current_user)
):
    """Get collections service status (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        # Check if API key is configured
        api_key_configured = collections_service.api_key is not None
        
        # Test API connection if key is configured
        api_status = "not_configured"
        if api_key_configured:
            test_result = collections_service.get_collections(limit=1)
            api_status = "connected" if test_result.get('success') else "error"
        
        return {
            "success": True,
            "data": {
                "api_key_configured": api_key_configured,
                "api_status": api_status,
                "service_status": "active"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting collections status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status: {str(e)}"
        )

@router.post("/refresh")
async def refresh_collections_cache(
    limit: int = Query(100, ge=1, le=100, description="Number of records to fetch"),
    current_user: dict = Depends(get_current_user)
):
    """Refresh collections cache from Optimus API (Super Admin only)"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    try:
        result = collections_service.get_collections(limit=limit)
        
        if result.get('success'):
            return {
                "success": True,
                "message": f"Cache refreshed with {result.get('total_count', 0)} collections",
                "data": result.get('data')
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('message', 'Failed to refresh cache')
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing collections cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh cache: {str(e)}"
        )
