"""
Encryption utilities for sensitive database fields
Uses Fernet (symmetric encryption) for field-level encryption
"""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)


class FieldEncryption:
    """Field-level encryption for sensitive database data"""
    
    def __init__(self, encryption_key: str = None):
        """
        Initialize encryption with key from environment or provided key
        
        Args:
            encryption_key: Optional encryption key. If not provided, uses DATABASE_ENCRYPTION_KEY env var
        """
        self.encryption_key = encryption_key or os.getenv("DATABASE_ENCRYPTION_KEY")
        
        if not self.encryption_key:
            logger.warning("No encryption key provided. Encryption will be disabled.")
            self.fernet = None
            return
        
        # Generate Fernet key from password
        self.fernet = self._create_fernet_key(self.encryption_key)
        logger.info("Field encryption initialized")
    
    def _create_fernet_key(self, password: str) -> Fernet:
        """Create a Fernet key from a password using PBKDF2"""
        # Convert password to bytes
        password_bytes = password.encode('utf-8')
        
        # Use a fixed salt for consistency (in production, you might want to store this securely)
        salt = b'barcode_gen_pro_salt_2024'
        
        # Derive key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,  # High iteration count for security
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        
        return Fernet(key)
    
    def encrypt_field(self, value: str) -> str:
        """
        Encrypt a field value
        
        Args:
            value: String value to encrypt
            
        Returns:
            Encrypted string (base64 encoded)
        """
        if not self.fernet or not value:
            return value
        
        try:
            # Convert to bytes and encrypt
            encrypted_bytes = self.fernet.encrypt(value.encode('utf-8'))
            # Return base64 encoded string
            return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to encrypt field: {e}")
            return value  # Return original value if encryption fails
    
    def decrypt_field(self, encrypted_value: str) -> str:
        """
        Decrypt a field value
        
        Args:
            encrypted_value: Encrypted string (base64 encoded)
            
        Returns:
            Decrypted string
        """
        if not self.fernet or not encrypted_value:
            return encrypted_value
        
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode('utf-8'))
            # Decrypt
            decrypted_bytes = self.fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to decrypt field: {e}")
            return encrypted_value  # Return original value if decryption fails
    
    def is_encrypted(self, value: str) -> bool:
        """
        Check if a value appears to be encrypted
        
        Args:
            value: Value to check
            
        Returns:
            True if value appears to be encrypted
        """
        if not value:
            return False
        
        try:
            # Try to decode as base64
            base64.urlsafe_b64decode(value.encode('utf-8'))
            # If successful, assume it's encrypted
            return True
        except Exception:
            return False


class SensitiveFieldManager:
    """Manager for handling sensitive fields in database operations"""
    
    def __init__(self):
        self.encryption = FieldEncryption()
        
        # Define which fields should be encrypted
        self.encrypted_fields = {
            'token_settings': ['setting_value'],  # Only encrypt setting_value for sensitive settings
            'payment_transactions': ['payment_url', 'callback_data'],
            'user_sessions': ['token', 'refresh_token'],
            'token_purchases': ['payment_url'],
        }
        
        # Define which setting keys should be encrypted
        self.encrypted_setting_keys = {
            'payment_production_auth_token',
            'collections_api_key',
            'payment_webhook_url',
            'collections_api_url',
        }
    
    def should_encrypt_field(self, table_name: str, field_name: str, setting_key: str = None) -> bool:
        """
        Determine if a field should be encrypted
        
        Args:
            table_name: Name of the database table
            field_name: Name of the field
            setting_key: For token_settings table, the setting key
            
        Returns:
            True if field should be encrypted
        """
        # Check if table has encrypted fields
        if table_name in self.encrypted_fields:
            if field_name in self.encrypted_fields[table_name]:
                return True
        
        # Special case for token_settings
        if table_name == 'token_settings' and field_name == 'setting_value':
            return setting_key in self.encrypted_setting_keys
        
        return False
    
    def encrypt_for_storage(self, table_name: str, field_name: str, value: str, setting_key: str = None) -> str:
        """
        Encrypt a value for storage in database
        
        Args:
            table_name: Name of the database table
            field_name: Name of the field
            value: Value to encrypt
            setting_key: For token_settings table, the setting key
            
        Returns:
            Encrypted value or original value if encryption not needed
        """
        if self.should_encrypt_field(table_name, field_name, setting_key):
            return self.encryption.encrypt_field(value)
        return value
    
    def decrypt_for_use(self, table_name: str, field_name: str, value: str, setting_key: str = None) -> str:
        """
        Decrypt a value for use in application
        
        Args:
            table_name: Name of the database table
            field_name: Name of the field
            value: Value to decrypt
            setting_key: For token_settings table, the setting key
            
        Returns:
            Decrypted value or original value if decryption not needed
        """
        if self.should_encrypt_field(table_name, field_name, setting_key):
            return self.encryption.decrypt_field(value)
        return value
    
    def encrypt_record(self, table_name: str, record: dict) -> dict:
        """
        Encrypt sensitive fields in a record
        
        Args:
            table_name: Name of the database table
            record: Dictionary containing record data
            
        Returns:
            Record with sensitive fields encrypted
        """
        encrypted_record = record.copy()
        
        for field_name, value in record.items():
            if isinstance(value, str):
                setting_key = record.get('setting_key') if table_name == 'token_settings' else None
                encrypted_record[field_name] = self.encrypt_for_storage(
                    table_name, field_name, value, setting_key
                )
        
        return encrypted_record
    
    def decrypt_record(self, table_name: str, record: dict) -> dict:
        """
        Decrypt sensitive fields in a record
        
        Args:
            table_name: Name of the database table
            record: Dictionary containing record data
            
        Returns:
            Record with sensitive fields decrypted
        """
        decrypted_record = record.copy()
        
        for field_name, value in record.items():
            if isinstance(value, str):
                setting_key = record.get('setting_key') if table_name == 'token_settings' else None
                decrypted_record[field_name] = self.decrypt_for_use(
                    table_name, field_name, value, setting_key
                )
        
        return decrypted_record


# Global instance
sensitive_field_manager = SensitiveFieldManager()


def get_sensitive_field_manager() -> SensitiveFieldManager:
    """Get the global sensitive field manager instance"""
    return sensitive_field_manager


def encrypt_field(value: str) -> str:
    """Convenience function to encrypt a field"""
    return sensitive_field_manager.encryption.encrypt_field(value)


def decrypt_field(value: str) -> str:
    """Convenience function to decrypt a field"""
    return sensitive_field_manager.encryption.decrypt_field(value)


def is_encrypted(value: str) -> bool:
    """Convenience function to check if a value is encrypted"""
    return sensitive_field_manager.encryption.is_encrypted(value)
