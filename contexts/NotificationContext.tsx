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
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const hideNotification = useCallback(() => {
    setCurrentNotification(null);
    
    // Show next notification in queue immediately if any
    setNotificationQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setTimeout(() => setCurrentNotification(next), 100);
        return rest;
      }
      return prev;
    });
  }, []);

  const showNotification = useCallback((
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 2500
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type
    };
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Immediately show notification, replacing current one if exists
    setCurrentNotification(notification);
    
    // Clear any existing queue when setting a new notification
    setNotificationQueue([]);
    
    // Auto-dismiss after specified duration - longer for error notifications
    const dismissTimeout = type === 'error' ? 4000 : duration; // 4 seconds for errors, normal time for others
    timeoutRef.current = setTimeout(() => {
      hideNotification();
      timeoutRef.current = null;
    }, dismissTimeout);
  }, [hideNotification]);

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
