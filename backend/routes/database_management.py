"""
Database Management API Routes for Super Admin
Provides comprehensive database management functionality
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Dict, List, Any, Optional
from datetime import datetime
import os
import logging

from routes.auth import get_current_user
# Removed verify_api_key import - not needed for JWT auth
from models.database import DatabaseManager
from services.backup_service import get_backup_service
from utils.encryption import get_sensitive_field_manager
from models.database_connection import get_connection_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/database", tags=["Database Management"])


def verify_super_admin(user: dict = Depends(get_current_user)):
    """Verify user is super admin"""
    if not user or not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# Debug endpoint to test authentication
@router.get("/debug/auth")
async def debug_auth(
    user: dict = Depends(get_current_user)
):
    """Debug endpoint to test authentication"""
    return {
        "success": True,
        "user": user,
        "is_super_admin": user.get("is_super_admin", False),
        "message": "Authentication debug info"
    }

# Database Health and Statistics
@router.get("/health")
async def get_database_health(
    user: dict = Depends(verify_super_admin)
):
    """Get comprehensive database health information"""
    try:
        db_manager = DatabaseManager()
        backup_service = get_backup_service()
        connection_manager = get_connection_manager()
        
        # Get database info
        db_info = db_manager.get_database_info()
        
        # Get backup service status
        backup_status = backup_service.get_service_status()
        
        # Get backup stats
        backup_stats_result = backup_service.get_backup_stats()
        backup_stats = backup_stats_result.get("stats", {}) if backup_stats_result.get("success") else {}
        
        # Get connection pool stats
        pool_stats = connection_manager.get_stats()
        
        # Get encryption status
        encryption_manager = get_sensitive_field_manager()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "path": db_info["database_path"],
                "exists": db_info["database_exists"],
                "size_bytes": db_info["database_size"],
                "size_mb": round(db_info["database_size"] / (1024 * 1024), 2),
                "permissions": db_info["database_permissions"],
                "backup_enabled": db_info["backup_enabled"],
                "backup_dir": db_info["backup_dir"],
                "last_backup": db_info["last_backup"]
            },
            "backup_service": {
                "enabled": backup_status["enabled"],
                "running": backup_status["running"],
                "interval_hours": backup_status["interval_hours"],
                "retention_days": backup_status["retention_days"],
                "total_backups": backup_stats.get("total_backups", 0),
                "total_size_mb": backup_stats.get("total_size_mb", 0),
                "latest_backup": backup_stats.get("latest_backup"),
                "latest_backup_date": backup_stats.get("latest_backup_date")
            },
            "connection_pool": pool_stats,
            "encryption": {
                "enabled": encryption_manager.encryption.fernet is not None,
                "encrypted_fields": list(encryption_manager.encrypted_fields.keys()),
                "encrypted_settings": list(encryption_manager.encrypted_setting_keys)
            }
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


# Database Statistics
@router.get("/statistics")
async def get_database_statistics(
    user: dict = Depends(verify_super_admin)
):
    """Get detailed database statistics"""
    try:
        db_manager = DatabaseManager()
        
        # Get table statistics
        stats = db_manager.get_database_statistics()
        
        # Get additional metrics
        additional_stats = {
            "total_tables": len(stats.get("table_counts", {})),
            "total_records": sum(stats.get("table_counts", {}).values()),
            "database_size_mb": round(stats.get("database_size", 0) / (1024 * 1024), 2),
            "last_updated": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "statistics": {**stats, **additional_stats}
        }
        
    except Exception as e:
        logger.error(f"Failed to get database statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Statistics retrieval failed: {str(e)}")


# Backup Management
@router.post("/backup/create")
async def create_database_backup(
    compress: bool = True,
    encrypt: bool = False,
    user: dict = Depends(verify_super_admin)
):
    """Create a new database backup"""
    try:
        backup_service = get_backup_service()
        
        result = backup_service.create_backup(compress=compress, encrypt=encrypt)
        
        if result["success"]:
            return {
                "success": True,
                "message": "Backup created successfully",
                "backup_path": result.get("backup_path"),
                "timestamp": result.get("timestamp")
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Backup creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backup creation failed: {str(e)}")


@router.get("/backup/list")
async def list_database_backups(
    user: dict = Depends(verify_super_admin)
):
    """List all available database backups"""
    try:
        backup_service = get_backup_service()
        
        # Use the backup script to list backups
        import subprocess
        script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "auto_backup.py")
        cmd = ["python3", script_path, "--list"]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            # Parse backup list from output
            backups = []
            lines = result.stdout.split('\n')
            current_backup = {}
            
            for line in lines:
                if line.startswith('📁'):
                    if current_backup:
                        backups.append(current_backup)
                    current_backup = {"name": line.replace('📁 ', '')}
                elif "Size:" in line:
                    current_backup["size"] = line.split("Size:")[-1].strip()
                elif "Created:" in line:
                    current_backup["created"] = line.split("Created:")[-1].strip()
            
            if current_backup:
                backups.append(current_backup)
            
            return {
                "success": True,
                "backups": backups,
                "total_count": len(backups)
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to list backups: {result.stderr}")
            
    except Exception as e:
        logger.error(f"Failed to list backups: {e}")
        raise HTTPException(status_code=500, detail=f"Backup listing failed: {str(e)}")


@router.post("/backup/restore")
async def restore_database_backup(
    backup_filename: str,
    user: dict = Depends(verify_super_admin)
):
    """Restore database from backup"""
    try:
        backup_service = get_backup_service()
        backup_path = os.path.join(backup_service.backup_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        # Use the restore script
        script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "restore_database.sh")
        
        import subprocess
        result = subprocess.run(
            ["bash", script_path],
            input=backup_path,
            text=True,
            capture_output=True,
            timeout=300
        )
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Database restored successfully",
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail=f"Restore failed: {result.stderr}")
            
    except Exception as e:
        logger.error(f"Database restore failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database restore failed: {str(e)}")


@router.delete("/backup/delete/{backup_filename}")
async def delete_database_backup(
    backup_filename: str,
    user: dict = Depends(verify_super_admin)
):
    """Delete a database backup"""
    try:
        backup_service = get_backup_service()
        backup_path = os.path.join(backup_service.backup_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        os.remove(backup_path)
        
        return {
            "success": True,
            "message": f"Backup {backup_filename} deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to delete backup: {e}")
        raise HTTPException(status_code=500, detail=f"Backup deletion failed: {str(e)}")


# Backup Service Management
@router.post("/backup/service/start")
async def start_backup_service(
    user: dict = Depends(verify_super_admin)
):
    """Start the automated backup service"""
    try:
        backup_service = get_backup_service()
        backup_service.start_auto_backup()
        
        return {
            "success": True,
            "message": "Backup service started successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to start backup service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start backup service: {str(e)}")


@router.post("/backup/service/stop")
async def stop_backup_service(
    user: dict = Depends(verify_super_admin)
):
    """Stop the automated backup service"""
    try:
        backup_service = get_backup_service()
        backup_service.stop_auto_backup()
        
        return {
            "success": True,
            "message": "Backup service stopped successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to stop backup service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop backup service: {str(e)}")


@router.post("/backup/cleanup")
async def cleanup_old_backups(
    user: dict = Depends(verify_super_admin)
):
    """Clean up old backups"""
    try:
        backup_service = get_backup_service()
        result = backup_service.cleanup_old_backups()
        
        return result
        
    except Exception as e:
        logger.error(f"Backup cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backup cleanup failed: {str(e)}")


# Database Configuration
@router.get("/config")
async def get_database_config(
    user: dict = Depends(verify_super_admin)
):
    """Get current database configuration"""
    try:
        config = {
            "database_path": os.getenv("DATABASE_PATH", "data/barcode_generator.db"),
            "backup_enabled": os.getenv("DATABASE_BACKUP_ENABLED", "true").lower() == "true",
            "backup_dir": os.getenv("DATABASE_BACKUP_DIR", "data/backups"),
            "backup_retention_days": int(os.getenv("DATABASE_BACKUP_RETENTION_DAYS", "30")),
            "backup_interval_hours": int(os.getenv("DATABASE_BACKUP_INTERVAL_HOURS", "24")),
            "max_connections": int(os.getenv("DATABASE_MAX_CONNECTIONS", "10")),
            "timeout": int(os.getenv("DATABASE_TIMEOUT", "30")),
            "encryption_enabled": bool(os.getenv("DATABASE_ENCRYPTION_KEY")),
            "encryption_algorithm": os.getenv("ENCRYPTION_ALGORITHM", "Fernet")
        }
        
        return {
            "success": True,
            "config": config
        }
        
    except Exception as e:
        logger.error(f"Failed to get database config: {e}")
        raise HTTPException(status_code=500, detail=f"Config retrieval failed: {str(e)}")


# Database Maintenance
@router.post("/maintenance/optimize")
async def optimize_database(
    user: dict = Depends(verify_super_admin)
):
    """Optimize database performance"""
    try:
        db_manager = DatabaseManager()
        
        # Run VACUUM and ANALYZE
        with db_manager.get_connection_context() as conn:
            cursor = conn.cursor()
            cursor.execute("VACUUM")
            cursor.execute("ANALYZE")
            conn.commit()
        
        return {
            "success": True,
            "message": "Database optimization completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Database optimization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database optimization failed: {str(e)}")


@router.post("/maintenance/integrity-check")
async def check_database_integrity(
    user: dict = Depends(verify_super_admin)
):
    """Check database integrity"""
    try:
        db_manager = DatabaseManager()
        
        with db_manager.get_connection_context() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA integrity_check")
            result = cursor.fetchone()
            
            integrity_ok = result[0] == 'ok'
            
            return {
                "success": True,
                "integrity_ok": integrity_ok,
                "result": result[0],
                "timestamp": datetime.now().isoformat()
            }
        
    except Exception as e:
        logger.error(f"Database integrity check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Integrity check failed: {str(e)}")


# Database Export/Import
@router.get("/export")
async def export_database(
    user: dict = Depends(verify_super_admin)
):
    """Export database as SQL dump"""
    try:
        db_manager = DatabaseManager()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_filename = f"database_export_{timestamp}.sql"
        export_path = os.path.join(db_manager.backup_dir, export_filename)
        
        # Create SQL dump
        import subprocess
        result = subprocess.run([
            "sqlite3", db_manager.db_path, ".dump"
        ], stdout=open(export_path, 'w'), stderr=subprocess.PIPE, text=True)
        
        if result.returncode == 0:
            return FileResponse(
                export_path,
                filename=export_filename,
                media_type='application/sql'
            )
        else:
            raise HTTPException(status_code=500, detail=f"Export failed: {result.stderr}")
            
    except Exception as e:
        logger.error(f"Database export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database export failed: {str(e)}")


# Security Monitoring
@router.get("/security/status")
async def get_security_status(
    user: dict = Depends(verify_super_admin)
):
    """Get database security status"""
    try:
        db_manager = DatabaseManager()
        encryption_manager = get_sensitive_field_manager()
        
        # Check file permissions
        db_path = db_manager.db_path
        if os.path.exists(db_path):
            stat_info = os.stat(db_path)
            permissions = oct(stat_info.st_mode)[-3:]
            secure_permissions = permissions in ['600', '640']
        else:
            permissions = "unknown"
            secure_permissions = False
        
        security_status = {
            "file_permissions": {
                "current": permissions,
                "secure": secure_permissions,
                "recommended": "600"
            },
            "encryption": {
                "enabled": encryption_manager.encryption.fernet is not None,
                "encrypted_tables": list(encryption_manager.encrypted_fields.keys()),
                "encrypted_settings": list(encryption_manager.encrypted_setting_keys)
            },
            "backup_security": {
                "enabled": db_manager.backup_enabled,
                "encrypted_backups": bool(os.getenv("DATABASE_ENCRYPTION_KEY")),
                "secure_location": db_manager.backup_dir
            },
            "connection_security": {
                "pooled_connections": True,
                "timeout_enabled": True,
                "wal_mode": True
            }
        }
        
        return {
            "success": True,
            "security_status": security_status,
            "overall_secure": secure_permissions and encryption_manager.encryption.fernet is not None
        }
        
    except Exception as e:
        logger.error(f"Security status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Security status check failed: {str(e)}")
