import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

type FontSize = 'small' | 'medium' | 'large';

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => Promise<void>;
  fontScale: number;
  isOnline: boolean;
  isConnected: boolean; // actual network state
  offlineMode: boolean; // user preference
  toggleOfflineMode: () => Promise<void>;
}

const fontScales = {
  small: 0.9,
  medium: 1.0,
  large: 1.15,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [isConnected, setIsConnected] = useState(true); // actual network state
  const [offlineMode, setOfflineMode] = useState(false); // user preference
  const [pendingSync, setPendingSync] = useState<FontSize | null>(null);
  const { currentUser } = useAuth();

  // isOnline combines both network state and user preference
  const isOnline = isConnected && !offlineMode;

  // Load offline mode preference
  useEffect(() => {
    const loadOfflineMode = async () => {
      try {
        const mode = await AsyncStorage.getItem('@offline_mode');
        if (mode) {
          setOfflineMode(mode === 'true');
        }
      } catch (error) {
        console.error('Failed to load offline mode preference:', error);
      }
    };
    loadOfflineMode();
  }, []);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const newConnectionState = state.isConnected ?? true;
      setIsConnected(newConnectionState);
      
      // If we just came back online and have pending changes, sync them
      if (wasOffline && newConnectionState && !offlineMode && pendingSync && currentUser) {
        syncToFirestore(pendingSync, currentUser.uid);
      }

      // Sync pending notification settings when coming back online
      if (wasOffline && newConnectionState && !offlineMode && currentUser) {
        syncNotificationSettings(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [isOnline, pendingSync, currentUser, offlineMode]);

  // Load settings from AsyncStorage first, then Firestore
  useEffect(() => {
    if (!currentUser) return;

    const loadAccessibilitySettings = async () => {
      try {
        // Load from AsyncStorage first (works offline)
        const cachedFontSize = await AsyncStorage.getItem('@font_size');
        if (cachedFontSize) {
          setFontSizeState(cachedFontSize as FontSize);
        }

        // Then try to load from Firestore (will fail silently if offline)
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.fontSize) {
              setFontSizeState(data.fontSize);
              // Update AsyncStorage cache
              await AsyncStorage.setItem('@font_size', data.fontSize);
            }
          }
        } catch (firestoreError) {
          // If Firestore fails (offline), we already have the cached value
          console.log('Using cached font size (offline)');
        }
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    };

    loadAccessibilitySettings();
  }, [currentUser]);

  // Helper function to sync to Firestore
  const syncToFirestore = async (size: FontSize, userId: string) => {
    try {
      await setDoc(
        doc(db, 'users', userId),
        { fontSize: size },
        { merge: true }
      );
      console.log('✓ Font size synced to Firestore');
      setPendingSync(null);
    } catch (error) {
      console.error('Failed to sync font size:', error);
      // Keep it pending if sync fails
    }
  };

  // Helper function to sync notification settings
  const syncNotificationSettings = async (userId: string) => {
    try {
      const hasPending = await AsyncStorage.getItem('@notification_settings_pending');
      if (hasPending === 'true') {
        console.log('🚀 [Global] Syncing pending notification settings...');
        const cachedSettings = await AsyncStorage.getItem('@notification_settings');
        if (cachedSettings) {
          const settings = JSON.parse(cachedSettings);
          console.log('📤 [Global] Syncing to Firestore:', settings);
          await setDoc(
            doc(db, 'users', userId),
            {
              notificationFrequency: settings.frequency,
              notificationsEnabled: settings.notificationsEnabled,
              reminderHour: settings.reminderHour,
              reminderMinute: settings.reminderMinute,
              selectedDays: settings.selectedDays,
              oneTimeDate: settings.oneTimeDate,
            },
            { merge: true }
          );
          await AsyncStorage.removeItem('@notification_settings_pending');
          console.log('✅ [Global] Notification settings synced successfully!');
        }
      }
    } catch (error) {
      console.error('❌ [Global] Error syncing notification settings:', error);
    }
  };

  const setFontSize = async (size: FontSize) => {
    if (!currentUser) return;

    // Always save to AsyncStorage first (works offline)
    try {
      await AsyncStorage.setItem('@font_size', size);
      setFontSizeState(size);
      console.log('✓ Font size saved locally');
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }

    // Try to sync to Firestore if online
    if (isOnline) {
      try {
        await syncToFirestore(size, currentUser.uid);
      } catch (error) {
        // If sync fails, mark as pending for later
        console.log('⏳ Font size will sync when connection is restored');
        setPendingSync(size);
      }
    } else {
      // We're offline, mark for sync when we reconnect
      console.log('📴 Offline - will sync when connection is restored');
      setPendingSync(size);
    }
  };

  const toggleOfflineMode = async () => {
    try {
      const newMode = !offlineMode;
      await AsyncStorage.setItem('@offline_mode', newMode.toString());
      setOfflineMode(newMode);
      console.log(newMode ? '📴 Offline mode enabled' : '🟢 Online mode enabled');
    } catch (error) {
      console.error('Failed to toggle offline mode:', error);
    }
  };

  const value = {
    fontSize,
    setFontSize,
    fontScale: fontScales[fontSize],
    isOnline,
    isConnected,
    offlineMode,
    toggleOfflineMode,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}
