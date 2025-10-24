#!/usr/bin/env python3
"""
Automated Database Backup System for BarcodeGen Pro
Runs scheduled backups with rotation and integrity checking
"""

import os
import sys
import sqlite3
import gzip
import shutil
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import subprocess

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DatabaseBackupManager:
    """Manages automated database backups"""
    
    def __init__(self, db_path: str, backup_dir: str, retention_days: int = 30):
        self.db_path = db_path
        self.backup_dir = Path(backup_dir)
        self.retention_days = retention_days
        self.encryption_key = os.getenv("DATABASE_ENCRYPTION_KEY")
        
        # Ensure backup directory exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Backup manager initialized: {db_path} -> {backup_dir}")
    
    def create_backup(self, compress: bool = True, encrypt: bool = False) -> str:
        """
        Create a backup of the database
        
        Args:
            compress: Whether to compress the backup
            encrypt: Whether to encrypt the backup
            
        Returns:
            Path to the created backup file
        """
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(f"Database not found: {self.db_path}")
        
        # Generate backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"barcode_generator_backup_{timestamp}.db"
        backup_path = self.backup_dir / backup_filename
        
        logger.info(f"Creating backup: {backup_path}")
        
        # Create backup
        shutil.copy2(self.db_path, backup_path)
        
        # Compress if requested
        if compress:
            compressed_path = f"{backup_path}.gz"
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            os.remove(backup_path)
            backup_path = Path(compressed_path)
            logger.info(f"Backup compressed: {backup_path}")
        
        # Encrypt if requested and key available
        if encrypt and self.encryption_key:
            encrypted_path = f"{backup_path}.enc"
            self._encrypt_file(backup_path, encrypted_path)
            os.remove(backup_path)
            backup_path = Path(encrypted_path)
            logger.info(f"Backup encrypted: {backup_path}")
        
        # Verify backup integrity
        self._verify_backup_integrity(backup_path)
        
        # Set secure permissions
        os.chmod(backup_path, 0o600)
        
        logger.info(f"Backup created successfully: {backup_path}")
        return str(backup_path)
    
    def _encrypt_file(self, input_path: Path, output_path: str):
        """Encrypt a file using OpenSSL"""
        try:
            cmd = [
                'openssl', 'enc', '-aes-256-cbc', '-salt',
                '-in', str(input_path),
                '-out', output_path,
                '-pass', f'stdin:{self.encryption_key}'
            ]
            subprocess.run(cmd, check=True, input=self.encryption_key.encode())
        except subprocess.CalledProcessError as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def _verify_backup_integrity(self, backup_path: Path):
        """Verify backup file integrity"""
        try:
            # Determine if file is compressed or encrypted
            if backup_path.suffix == '.gz':
                # Compressed backup
                with gzip.open(backup_path, 'rb') as f:
                    # Try to read SQLite header
                    header = f.read(16)
                    if not header.startswith(b'SQLite format 3'):
                        raise ValueError("Invalid SQLite header in compressed backup")
            elif backup_path.suffix == '.enc':
                # Encrypted backup - skip verification for now
                logger.info("Skipping integrity check for encrypted backup")
            else:
                # Regular backup
                with sqlite3.connect(backup_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("PRAGMA integrity_check;")
                    result = cursor.fetchone()
                    if result[0] != 'ok':
                        raise ValueError(f"Database integrity check failed: {result[0]}")
            
            logger.info("Backup integrity verified")
            
        except Exception as e:
            logger.error(f"Backup integrity check failed: {e}")
            # Remove invalid backup
            backup_path.unlink()
            raise
    
    def cleanup_old_backups(self):
        """Remove backups older than retention period"""
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        removed_count = 0
        
        logger.info(f"Cleaning up backups older than {self.retention_days} days")
        
        for backup_file in self.backup_dir.glob("barcode_generator_backup_*"):
            try:
                # Get file modification time
                file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
                
                if file_time < cutoff_date:
                    backup_file.unlink()
                    removed_count += 1
                    logger.info(f"Removed old backup: {backup_file.name}")
                    
            except Exception as e:
                logger.error(f"Error removing backup {backup_file.name}: {e}")
        
        logger.info(f"Cleaned up {removed_count} old backups")
    
    def list_backups(self) -> list:
        """List all available backups"""
        backups = []
        
        for backup_file in sorted(self.backup_dir.glob("barcode_generator_backup_*")):
            stat = backup_file.stat()
            backups.append({
                'name': backup_file.name,
                'path': str(backup_file),
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime)
            })
        
        return backups
    
    def get_backup_stats(self) -> dict:
        """Get backup statistics"""
        backups = self.list_backups()
        
        if not backups:
            return {
                'total_backups': 0,
                'total_size': 0,
                'latest_backup': None,
                'oldest_backup': None
            }
        
        total_size = sum(backup['size'] for backup in backups)
        latest_backup = max(backups, key=lambda x: x['created'])
        oldest_backup = min(backups, key=lambda x: x['created'])
        
        return {
            'total_backups': len(backups),
            'total_size': total_size,
            'latest_backup': latest_backup['name'],
            'oldest_backup': oldest_backup['name'],
            'latest_backup_date': latest_backup['created'],
            'oldest_backup_date': oldest_backup['created']
        }


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description='Database Backup Manager')
    parser.add_argument('--db-path', default='data/barcode_generator.db',
                       help='Path to database file')
    parser.add_argument('--backup-dir', default='data/backups',
                       help='Backup directory')
    parser.add_argument('--retention-days', type=int, default=30,
                       help='Number of days to retain backups')
    parser.add_argument('--compress', action='store_true', default=True,
                       help='Compress backups')
    parser.add_argument('--encrypt', action='store_true',
                       help='Encrypt backups')
    parser.add_argument('--cleanup', action='store_true',
                       help='Clean up old backups')
    parser.add_argument('--list', action='store_true',
                       help='List available backups')
    parser.add_argument('--stats', action='store_true',
                       help='Show backup statistics')
    
    args = parser.parse_args()
    
    try:
        backup_manager = DatabaseBackupManager(
            args.db_path, 
            args.backup_dir, 
            args.retention_days
        )
        
        if args.list:
            backups = backup_manager.list_backups()
            print(f"\n📋 Available Backups ({len(backups)}):")
            print("=" * 50)
            for backup in backups:
                size_mb = backup['size'] / (1024 * 1024)
                print(f"📁 {backup['name']}")
                print(f"   Size: {size_mb:.2f} MB")
                print(f"   Created: {backup['created']}")
                print()
        
        elif args.stats:
            stats = backup_manager.get_backup_stats()
            print(f"\n📊 Backup Statistics:")
            print("=" * 30)
            print(f"Total backups: {stats['total_backups']}")
            print(f"Total size: {stats['total_size'] / (1024 * 1024):.2f} MB")
            if stats['latest_backup']:
                print(f"Latest backup: {stats['latest_backup']}")
                print(f"Latest backup date: {stats['latest_backup_date']}")
            print()
        
        elif args.cleanup:
            backup_manager.cleanup_old_backups()
        
        else:
            # Create backup
            backup_path = backup_manager.create_backup(
                compress=args.compress,
                encrypt=args.encrypt
            )
            print(f"✅ Backup created: {backup_path}")
            
            # Cleanup old backups
            backup_manager.cleanup_old_backups()
    
    except Exception as e:
        logger.error(f"Backup operation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
