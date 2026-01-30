// src/context/JobsContext.tsx - Enhanced with Firebase Cloud Sync
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Job, PaymentMethod, WeeklySummary } from '../types';
import { useAuth } from './AuthContext';

// Firebase imports
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const db = getFirestore();

interface JobsContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateJob: (job: Job) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  getJobById: (id: string) => Job | undefined;
  getJobsByDateRange: (startDate: string, endDate: string) => Job[];
  calculateWeeklySummary: (startDate: string, endDate: string) => WeeklySummary;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: Date | null;
  jobCount: number;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export const useJobs = () => {
  const context = useContext(JobsContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  return context;
};

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user } = useAuth();

  // Get user's Firebase collection path
  const getUserJobsCollection = () => {
    if (!user?.uid) return null;
    return collection(db, 'users', user.uid, 'jobs');
  };

  // Save to both AsyncStorage and Firebase
const saveJobsToStorage = async (jobsToSave: Job[]) => {
  try {
    // Always save to AsyncStorage for offline access
    await AsyncStorage.setItem('jobs', JSON.stringify(jobsToSave));
    console.log(`💾 Saved ${jobsToSave.length} jobs to AsyncStorage`);
    
    // Save to Firebase if user is logged in and not a test user
    if (user?.uid && user.uid !== 'test-user-id' && user.email !== 'test@example.com') {
      setSyncStatus('syncing');
      const jobsCollection = getUserJobsCollection();
      
      if (jobsCollection) {
        // Helper function to recursively remove undefined values
        const removeUndefined = (obj: any): any => {
          if (obj === null || obj === undefined) {
            return null;
          }
          
          if (Array.isArray(obj)) {
            return obj.map(removeUndefined);
          }
          
          if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const [key, value] of Object.entries(obj)) {
              if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
              }
            }
            return cleaned;
          }
          
          return obj;
        };
        
        // Save each job as a separate document
        const savePromises = jobsToSave.map(async (job) => {
          const jobDoc = doc(jobsCollection, job.id);
          
          // Clean the job data recursively
          const cleanJob = removeUndefined(job);
          
          const jobData = {
            ...cleanJob,
            lastModified: serverTimestamp(),
            syncedAt: new Date().toISOString()
          };
          
          await setDoc(jobDoc, jobData);
        });
        
        await Promise.all(savePromises);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        console.log(`☁️ Synced ${jobsToSave.length} jobs to Firebase`);
      }
    } else {
      // Test user - show as "offline" mode
      setSyncStatus('idle');
      console.log(`📱 Test user - jobs saved locally only`);
    }
  } catch (error) {
    console.error('❌ Error saving jobs:', error);
    setSyncStatus('error');
    
    // Still try to save to AsyncStorage even if Firebase fails
    try {
      await AsyncStorage.setItem('jobs', JSON.stringify(jobsToSave));
      console.log('✅ Saved to AsyncStorage as fallback');
    } catch (asyncError) {
      console.error('❌ AsyncStorage fallback failed:', asyncError);
    }
  }
};

  // Load jobs from Firebase or AsyncStorage
  const loadJobs = async () => {
    try {
      setIsLoading(true);
      setSyncStatus('syncing');
      
      let loadedJobs: Job[] = [];
      
      // Only try Firebase for real users, not test users
      if (user?.uid && user.uid !== 'test-user-id' && user.email !== 'test@example.com') {
        console.log('🔄 Loading jobs from Firebase for user:', user.email);
        
        try {
          // Try to load from Firebase first
          const jobsCollection = getUserJobsCollection();
          if (jobsCollection) {
            const jobsQuery = query(jobsCollection, orderBy('date', 'desc'));
            const snapshot = await getDocs(jobsQuery);
            
            loadedJobs = snapshot.docs.map(doc => {
              const data = doc.data();
              // Remove Firebase-specific fields for clean data
              const { lastModified, syncedAt, ...jobData } = data;
              return {
                id: doc.id,
                ...jobData
              } as Job;
            });
            
            console.log(`☁️ Loaded ${loadedJobs.length} jobs from Firebase`);
            
            // Save to AsyncStorage as backup
            await AsyncStorage.setItem('jobs', JSON.stringify(loadedJobs));
            setSyncStatus('synced');
            setLastSyncTime(new Date());
          }
        } catch (firebaseError) {
          console.error('❌ Firebase load failed:', firebaseError);
          setSyncStatus('error');
          
          // Fallback to AsyncStorage
          console.log('📱 Falling back to AsyncStorage');
          const jobsData = await AsyncStorage.getItem('jobs');
          if (jobsData) {
            loadedJobs = JSON.parse(jobsData);
            console.log(`✅ Loaded ${loadedJobs.length} jobs from AsyncStorage fallback`);
          }
        }
      } else {
        // Test user or no user - load from AsyncStorage only
        console.log('📱 Loading jobs from AsyncStorage (test user or no user)');
        const jobsData = await AsyncStorage.getItem('jobs');
        if (jobsData) {
          loadedJobs = JSON.parse(jobsData);
          console.log(`✅ Loaded ${loadedJobs.length} jobs from AsyncStorage`);
        }
        setSyncStatus('idle');
      }
      
      setJobs(loadedJobs);
    } catch (error) {
      console.error('❌ Error loading jobs:', error);
      setSyncStatus('error');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  

  const addJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newJob: Job = {
      ...jobData,
      id: jobId,
      createdAt: now,
      updatedAt: now,
    };

    const updatedJobs = [...jobs, newJob];
    setJobs(updatedJobs);
    
    // Save to storage and Firebase
    await saveJobsToStorage(updatedJobs);
    
    console.log(`✅ Added new job: ${jobId}`);
    return jobId;
  };
// Unified effect for loading and real-time sync
useEffect(() => {
  let unsubscribe: (() => void) | null = null;
  let isMounted = true;

  const initializeJobs = async () => {
    // Reset state when user changes
    setIsLoading(true);
    
    if (user?.uid && user.uid !== 'test-user-id' && user.email !== 'test@example.com') {
      // Real user - set up Firebase real-time listener
      console.log('👂 Setting up real-time listener for user:', user.email);
      setSyncStatus('syncing');
      
      const jobsCollection = getUserJobsCollection();
      if (jobsCollection) {
        const jobsQuery = query(jobsCollection, orderBy('date', 'desc'));
        
        unsubscribe = onSnapshot(jobsQuery, 
          (snapshot) => {
            if (!isMounted) return;
            
            const updatedJobs = snapshot.docs.map(doc => {
              const data = doc.data();
              const { lastModified, syncedAt, ...jobData } = data;
              return {
                id: doc.id,
                ...jobData
              } as Job;
            });
            
            console.log(`🔄 Real-time update: ${updatedJobs.length} jobs for ${user.email}`);
            setJobs(updatedJobs);
            setSyncStatus('synced');
            setLastSyncTime(new Date());
            setIsLoading(false);
            
            // Update AsyncStorage with latest data
            AsyncStorage.setItem('jobs', JSON.stringify(updatedJobs)).catch(err => {
              console.error('Error updating AsyncStorage:', err);
            });
          }, 
          (error) => {
            if (!isMounted) return;
            console.error('❌ Real-time listener error:', error);
            setSyncStatus('error');
            setIsLoading(false);
            
            // Fallback to AsyncStorage on error
            AsyncStorage.getItem('jobs').then(jobsData => {
              if (jobsData && isMounted) {
                const loadedJobs = JSON.parse(jobsData);
                console.log(`📱 Loaded ${loadedJobs.length} jobs from AsyncStorage (fallback)`);
                setJobs(loadedJobs);
              }
            }).catch(err => {
              console.error('AsyncStorage fallback failed:', err);
            });
          }
        );
      }
    } else if (!user) {
      // No user - clear jobs and load from AsyncStorage
      console.log('👤 No user - clearing jobs');
      setJobs([]);
      setSyncStatus('idle');
      setIsLoading(false);
    } else {
      // Test user - load from AsyncStorage only
      console.log('📱 Loading from AsyncStorage (test user)');
      await loadJobs();
    }
  };

  initializeJobs();

  // Cleanup function
  return () => {
    isMounted = false;
    if (unsubscribe) {
      unsubscribe();
      console.log('🔇 Cleaned up real-time listener');
    }
  };
}, [user?.uid, user?.email]); // Track both uid and email for account switches

  const updateJob = async (updatedJob: Job) => {
    const updatedJobs = jobs.map((job) =>
      job.id === updatedJob.id
        ? { ...updatedJob, updatedAt: new Date().toISOString() }
        : job
    );
    
    setJobs(updatedJobs);
    await saveJobsToStorage(updatedJobs);
    
    console.log(`✅ Updated job: ${updatedJob.id}`);
  };

  const deleteJob = async (id: string) => {
    const updatedJobs = jobs.filter((job) => job.id !== id);
    setJobs(updatedJobs);
    
    // Delete from Firebase if user is logged in
    if (user?.uid) {
      try {
        const jobsCollection = getUserJobsCollection();
        if (jobsCollection) {
          await deleteDoc(doc(jobsCollection, id));
          console.log(`☁️ Deleted job from Firebase: ${id}`);
        }
      } catch (error) {
        console.error('❌ Error deleting from Firebase:', error);
      }
    }
    
    // Update AsyncStorage
    await AsyncStorage.setItem('jobs', JSON.stringify(updatedJobs));
    console.log(`✅ Deleted job: ${id}`);
  };

  const getJobById = (id: string) => {
    return jobs.find((job) => job.id === id);
  };

  const getJobsByDateRange = (startDate: string, endDate: string): Job[] => {
    try {
      const startDateStr = startDate.split('T')[0];
      const endDateStr = endDate.split('T')[0];
      
      const jobsInRange = jobs.filter((job) => {
        try {
          const jobDateStr = job.date.split('T')[0];
          return jobDateStr >= startDateStr && jobDateStr <= endDateStr;
        } catch (error) {
          console.error(`Error filtering job ${job.id}:`, error);
          return false;
        }
      });
      
      return jobsInRange;
    } catch (error) {
      console.error('Error in getJobsByDateRange:', error);
      return [];
    }
  };

  const calculateWeeklySummary = (startDate: string, endDate: string): WeeklySummary => {
    const jobsInRange = getJobsByDateRange(startDate, endDate);
    
    const totalEarnings = jobsInRange.reduce((sum, job) => sum + job.amount, 0);
    const totalUnpaid = jobsInRange
      .filter(job => !job.isPaid)
      .reduce((sum, job) => sum + job.amount, 0);
      
    const cashPayments = jobsInRange
      .filter(job => job.isPaid && job.paymentMethod === 'Cash')
      .reduce((sum, job) => sum + job.amount, 0);
    
    const paidToMeAmount = jobsInRange
      .filter(job => job.isPaid && job.isPaidToMe)
      .reduce((sum, job) => sum + job.amount, 0);
      
    const netEarnings = (totalEarnings / 2) - cashPayments - paidToMeAmount;
    
    return {
      startDate,
      endDate,
      totalJobs: jobsInRange.length,
      totalEarnings,
      totalUnpaid,
      cashPayments,
      paidToMeAmount,
      netEarnings
    };
  };

  const value = {
    jobs,
    addJob,
    updateJob,
    deleteJob,
    getJobById,
    getJobsByDateRange,
    calculateWeeklySummary,
    isLoading,
    syncStatus,
    lastSyncTime,
    jobCount: jobs.length
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};