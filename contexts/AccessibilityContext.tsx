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
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState<FontSize | null>(null);
  const { currentUser } = useAuth();

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      setIsOnline(state.isConnected ?? true);
      
      // If we just came back online and have pending changes, sync them
      if (wasOffline && state.isConnected && pendingSync && currentUser) {
        syncToFirestore(pendingSync, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [isOnline, pendingSync, currentUser]);

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

  const value = {
    fontSize,
    setFontSize,
    fontScale: fontScales[fontSize],
    isOnline,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}
