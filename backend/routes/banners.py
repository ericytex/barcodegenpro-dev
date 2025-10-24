"""
Banner API Routes for Announcements and Promotions
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import logging
from datetime import datetime

from routes.auth import get_current_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/banners", tags=["banners"])

# ==================== Request/Response Models ====================

class BannerResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_active: bool
    created_at: str
    expires_at: Optional[str] = None

class BannersListResponse(BaseModel):
    banners: List[BannerResponse]

class CreateBannerRequest(BaseModel):
    title: str
    message: str
    type: str
    expires_at: Optional[str] = None

class UpdateBannerStatusRequest(BaseModel):
    is_active: bool

# ==================== Banner Endpoints ====================

@router.get("/active")
async def get_active_banner():
    """Get the currently active banner for display"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get the most recent active banner that hasn't expired
            cursor.execute("""
                SELECT id, title, message, type, is_active, created_at, expires_at
                FROM banners 
                WHERE is_active = 1 
                AND (expires_at IS NULL OR expires_at > datetime('now'))
                ORDER BY created_at DESC
                LIMIT 1
            """)
            
            row = cursor.fetchone()
            
            if row:
                return {
                    "banner": BannerResponse(
                        id=row['id'],
                        title=row['title'],
                        message=row['message'],
                        type=row['type'],
                        is_active=bool(row['is_active']),
                        created_at=row['created_at'],
                        expires_at=row['expires_at']
                    )
                }
            
            return {"banner": None}
            
    except Exception as e:
        logger.error(f"Error getting active banner: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active banner: {str(e)}"
        )


@router.get("", response_model=BannersListResponse)
async def get_all_banners(current_user: dict = Depends(get_current_admin_user)):
    """Get all banners (Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, title, message, type, is_active, created_at, expires_at
                FROM banners 
                ORDER BY created_at DESC
            """)
            
            rows = cursor.fetchall()
            banners = []
            
            for row in rows:
                banners.append(BannerResponse(
                    id=row['id'],
                    title=row['title'],
                    message=row['message'],
                    type=row['type'],
                    is_active=bool(row['is_active']),
                    created_at=row['created_at'],
                    expires_at=row['expires_at']
                ))
            
            return BannersListResponse(banners=banners)
            
    except Exception as e:
        logger.error(f"Error getting banners: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get banners: {str(e)}"
        )


@router.post("", response_model=BannerResponse)
async def create_banner(
    request: CreateBannerRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new banner (Admin only)"""
    try:
        # Validate banner type
        if request.type not in ['info', 'success', 'warning', 'error']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid banner type. Must be one of: info, success, warning, error"
            )
        
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Create banner
            cursor.execute("""
                INSERT INTO banners (title, message, type, is_active, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                request.title,
                request.message,
                request.type,
                True,  # is_active
                datetime.utcnow().isoformat(),
                request.expires_at
            ))
            
            banner_id = cursor.lastrowid
            conn.commit()
            
            # Return created banner
            cursor.execute("""
                SELECT id, title, message, type, is_active, created_at, expires_at
                FROM banners WHERE id = ?
            """, (banner_id,))
            
            row = cursor.fetchone()
            return BannerResponse(
                id=row[0],
                title=row[1],
                message=row[2],
                type=row[3],
                is_active=bool(row[4]),
                created_at=row[5],
                expires_at=row[6]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating banner: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create banner: {str(e)}"
        )


@router.patch("/{banner_id}/status", response_model=BannerResponse)
async def update_banner_status(
    banner_id: int,
    request: UpdateBannerStatusRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update banner status (Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Check if banner exists
            cursor.execute("SELECT id FROM banners WHERE id = ?", (banner_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Banner not found"
                )
            
            # Update status
            cursor.execute("""
                UPDATE banners 
                SET is_active = ?
                WHERE id = ?
            """, (request.is_active, banner_id))
            
            conn.commit()
            
            # Return updated banner
            cursor.execute("""
                SELECT id, title, message, type, is_active, created_at, expires_at
                FROM banners WHERE id = ?
            """, (banner_id,))
            
            row = cursor.fetchone()
            return BannerResponse(
                id=row[0],
                title=row[1],
                message=row[2],
                type=row[3],
                is_active=bool(row[4]),
                created_at=row[5],
                expires_at=row[6]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating banner status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update banner status: {str(e)}"
        )


@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: int,
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete a banner (Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Check if banner exists
            cursor.execute("SELECT id, title FROM banners WHERE id = ?", (banner_id,))
            banner = cursor.fetchone()
            if not banner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Banner not found"
                )
            
            # Delete banner
            cursor.execute("DELETE FROM banners WHERE id = ?", (banner_id,))
            conn.commit()
            
            return {"message": f"Banner '{banner[1]}' deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting banner: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete banner: {str(e)}"
        )
