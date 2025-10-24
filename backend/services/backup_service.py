"""
Backup Service for BarcodeGen Pro
Provides automated backup functionality integrated with the application
"""

import os
import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from pathlib import Path
import subprocess

logger = logging.getLogger(__name__)


class BackupService:
    """Service for managing automated database backups"""
    
    def __init__(self, db_path: str, backup_dir: str = None, retention_days: int = 30):
        self.db_path = db_path
        self.backup_dir = backup_dir or os.path.join(os.path.dirname(db_path), "backups")
        self.retention_days = retention_days
        self.backup_enabled = os.getenv("DATABASE_BACKUP_ENABLED", "true").lower() == "true"
        self.backup_interval_hours = int(os.getenv("DATABASE_BACKUP_INTERVAL_HOURS", "24"))
        self.auto_backup_thread = None
        self.running = False
        
        # Ensure backup directory exists
        Path(self.backup_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Backup service initialized: {db_path} -> {self.backup_dir}")
    
    def create_backup(self, compress: bool = True, encrypt: bool = False) -> Dict[str, Any]:
        """
        Create a backup of the database
        
        Args:
            compress: Whether to compress the backup
            encrypt: Whether to encrypt the backup
            
        Returns:
            Dictionary with backup information
        """
        if not self.backup_enabled:
            return {"success": False, "message": "Backup is disabled"}
        
        if not os.path.exists(self.db_path):
            return {"success": False, "message": "Database not found"}
        
        try:
            # Use the backup script
            script_path = os.path.join(os.path.dirname(__file__), "auto_backup.py")
            cmd = ["python3", script_path, "--db-path", self.db_path, "--backup-dir", self.backup_dir]
            
            if compress:
                cmd.append("--compress")
            if encrypt:
                cmd.append("--encrypt")
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                # Extract backup filename from output
                output_lines = result.stdout.strip().split('\n')
                backup_path = None
                for line in output_lines:
                    if "Backup created:" in line:
                        backup_path = line.split("Backup created:")[-1].strip()
                        break
                
                return {
                    "success": True,
                    "message": "Backup created successfully",
                    "backup_path": backup_path,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "message": f"Backup failed: {result.stderr}"
                }
                
        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Backup timed out"}
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return {"success": False, "message": str(e)}
    
    def cleanup_old_backups(self) -> Dict[str, Any]:
        """Clean up old backups"""
        try:
            script_path = os.path.join(os.path.dirname(__file__), "auto_backup.py")
            cmd = ["python3", script_path, "--db-path", self.db_path, "--backup-dir", self.backup_dir, "--cleanup"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                return {"success": True, "message": "Old backups cleaned up"}
            else:
                return {"success": False, "message": f"Cleanup failed: {result.stderr}"}
                
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            return {"success": False, "message": str(e)}
    
    def get_backup_stats(self) -> Dict[str, Any]:
        """Get backup statistics"""
        try:
            script_path = os.path.join(os.path.dirname(__file__), "auto_backup.py")
            cmd = ["python3", script_path, "--db-path", self.db_path, "--backup-dir", self.backup_dir, "--stats"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Parse stats from output
                stats = {
                    "total_backups": 0,
                    "total_size_mb": 0,
                    "latest_backup": None,
                    "latest_backup_date": None
                }
                
                for line in result.stdout.split('\n'):
                    if "Total backups:" in line:
                        stats["total_backups"] = int(line.split(":")[-1].strip())
                    elif "Total size:" in line:
                        size_str = line.split(":")[-1].strip().replace(" MB", "")
                        stats["total_size_mb"] = float(size_str)
                    elif "Latest backup:" in line:
                        stats["latest_backup"] = line.split(":")[-1].strip()
                    elif "Latest backup date:" in line:
                        stats["latest_backup_date"] = line.split(":")[-1].strip()
                
                return {"success": True, "stats": stats}
            else:
                return {"success": False, "message": f"Failed to get stats: {result.stderr}"}
                
        except Exception as e:
            logger.error(f"Failed to get backup stats: {e}")
            return {"success": False, "message": str(e)}
    
    def start_auto_backup(self):
        """Start automatic backup service"""
        if not self.backup_enabled:
            logger.info("Auto backup is disabled")
            return
        
        if self.running:
            logger.warning("Auto backup is already running")
            return
        
        self.running = True
        self.auto_backup_thread = threading.Thread(target=self._auto_backup_loop, daemon=True)
        self.auto_backup_thread.start()
        logger.info(f"Auto backup started (interval: {self.backup_interval_hours} hours)")
    
    def stop_auto_backup(self):
        """Stop automatic backup service"""
        self.running = False
        if self.auto_backup_thread:
            self.auto_backup_thread.join(timeout=5)
        logger.info("Auto backup stopped")
    
    def _auto_backup_loop(self):
        """Main loop for automatic backups"""
        while self.running:
            try:
                # Wait for the interval
                time.sleep(self.backup_interval_hours * 3600)
                
                if not self.running:
                    break
                
                logger.info("Starting scheduled backup")
                result = self.create_backup(compress=True, encrypt=False)
                
                if result["success"]:
                    logger.info("Scheduled backup completed successfully")
                    # Cleanup old backups
                    self.cleanup_old_backups()
                else:
                    logger.error(f"Scheduled backup failed: {result['message']}")
                    
            except Exception as e:
                logger.error(f"Error in auto backup loop: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get backup service status"""
        return {
            "enabled": self.backup_enabled,
            "running": self.running,
            "interval_hours": self.backup_interval_hours,
            "retention_days": self.retention_days,
            "backup_dir": self.backup_dir,
            "db_path": self.db_path
        }


# Global backup service instance
backup_service = None


def get_backup_service() -> Optional[BackupService]:
    """Get the global backup service instance"""
    return backup_service


def initialize_backup_service(db_path: str, backup_dir: str = None, retention_days: int = 30) -> BackupService:
    """Initialize the global backup service"""
    global backup_service
    backup_service = BackupService(db_path, backup_dir, retention_days)
    return backup_service


def start_backup_service():
    """Start the global backup service"""
    if backup_service:
        backup_service.start_auto_backup()


def stop_backup_service():
    """Stop the global backup service"""
    if backup_service:
        backup_service.stop_auto_backup()
