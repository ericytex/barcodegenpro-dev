"""
Authentication Service with JWT
"""
import sqlite3
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Optional
from models.auth_models import User, UserSession, UserQuota
import logging
import secrets

logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = "your-secret-key-change-this-in-production-use-env-variable"  # TODO: Move to environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


class AuthService:
    def __init__(self, db_path: str = "data/barcode_generator.db"):
        self.db_path = db_path
    
    def _get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def _hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def _create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt, expire
    
    def _create_refresh_token(self):
        """Create a refresh token"""
        return secrets.token_urlsafe(32)
    
    def register_user(self, email: str, username: str, password: str, full_name: Optional[str] = None) -> Dict:
        """Register a new user"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if email or username already exists
            cursor.execute("SELECT id FROM users WHERE email = ? OR username = ?", (email, username))
            if cursor.fetchone():
                return {"success": False, "error": "Email or username already exists"}
            
            # Hash password
            password_hash = self._hash_password(password)
            
            # Create user
            cursor.execute("""
                INSERT INTO users (email, username, password_hash, full_name)
                VALUES (?, ?, ?, ?)
            """, (email, username, password_hash, full_name))
            
            user_id = cursor.lastrowid
            
            # Create default quota for user
            cursor.execute("""
                INSERT INTO user_quotas (user_id, month_start_date)
                VALUES (?, ?)
            """, (user_id, datetime.utcnow().isoformat()))
            
            # Get welcome bonus tokens setting
            cursor.execute("SELECT setting_value FROM token_settings WHERE setting_key = 'welcome_bonus_tokens'")
            result = cursor.fetchone()
            welcome_tokens = int(result[0]) if result else 10
            
            # Create token account with welcome bonus
            cursor.execute("""
                INSERT INTO user_tokens (user_id, balance, total_purchased)
                VALUES (?, ?, ?)
            """, (user_id, welcome_tokens, welcome_tokens))
            
            # Log the welcome bonus
            cursor.execute("""
                INSERT INTO token_usage (user_id, tokens_used, operation, details)
                VALUES (?, ?, ?, ?)
            """, (user_id, -welcome_tokens, "welcome_bonus", f"Welcome bonus: {welcome_tokens} free tokens"))
            
            conn.commit()
            
            logger.info(f"User registered successfully: {email} (given {welcome_tokens} welcome tokens)")
            
            return {
                "success": True,
                "user_id": user_id,
                "email": email,
                "username": username,
                "welcome_tokens": welcome_tokens
            }
            
        except Exception as e:
            logger.error(f"Registration failed: {str(e)}")
            conn.rollback()
            return {"success": False, "error": str(e)}
        finally:
            conn.close()
    
    def login_user(self, email_or_username: str, password: str, ip_address: Optional[str] = None, 
                   user_agent: Optional[str] = None) -> Dict:
        """Login a user and create session"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Find user by email or username
            cursor.execute("""
                SELECT id, email, username, password_hash, full_name, is_active, is_admin, is_super_admin
                FROM users 
                WHERE email = ? OR username = ?
            """, (email_or_username, email_or_username))
            
            user_row = cursor.fetchone()
            
            if not user_row:
                return {"success": False, "error": "Invalid credentials"}
            
            user_id, email, username, password_hash, full_name, is_active, is_admin, is_super_admin = user_row
            
            # Check if user is active
            if not is_active:
                return {"success": False, "error": "Account is inactive"}
            
            # Verify password
            if not self._verify_password(password, password_hash):
                return {"success": False, "error": "Invalid credentials"}
            
            # Create tokens
            token_data = {
                "sub": str(user_id),
                "email": email,
                "username": username,
                "is_admin": bool(is_admin),
                "is_super_admin": bool(is_super_admin)
            }
            access_token, expires_at = self._create_access_token(token_data)
            refresh_token = self._create_refresh_token()
            
            # Save session
            cursor.execute("""
                INSERT INTO user_sessions (user_id, token, refresh_token, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, access_token, refresh_token, expires_at.isoformat(), ip_address, user_agent))
            
            # Update last login
            cursor.execute("""
                UPDATE users SET last_login = ? WHERE id = ?
            """, (datetime.utcnow().isoformat(), user_id))
            
            conn.commit()
            
            logger.info(f"User logged in successfully: {email}")
            
            return {
                "success": True,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_at": expires_at.isoformat(),
                "user": {
                    "id": user_id,
                    "email": email,
                    "username": username,
                    "full_name": full_name,
                    "is_admin": bool(is_admin),
                    "is_super_admin": bool(is_super_admin)
                }
            }
            
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            conn.rollback()
            return {"success": False, "error": str(e)}
        finally:
            conn.close()
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify JWT token and return user data"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            if payload.get("type") != "access":
                return None
            
            user_id = int(payload.get("sub"))
            
            # Check if session exists and is not expired
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT user_id, expires_at FROM user_sessions 
                WHERE token = ? AND user_id = ?
            """, (token, user_id))
            
            session_row = cursor.fetchone()
            conn.close()
            
            if not session_row:
                return None
            
            session_user_id, expires_at = session_row
            expires_datetime = datetime.fromisoformat(expires_at)
            
            if expires_datetime < datetime.utcnow():
                return None
            
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "username": payload.get("username"),
                "is_admin": payload.get("is_admin", False),
                "is_super_admin": payload.get("is_super_admin", False)
            }
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            return None
    
    def logout_user(self, token: str) -> bool:
        """Logout user by invalidating token"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"Logout failed: {str(e)}")
            return False
        finally:
            conn.close()
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT id, email, username, full_name, is_active, is_admin, is_super_admin, created_at, last_login
                FROM users 
                WHERE id = ?
            """, (user_id,))
            
            user_row = cursor.fetchone()
            
            if not user_row:
                return None
            
            return {
                "id": user_row[0],
                "email": user_row[1],
                "username": user_row[2],
                "full_name": user_row[3],
                "is_active": bool(user_row[4]),
                "is_admin": bool(user_row[5]),
                "is_super_admin": bool(user_row[6]),
                "created_at": user_row[7],
                "last_login": user_row[8]
            }
            
        finally:
            conn.close()
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict]:
        """Refresh access token using refresh token"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Get session by refresh token
            cursor.execute("""
                SELECT user_id FROM user_sessions WHERE refresh_token = ?
            """, (refresh_token,))
            
            result = cursor.fetchone()
            if not result:
                return None
            
            user_id = result[0]
            
            # Get user data
            user = self.get_user_by_id(user_id)
            if not user or not user['is_active']:
                return None
            
            # Create new access token
            token_data = {
                "sub": str(user_id),
                "email": user['email'],
                "username": user['username'],
                "is_admin": user['is_admin'],
                "is_super_admin": user['is_super_admin']
            }
            new_access_token, expires_at = self._create_access_token(token_data)
            
            # Update session with new token
            cursor.execute("""
                UPDATE user_sessions 
                SET token = ?, expires_at = ?
                WHERE refresh_token = ?
            """, (new_access_token, expires_at.isoformat(), refresh_token))
            
            conn.commit()
            
            return {
                "access_token": new_access_token,
                "token_type": "bearer",
                "expires_at": expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            return None
        finally:
            conn.close()
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> Dict:
        """Change user password"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # Get user's current password hash
            cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
            user_row = cursor.fetchone()
            
            if not user_row:
                return {"success": False, "error": "User not found"}
            
            current_password_hash = user_row[0]
            
            # Verify current password
            if not self._verify_password(current_password, current_password_hash):
                return {"success": False, "error": "Current password is incorrect"}
            
            # Hash new password
            new_password_hash = self._hash_password(new_password)
            
            # Update password
            cursor.execute("""
                UPDATE users 
                SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (new_password_hash, user_id))
            
            conn.commit()
            
            logger.info(f"Password changed successfully for user {user_id}")
            return {"success": True, "message": "Password changed successfully"}
            
        except Exception as e:
            logger.error(f"Password change failed: {str(e)}")
            return {"success": False, "error": "Password change failed"}
        finally:
            conn.close()
