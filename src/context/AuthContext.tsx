// src/context/AuthContext.tsx - CORRECTED FOR YOUR ERRORS

import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { User as CustomUser, User } from '../types';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile as fbUpdateProfile, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// IMPORTANT: Only import if you have the library installed
// If not installed, comment out these lines and use the bypass method
try {
  var { GoogleSignin } = require('@react-native-google-signin/google-signin');
} catch (e) {
  console.log('Google Sign-In library not available, using bypass method');
}

import { auth } from '../firebase/config';

// interface User {
//   uid: string;
//   email: string | null;
//   displayName: string | null;
//   photoURL: string | null;
//   role?: 'owner' | 'employee';
//   commissionRate?: number;
//   keepsCash?: boolean;
//   keepsCheck?: boolean;
// }

interface AuthContextType {
  user: CustomUser | null;
  isLoading: boolean;
  register: (email: string, password: string, name: string, roleData?: any) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<CustomUser>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  bypassAuthForTesting: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const formatUser = (firebaseUser: FirebaseUser | null): CustomUser | null => {
  if (!firebaseUser) return null;
  
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    role: 'owner', // Default, will be overwritten by stored data
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('🔐 Auth state changed:', firebaseUser?.email);
    
    if (firebaseUser) {
      try {
        // Try to load from AsyncStorage first
        const userData = await AsyncStorage.getItem(`user_${firebaseUser.uid}`);
        console.log('📱 AsyncStorage data:', userData);
        
        if (userData) {
          const parsedData = JSON.parse(userData);
          const completeUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            ...parsedData, // This includes role and other custom fields
          };
          console.log('✅ Setting user with role:', completeUser.role);
          setUser(completeUser);
        } else {
          // No AsyncStorage data - try Firestore
          console.log('📡 No AsyncStorage data, loading from Firestore...');
          const db = getFirestore();
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid, 'profile', 'data'));
          
          if (profileDoc.exists()) {
            const firestoreData = profileDoc.data();
            const completeUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              ...firestoreData,
            };
            console.log('✅ Loaded from Firestore, role:', completeUser.role);
            setUser(completeUser);
            
            // Save to AsyncStorage for next time
            await AsyncStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(firestoreData));
          } else {
            // No data anywhere - this shouldn't happen for registered users
            console.warn('⚠️ No profile data found, using defaults');
            const defaultUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'employee' as const, // Default to employee
            };
            setUser(defaultUser);
          }
        }
        
        // Also update the simple 'user' key
        await AsyncStorage.setItem('user', JSON.stringify({ uid: firebaseUser.uid, email: firebaseUser.email }));
      } catch (e) {
        console.error('❌ Error loading user data:', e);
        // Fallback
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: 'employee' as const,
        });
      }
    } else {
      console.log('👤 No user, clearing state');
      setUser(null);
      await AsyncStorage.removeItem('user');
    }
    
    setIsLoading(false);
  });

  return () => unsubscribe();
}, []);

  const register = async (email: string, password: string, name: string, roleData?: any) => {
  try {
    setIsLoading(true);
    clearError();
    
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    await fbUpdateProfile(fbUser, {
      displayName: name,
    });
    
    // Prepare user data based on role
    const userData: Partial<CustomUser> = {
      role: roleData?.role || 'employee', // Default to employee, not owner
      email: email,
      displayName: name,
    };
    
    if (roleData?.role === 'owner') {
      // Owner-specific data
      userData.businessName = roleData.businessName;
      userData.commissionRate = 100;
      userData.keepsCash = true;
      userData.keepsCheck = true;
    } else if (roleData?.role === 'employee') {
      // Employee-specific data
      userData.ownerStatus = roleData.ownerStatus || 'none';
      userData.commissionRate = 50; // Default, owner can change
      userData.keepsCash = false; // Default, owner can change
      userData.keepsCheck = false; // Default, owner can change
      
      // If employee provided owner email, create pending request
      if (roleData.ownerEmail) {
        const db = getFirestore();
        await setDoc(doc(db, 'employeeRequests', fbUser.uid), {
          employeeEmail: email,
          employeeName: name,
          ownerEmail: roleData.ownerEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    // CRITICAL: Save to AsyncStorage IMMEDIATELY before onAuthStateChanged processes
    await AsyncStorage.setItem(`user_${fbUser.uid}`, JSON.stringify(userData));
    console.log('✅ Saved user data to AsyncStorage:', userData);
    
    // Save to Firestore profile
    const db = getFirestore();
    await setDoc(doc(db, 'users', fbUser.uid, 'profile', 'data'), {
      ...userData,
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Saved user data to Firestore');
    
  } catch (err: any) {
    setError(err.message || 'Failed to register');
    throw err;
  } finally {
    setIsLoading(false);
  }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED Google login - temporarily use bypass until proper setup
  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      clearError();
      
      // TEMPORARY FIX: Use bypass until Google OAuth is properly configured
      console.log("Google Sign-In temporarily disabled due to OAuth configuration issues");
      Alert.alert(
        "Google Sign-In Temporarily Unavailable", 
        "Please use email/password login or the bypass option while we fix the OAuth configuration.",
        [
          {
            text: "Use Bypass (Testing)", 
            onPress: () => {
              bypassAuthForTesting();
              setIsLoading(false);
            }
          },
          {
            text: "Cancel", 
            onPress: () => setIsLoading(false),
            style: "cancel"
          }
        ]
      );
      
      /* 
      UNCOMMENT THIS WHEN GOOGLE OAUTH IS PROPERLY CONFIGURED:
      
      if (!GoogleSignin) {
        throw new Error('Google Sign-In not available');
      }
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.idToken) {
        throw new Error('No ID token received from Google');
      }
      
      const credential = GoogleAuthProvider.credential(userInfo.idToken);
      const result = await signInWithCredential(auth, credential);
      
      if (result.additionalUserInfo?.isNewUser) {
        const userData = {
          role: 'owner' as const,
          commissionRate: 100,
          keepsCash: true,
          keepsCheck: true,
        };
        
        await AsyncStorage.setItem(`user_${result.user.uid}`, JSON.stringify(userData));
      }
      */
      
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to login with Google');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
  try {
    setIsLoading(true);
    
    if (user?.uid === 'test-user-id') {
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('jobs'); // Clear jobs for test user
      setIsLoading(false);
      return;
    }
    
    // Sign out from Google if available
    if (GoogleSignin) {
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.log('Google sign out error (non-fatal):', e);
      }
    }
    
    // Clear jobs before signing out
    await AsyncStorage.removeItem('jobs');
    
    await signOut(auth);
  } catch (err: any) {
    setError(err.message || 'Failed to logout');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

 const updateProfile = async (data: Partial<CustomUser>) => {
  try {
    setIsLoading(true);
    clearError();
    
    if (user?.uid === 'test-user-id') {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      await AsyncStorage.setItem(`user_${user.uid}`, JSON.stringify(data));
      setIsLoading(false);
      return;
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Not logged in');
    }
    
    // Update Firebase displayName/photoURL if provided
    if (data.displayName !== undefined || data.photoURL !== undefined) {
      await fbUpdateProfile(currentUser, {
        displayName: data.displayName || currentUser.displayName,
        photoURL: data.photoURL || currentUser.photoURL,
      });
    }
    
    // Save to AsyncStorage
    if (user) {
      const existingData = await AsyncStorage.getItem(`user_${user.uid}`);
      const existingParsed = existingData ? JSON.parse(existingData) : {};
      const mergedData = { ...existingParsed, ...data };
      
      await AsyncStorage.setItem(`user_${user.uid}`, JSON.stringify(mergedData));
      
      // Update local state
      setUser({ ...user, ...data });
    }
    
    // Save to Firestore - THIS WAS MISSING!
    const db = getFirestore();
    await setDoc(
      doc(db, 'users', currentUser.uid, 'profile', 'data'),
      data,
      { merge: true } // Merge with existing data instead of overwriting
    );
    
    console.log('✅ Profile updated in Firestore:', data);
    
  } catch (err: any) {
    console.error('❌ Update profile error:', err);
    setError(err.message || 'Failed to update profile');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      clearError();
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const bypassAuthForTesting = () => {
  const testUser: CustomUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    role: 'owner',
    businessName: 'Test Business',
    commissionRate: 100,
    keepsCash: true,
    keepsCheck: true,
  };
  
  setUser(testUser);
  AsyncStorage.setItem('user', JSON.stringify(testUser));
  AsyncStorage.setItem(`user_${testUser.uid}`, JSON.stringify({
    role: testUser.role,
    businessName: testUser.businessName,
    commissionRate: testUser.commissionRate,
    keepsCash: testUser.keepsCash,
    keepsCheck: testUser.keepsCheck,
  }));
};

  const value = {
    user,
    isLoading,
    register,
    login,
    loginWithGoogle,
    logout,
    updateProfile,
    resetPassword,
    error,
    clearError,
    bypassAuthForTesting,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};