import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, updatePassword, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebaseConfig';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  userName: string;
  updateUserName: (name: string) => Promise<void>;
  changePassword: (newPassword: string, currentPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  weeklyGoal: number;
  monthlyGoal: number;
  updateGoals: (weekly: number, monthly: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(80);
  const [monthlyGoal, setMonthlyGoal] = useState(75);

  // Save user credentials to AsyncStorage
  const saveCredentials = async (email: string, password: string) => {
    try {
      await AsyncStorage.setItem('@auth_email', email);
      await AsyncStorage.setItem('@auth_password', password);
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  // Load and auto-login with saved credentials
  const loadAndLoginWithSavedCredentials = async () => {
    try {
      const email = await AsyncStorage.getItem('@auth_email');
      const password = await AsyncStorage.getItem('@auth_password');
      
      if (email && password) {
        console.log('Found saved credentials, attempting auto-login...');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Auto-login successful');
        return true;
      }
    } catch (error) {
      console.error('Auto-login failed:', error);
      // Clear invalid credentials
      await AsyncStorage.removeItem('@auth_email');
      await AsyncStorage.removeItem('@auth_password');
    }
    return false;
  };

  // Clear saved credentials
  const clearCredentials = async () => {
    try {
      await AsyncStorage.removeItem('@auth_email');
      await AsyncStorage.removeItem('@auth_password');
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    // Try to restore session on app start
    const initAuth = async () => {
      // First, try to restore with saved credentials
      const restored = await loadAndLoginWithSavedCredentials();
      
      // If no saved credentials or restore failed, mark as loaded
      if (!restored && isSubscribed) {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isSubscribed) return;

      setCurrentUser(user);
      if (user) {
        // Load user profile data
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || '');
            setWeeklyGoal(userData.weeklyGoal || 80);
            setMonthlyGoal(userData.monthlyGoal || 75);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUserName('');
        setWeeklyGoal(80);
        setMonthlyGoal(75);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    // Save credentials for persistence
    await saveCredentials(email, password);
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Save credentials for persistence
      await saveCredentials(email, password);
    } catch (error) {
      console.error('AuthContext login error:', error);
      throw error; // Re-throw the error so LoginScreen can handle it
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear saved credentials on logout
      await clearCredentials();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUserName = async (name: string) => {
    if (!currentUser) return;
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        name,
        email: currentUser.email,
        updatedAt: new Date(),
      }, { merge: true });
      
      setUserName(name);
    } catch (error) {
      console.error('Error updating user name:', error);
      throw error;
    }
  };

  const changePassword = async (newPassword: string, currentPassword: string) => {
    if (!currentUser || !currentUser.email) {
      throw new Error('No authenticated user');
    }
    
    try {
      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Now update the password
      await updatePassword(currentUser, newPassword);
      
      // Update saved credentials with new password
      await saveCredentials(currentUser.email, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  const updateGoals = async (weekly: number, monthly: number) => {
    if (!currentUser) return;
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        weeklyGoal: weekly,
        monthlyGoal: monthly,
        updatedAt: new Date(),
      }, { merge: true });
      
      setWeeklyGoal(weekly);
      setMonthlyGoal(monthly);
    } catch (error) {
      console.error('Error updating goals:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
    userName,
    updateUserName,
    changePassword,
    resetPassword,
    weeklyGoal,
    monthlyGoal,
    updateGoals
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
