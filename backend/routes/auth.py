"""
Authentication API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from services.auth_service import AuthService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()
auth_service = AuthService()


# Pydantic models
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email_or_username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: str
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: str
    last_login: Optional[str] = None


# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    user_data = auth_service.verify_token(token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_data


async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """Get current active user"""
    user = auth_service.get_user_by_id(current_user['user_id'])
    
    if not user or not user['is_active']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


async def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    """Get current user if they are an admin"""
    if not current_user.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return current_user


async def get_current_super_admin_user(current_user: dict = Depends(get_current_user)):
    """Get current user if they are a super admin"""
    if not current_user.get('is_super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    return current_user


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """Register a new user"""
    try:
        result = auth_service.register_user(
            email=request.email,
            username=request.username,
            password=request.password,
            full_name=request.full_name
        )
        
        if result['success']:
            return {
                "message": "User registered successfully",
                "user": {
                    "id": result['user_id'],
                    "email": result['email'],
                    "username": result['username']
                }
            }
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, req: Request):
    """Login user and return tokens"""
    try:
        # Get client info
        ip_address = req.client.host if req.client else None
        user_agent = req.headers.get("user-agent")
        
        result = auth_service.login_user(
            email_or_username=request.email_or_username,
            password=request.password,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        if result['success']:
            return TokenResponse(**result)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result['error'],
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout user by invalidating token"""
    try:
        token = credentials.credentials
        success = auth_service.logout_user(token)
        
        if success:
            return {"message": "Logged out successfully"}
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logout failed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    return UserResponse(**current_user)


@router.post("/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        result = auth_service.refresh_access_token(request.refresh_token)
        
        if result:
            return result
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.get("/verify")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """Verify if token is valid"""
    return {
        "valid": True,
        "user": current_user
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Change user password"""
    try:
        result = auth_service.change_password(
            user_id=current_user['id'],
            current_password=request.current_password,
            new_password=request.new_password
        )
        
        if result['success']:
            return {
                "message": "Password changed successfully",
                "success": True
            }
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Update user profile"""
    try:
        import sqlite3
        
        with sqlite3.connect("data/barcode_generator.db") as conn:
            cursor = conn.cursor()
            
            # Build update query dynamically based on provided fields
            update_fields = []
            update_values = []
            
            if request.full_name is not None:
                update_fields.append("full_name = ?")
                update_values.append(request.full_name)
            
            if request.email is not None:
                # Check if email already exists for another user
                cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", 
                              (request.email, current_user['id']))
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already in use by another user"
                    )
                update_fields.append("email = ?")
                update_values.append(request.email)
            
            if request.bio is not None:
                update_fields.append("bio = ?")
                update_values.append(request.bio)
            
            # Only update if there are fields to update
            if update_fields:
                update_values.append(current_user['id'])
                cursor.execute(f"""
                    UPDATE users 
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """, update_values)
                conn.commit()
            
            # Return updated user data
            cursor.execute("""
                SELECT id, email, username, full_name, is_active, is_admin, 
                       created_at, bio
                FROM users WHERE id = ?
            """, (current_user['id'],))
            
            row = cursor.fetchone()
            return {
                "message": "Profile updated successfully",
                "user": {
                    "id": row[0],
                    "email": row[1],
                    "username": row[2],
                    "full_name": row[3],
                    "is_active": bool(row[4]),
                    "is_admin": bool(row[5]),
                    "created_at": row[6],
                    "bio": row[7]
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed"
        )
