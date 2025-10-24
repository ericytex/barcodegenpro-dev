"""
Database Connection Pool Manager for SQLite
Provides connection pooling and retry logic for better concurrency
"""

import sqlite3
import threading
import time
import os
from typing import Optional, Dict, Any
from contextlib import contextmanager
from queue import Queue, Empty
import logging

logger = logging.getLogger(__name__)


class SQLiteConnectionPool:
    """Thread-safe SQLite connection pool with retry logic"""
    
    def __init__(self, db_path: str, max_connections: int = 10, timeout: int = 30):
        self.db_path = db_path
        self.max_connections = max_connections
        self.timeout = timeout
        self._pool = Queue(maxsize=max_connections)
        self._lock = threading.Lock()
        self._created_connections = 0
        self._active_connections = 0
        
        # Initialize pool with one connection
        self._create_connection()
    
    def _create_connection(self) -> sqlite3.Connection:
        """Create a new database connection"""
        try:
            conn = sqlite3.connect(
                self.db_path,
                timeout=self.timeout,
                check_same_thread=False
            )
            # Enable WAL mode for better concurrency
            conn.execute("PRAGMA journal_mode=WAL")
            # Set busy timeout
            conn.execute(f"PRAGMA busy_timeout={self.timeout * 1000}")
            # Enable foreign keys
            conn.execute("PRAGMA foreign_keys=ON")
            
            with self._lock:
                self._created_connections += 1
            
            logger.debug(f"Created new database connection. Total: {self._created_connections}")
            return conn
            
        except sqlite3.Error as e:
            logger.error(f"Failed to create database connection: {e}")
            raise
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a connection from the pool"""
        try:
            # Try to get existing connection
            conn = self._pool.get_nowait()
            with self._lock:
                self._active_connections += 1
            return conn
            
        except Empty:
            # No connections available, create new one if under limit
            with self._lock:
                if self._created_connections < self.max_connections:
                    conn = self._create_connection()
                    self._active_connections += 1
                    return conn
            
            # Wait for a connection to become available
            try:
                conn = self._pool.get(timeout=self.timeout)
                with self._lock:
                    self._active_connections += 1
                return conn
            except Empty:
                raise sqlite3.OperationalError("No database connections available")
    
    def return_connection(self, conn: sqlite3.Connection):
        """Return a connection to the pool"""
        try:
            # Reset connection state
            conn.rollback()
            
            with self._lock:
                self._active_connections -= 1
            
            # Return to pool
            self._pool.put_nowait(conn)
            
        except Exception as e:
            logger.error(f"Error returning connection to pool: {e}")
            # Close the connection if it can't be returned
            try:
                conn.close()
            except:
                pass
            
            with self._lock:
                self._created_connections -= 1
                self._active_connections -= 1
    
    @contextmanager
    def get_connection_context(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = self.get_connection()
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                self.return_connection(conn)
    
    def close_all(self):
        """Close all connections in the pool"""
        with self._lock:
            while not self._pool.empty():
                try:
                    conn = self._pool.get_nowait()
                    conn.close()
                except Empty:
                    break
                except Exception as e:
                    logger.error(f"Error closing connection: {e}")
            
            self._created_connections = 0
            self._active_connections = 0
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        with self._lock:
            return {
                "max_connections": self.max_connections,
                "created_connections": self._created_connections,
                "active_connections": self._active_connections,
                "available_connections": self._pool.qsize(),
                "pool_size": self._pool.qsize()
            }


class DatabaseConnectionManager:
    """Singleton database connection manager"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.pool = None
            self.initialized = True
    
    def initialize(self, db_path: str, max_connections: int = 10, timeout: int = 30):
        """Initialize the connection pool"""
        if self.pool is None:
            self.pool = SQLiteConnectionPool(db_path, max_connections, timeout)
            logger.info(f"Database connection pool initialized: {max_connections} max connections")
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a connection from the pool"""
        if self.pool is None:
            raise RuntimeError("Connection pool not initialized")
        return self.pool.get_connection()
    
    def return_connection(self, conn: sqlite3.Connection):
        """Return a connection to the pool"""
        if self.pool is None:
            raise RuntimeError("Connection pool not initialized")
        self.pool.return_connection(conn)
    
    @contextmanager
    def get_connection_context(self):
        """Context manager for database connections"""
        if self.pool is None:
            raise RuntimeError("Connection pool not initialized")
        with self.pool.get_connection_context() as conn:
            yield conn
    
    def close_all(self):
        """Close all connections"""
        if self.pool:
            self.pool.close_all()
            self.pool = None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        if self.pool is None:
            return {"error": "Connection pool not initialized"}
        return self.pool.get_pool_stats()


# Global connection manager instance
connection_manager = DatabaseConnectionManager()


def get_connection_manager() -> DatabaseConnectionManager:
    """Get the global connection manager instance"""
    return connection_manager


def initialize_connection_pool(db_path: str, max_connections: int = 10, timeout: int = 30):
    """Initialize the global connection pool"""
    connection_manager.initialize(db_path, max_connections, timeout)


def get_connection() -> sqlite3.Connection:
    """Get a database connection from the pool"""
    return connection_manager.get_connection()


def return_connection(conn: sqlite3.Connection):
    """Return a database connection to the pool"""
    connection_manager.return_connection(conn)


@contextmanager
def get_connection_context():
    """Context manager for database connections"""
    with connection_manager.get_connection_context() as conn:
        yield conn
