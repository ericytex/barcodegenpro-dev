"""
Admin API Routes for User Management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import sqlite3
import bcrypt
import logging

from routes.auth import get_current_super_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ==================== Request/Response Models ====================

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool  
    is_super_admin: bool
    created_at: str
    last_login: Optional[str] = None
    token_balance: Optional[int] = None

class UsersListResponse(BaseModel):
    users: List[UserResponse]

class CreateUserRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    is_admin: bool = False
    is_super_admin: bool = False

class UpdateUserRoleRequest(BaseModel):
    is_admin: Optional[bool] = None
    is_super_admin: Optional[bool] = None

class UpdateUserStatusRequest(BaseModel):
    is_active: bool

# ==================== Admin Endpoints ====================

@router.get("/users", response_model=UsersListResponse)
async def get_all_users(current_user: dict = Depends(get_current_super_admin_user)):
    """Get all users (Super Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            logger.info(f"Current user in get_all_users: {current_user}")
            cursor.execute("""
                SELECT u.id, u.email, u.username, u.full_name, u.is_active, u.is_admin, u.is_super_admin, 
                       u.created_at, u.last_login, t.balance as token_balance
                FROM users u
                LEFT JOIN user_tokens t ON u.id = t.user_id
            """)
            
            rows = cursor.fetchall()
            users = []
            
            for row in rows:
                users.append(UserResponse(
                    id=row['id'],
                    email=row['email'],
                    username=row['username'],
                    full_name=row['full_name'],
                    is_active=bool(row['is_active']),
                    is_admin=bool(row['is_admin']),
                    is_super_admin=bool(row['is_super_admin']),
                    created_at=row['created_at'],
                    last_login=row['last_login'],
                    token_balance=row['token_balance']
                ))
            
            return UsersListResponse(users=users)
            
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users: {str(e)}"
        )

@router.post("/users", response_model=UserResponse)
async def create_user(
    request: CreateUserRequest,
    current_user: dict = Depends(get_current_super_admin_user)
):
    """Create a new user (Super Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE email = ? OR username = ?", 
                         (request.email, request.username))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email or username already exists"
                )
            
            # Hash password
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(request.password.encode('utf-8'), salt).decode('utf-8')
            
            # Create user
            cursor.execute("""
                INSERT INTO users (email, username, password_hash, full_name, is_active, is_admin, is_super_admin)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                request.email,
                request.username,
                password_hash,
                request.full_name,
                True,  # is_active
                request.is_admin,
                request.is_super_admin
            ))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            # Return created user
            cursor.execute("""
                SELECT id, email, username, full_name, is_active, is_admin, is_super_admin, 
                       created_at, last_login
                FROM users WHERE id = ?
            """, (user_id,))
            
            row = cursor.fetchone()
            return UserResponse(
                id=row[0],
                email=row[1],
                username=row[2],
                full_name=row[3],
                is_active=bool(row[4]),
                is_admin=bool(row[5]),
                is_super_admin=bool(row[6]),
                created_at=row[7],
                last_login=row[8]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    request: UpdateUserRoleRequest,
    current_user: dict = Depends(get_current_super_admin_user)
):
    """Update user role (Super Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Update role fields
            update_fields = []
            update_values = []
            
            if request.is_admin is not None:
                update_fields.append("is_admin = ?")
                update_values.append(request.is_admin)
            
            if request.is_super_admin is not None:
                update_fields.append("is_super_admin = ?")
                update_values.append(request.is_super_admin)
            
            if update_fields:
                update_values.append(user_id)
                cursor.execute(f"""
                    UPDATE users 
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """, update_values)
                
                conn.commit()
            
            # Return updated user
            cursor.execute("""
                SELECT id, email, username, full_name, is_active, is_admin, is_super_admin, 
                       created_at, last_login
                FROM users WHERE id = ?
            """, (user_id,))
            
            row = cursor.fetchone()
            return UserResponse(
                id=row[0],
                email=row[1],
                username=row[2],
                full_name=row[3],
                is_active=bool(row[4]),
                is_admin=bool(row[5]),
                is_super_admin=bool(row[6]),
                created_at=row[7],
                last_login=row[8]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )

@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: int,
    request: UpdateUserStatusRequest,
    current_user: dict = Depends(get_current_super_admin_user)
):
    """Update user status (Super Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Update status
            cursor.execute("""
                UPDATE users 
                SET is_active = ?
                WHERE id = ?
            """, (request.is_active, user_id))
            
            conn.commit()
            
            # Return updated user
            cursor.execute("""
                SELECT id, email, username, full_name, is_active, is_admin, is_super_admin, 
                       created_at, last_login
                FROM users WHERE id = ?
            """, (user_id,))
            
            row = cursor.fetchone()
            return UserResponse(
                id=row[0],
                email=row[1],
                username=row[2],
                full_name=row[3],
                is_active=bool(row[4]),
                is_admin=bool(row[5]),
                is_super_admin=bool(row[6]),
                created_at=row[7],
                last_login=row[8]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user status: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_super_admin_user)
):
    """Delete a user (Super Admin only)"""
    try:
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT id, email FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Prevent deleting own account
            if user_id == current_user['user_id']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete your own account"
                )
            
            # Delete user
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            
            return {"message": f"User {user[1]} deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
