// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile as fbUpdateProfile, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Import auth from the centralized config file
// Note: If you haven't created this file yet, you'll need to create it
import { auth } from '../firebase/config';

// Define the User type
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Define the context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  bypassAuthForTesting: () => void; // Added for testing
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Convert Firebase user to our User type
const formatUser = (firebaseUser: FirebaseUser | null): User | null => {
  if (!firebaseUser) return null;
  
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
};

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear error message
  const clearError = () => setError(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const formattedUser = formatUser(firebaseUser);
      setUser(formattedUser);
      
      // Store user data locally
      if (formattedUser) {
        await AsyncStorage.setItem('user', JSON.stringify(formattedUser));
      } else {
        await AsyncStorage.removeItem('user');
      }
      
      setIsLoading(false);
    });

    // Check for stored user data on first load
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser && !user) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load stored user', e);
      }
      setIsLoading(false);
    };

    loadStoredUser();

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Register a new user
  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      clearError();
      
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user profile
      await fbUpdateProfile(fbUser, {
        displayName: name,
      });
      
      // The auth state listener will handle updating the user state
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();
      await signInWithEmailAndPassword(auth, email, password);
      // The auth state listener will handle updating the user state
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with Google - simplified placeholder
  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      clearError();
      
      // This is just a placeholder that will be handled by bypassAuthForTesting
      console.log("Google Sign-In attempted - using bypass instead");
      
      // For a real implementation in the future, we'd handle Google Sign-In
      // properly with Expo/React Native methods
      
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // For development/testing - bypass authentication
  const bypassAuthForTesting = () => {
    // Create a test user
    const testUser: User = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
    };
    
    // Set the user in state
    setUser(testUser);
    
    // Store in AsyncStorage for persistence
    AsyncStorage.setItem('user', JSON.stringify(testUser));
  };

  // Logout
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // For test users, just clear the state
      if (user?.uid === 'test-user-id') {
        setUser(null);
        await AsyncStorage.removeItem('user');
        setIsLoading(false);
        return;
      }
      
      // For real users, sign out from Firebase
      await signOut(auth);
      // The auth state listener will handle updating the user state
    } catch (err: any) {
      setError(err.message || 'Failed to logout');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<User>) => {
    try {
      setIsLoading(true);
      clearError();
      
      // For test users, just update the state
      if (user?.uid === 'test-user-id') {
        const updatedUser = {
          ...user,
          ...data,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setIsLoading(false);
        return;
      }
      
      // For real users, update Firebase profile
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not logged in');
      }
      
      await fbUpdateProfile(currentUser, {
        displayName: data.displayName || currentUser.displayName,
        photoURL: data.photoURL || currentUser.photoURL,
      });
      
      // The auth state listener will handle updating the user state
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
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