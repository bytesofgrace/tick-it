import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  userName: string;
  updateUserName: (name: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

    return unsubscribe;
  }, []);

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    try {
      await signOut(auth);
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

  const changePassword = async (newPassword: string) => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    try {
      await updatePassword(currentUser, newPassword);
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
