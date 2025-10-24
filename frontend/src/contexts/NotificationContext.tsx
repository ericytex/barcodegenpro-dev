import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTokens } from './TokenContext';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'token' | 'security' | 'general';
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deletedNotificationIds, setDeletedNotificationIds] = useState<Set<string>>(new Set());
  const { balance, tokenAccount } = useTokens();
  const { user } = useAuth();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // Create a unique key for this type of notification
    const notificationKey = `${notification.title}-${notification.category}`;
    
    // Check if this type of notification was manually deleted
    if (deletedNotificationIds.has(notificationKey)) {
      return; // Don't re-add deleted notifications
    }
    
    // Check if a similar notification already exists (same title and category)
    const existingNotification = notifications.find(n => 
      n.title === notification.title && n.category === notification.category
    );
    
    if (existingNotification) {
      // Update the existing notification instead of creating a new one
      setNotifications(prev => 
        prev.map(n => 
          n.id === existingNotification.id 
            ? { ...n, message: notification.message, timestamp: new Date() }
            : n
        )
      );
      return;
    }
    
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Remove notification
  const removeNotification = (id: string) => {
    // Find the notification being deleted
    const notificationToDelete = notifications.find(n => n.id === id);
    
    if (notificationToDelete) {
      // Create a key for this type of notification
      const notificationKey = `${notificationToDelete.title}-${notificationToDelete.category}`;
      
      // Track that this type of notification was manually deleted
      setDeletedNotificationIds(prev => new Set([...prev, notificationKey]));
      
      // Remove from notifications
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    // Track all current notifications as deleted
    const allNotificationKeys = notifications.map(n => `${n.title}-${n.category}`);
    setDeletedNotificationIds(prev => new Set([...prev, ...allNotificationKeys]));
    
    setNotifications([]);
  };

  // System monitoring functions
  useEffect(() => {
    if (!balance || !user) return;

    // Token balance warnings
    if (balance < 100 && balance > 0) {
      addNotification({
        type: 'warning',
        title: 'Low Token Balance',
        message: `You have ${balance} tokens remaining. Consider purchasing more tokens to avoid interruptions.`,
        category: 'token',
        actionUrl: '/settings?tab=tokens'
      });
    }

    if (balance === 0) {
      addNotification({
        type: 'error',
        title: 'No Tokens Available',
        message: 'You have no tokens available. Purchase tokens to continue generating barcodes.',
        category: 'token',
        actionUrl: '/settings?tab=tokens'
      });
    }

    // High token balance success
    if (balance >= 10000) {
      addNotification({
        type: 'success',
        title: 'High Token Balance',
        message: `Excellent! You have ${balance} tokens available for barcode generation.`,
        category: 'token'
      });
    }

  }, [balance, user]);

  // System notifications
  useEffect(() => {
    if (!user) return;

    // Welcome notification for new users
    const isNewUser = user.created_at && 
      new Date(user.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours

    if (isNewUser) {
      addNotification({
        type: 'info',
        title: 'Welcome to Barcode Generator Pro!',
        message: 'Get started by uploading an Excel file or exploring the design tools.',
        category: 'system'
      });
    }

    // Admin notifications
    if (user.is_super_admin) {
      addNotification({
        type: 'info',
        title: 'Super Admin Access',
        message: 'You have access to all administrative features including user management and token assignment.',
        category: 'system'
      });
    }

  }, [user]);

  // Security notifications
  useEffect(() => {
    if (!user) return;

    // Check for password age (if we had this data)
    const passwordAge = user.last_login ? 
      Date.now() - new Date(user.last_login).getTime() : 0;
    
    if (passwordAge > 90 * 24 * 60 * 60 * 1000) { // 90 days
      addNotification({
        type: 'warning',
        title: 'Security Reminder',
        message: 'Consider updating your password for better security.',
        category: 'security',
        actionUrl: '/settings?tab=account'
      });
    }

  }, [user]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    const savedDeletedIds = localStorage.getItem('deletedNotificationIds');
    
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        // Convert timestamp strings back to Date objects
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    }
    
    if (savedDeletedIds) {
      try {
        const parsed = JSON.parse(savedDeletedIds);
        setDeletedNotificationIds(new Set(parsed));
      } catch (error) {
        console.error('Error loading deleted notification IDs from localStorage:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Save deleted notification IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('deletedNotificationIds', JSON.stringify([...deletedNotificationIds]));
  }, [deletedNotificationIds]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
