import React, { createContext, useContext, useState, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationContextType {
  showNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  currentNotification: Notification | null;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);

  const hideNotification = useCallback(() => {
    setCurrentNotification(null);
    
    // Show next notification in queue if any
    setNotificationQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setTimeout(() => setCurrentNotification(next), 300);
        return rest;
      }
      return prev;
    });
  }, []);

  const showNotification = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 4000
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type
    };

    if (currentNotification) {
      // Queue notification if one is already showing
      setNotificationQueue(prev => [...prev, notification]);
    } else {
      setCurrentNotification(notification);
      
      // Auto-dismiss after specified duration
      setTimeout(() => {
        hideNotification();
      }, duration);
    }
  }, [currentNotification, hideNotification]);

  const value = {
    showNotification,
    currentNotification,
    hideNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
