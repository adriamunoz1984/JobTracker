// src/context/JobsContext.tsx - Enhanced with Employee Jobs for Owners
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
  serverTimestamp,
  where
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
  showEmployeeJobs: boolean;
  setShowEmployeeJobs: (show: boolean) => void;
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
  const [showEmployeeJobs, setShowEmployeeJobs] = useState(true); // Toggle for filtering
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

  const addJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newJob: Job = {
      ...jobData,
      id: jobId,
      createdAt: now,
      updatedAt: now,
      jobType: 'owner', // Default for now
    };

    const updatedJobs = [...jobs, newJob];
    setJobs(updatedJobs); // Update UI immediately
    
    console.log(`✅ Added new job: ${jobId}`);
    
    // Save to storage and Firebase in background
    saveJobsToStorage(updatedJobs).catch(err => {
      console.error('Background save failed:', err);
    });
    
    return jobId;
  };

  // Unified effect for loading and real-time sync
  useEffect(() => {
    let unsubscribes: Array<() => void> = [];
    let isMounted = true;

  const initializeJobs = async () => {
  setIsLoading(true);
  
  if (user?.uid && user.uid !== 'test-user-id' && user.email !== 'test@example.com') {
    console.log('👂 Setting up real-time listeners for user:', user.email);
    setSyncStatus('syncing');
    
    // Job cache to merge jobs from different sources
    const jobsCache = new Map<string, Job>();
    
    // Helper to merge jobs from different sources
    const updateAllJobs = (newJobs: Job[], source: string) => {
      // Update cache with new jobs from this source
      newJobs.forEach(job => {
        jobsCache.set(job.id, job);
      });
      
      // Combine all jobs and update state
      const combinedJobs = Array.from(jobsCache.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setJobs(combinedJobs);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      setIsLoading(false);
      
      console.log(`🔄 Total jobs loaded: ${combinedJobs.length}`);
      
      // Update AsyncStorage
      AsyncStorage.setItem('jobs', JSON.stringify(combinedJobs)).catch(err => {
        console.error('Error updating AsyncStorage:', err);
      });
    };

    // 1. Load owner's personal jobs
    const jobsCollection = getUserJobsCollection();
    if (jobsCollection) {
      const jobsQuery = query(jobsCollection, orderBy('date', 'desc'));
      
      const unsubscribeOwnerJobs = onSnapshot(jobsQuery, 
        (snapshot) => {
          if (!isMounted) return;
          
          const ownerJobs = snapshot.docs.map(doc => {
            const data = doc.data();
            const { lastModified, syncedAt, ...jobData } = data;
            return {
              id: doc.id,
              ...jobData,
              isOwnerJob: true,
            } as Job;
          });
          
          console.log(`👤 Owner jobs: ${ownerJobs.length}`);
          updateAllJobs(ownerJobs, 'owner');
        }, 
        (error) => {
          console.error('❌ Owner jobs listener error:', error);
        }
      );
      
      unsubscribes.push(unsubscribeOwnerJobs);
    }

    // 2. Load employee jobs if user is owner
    if (user.role === 'owner') {
      try {
        // Get list of employees
        const employeesRef = collection(db, 'users', user.uid, 'employees');
        const employeesSnapshot = await getDocs(employeesRef);
        
        const activeEmployees = employeesSnapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() }))
          .filter((emp: any) => emp.status === 'active');
        
        console.log(`👥 Found ${activeEmployees.length} active employees`);

        // Set up listeners for each employee's completed jobs
        activeEmployees.forEach((employee: any) => {
          const employeeJobsRef = collection(db, 'users', employee.uid, 'ownerJobs');
          const employeeJobsQuery = query(
            employeeJobsRef,
            where('ownerId', '==', user.uid),
            where('status', '==', 'completed')
          );
          
          const unsubscribeEmployeeJobs = onSnapshot(employeeJobsQuery,
            (snapshot) => {
              if (!isMounted) return;
              
              const employeeJobs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  isEmployeeJob: true,
                  employeeName: employee.name,
                  employeeId: employee.uid,
                } as Job;
              });
              
              console.log(`👷 Employee ${employee.name} jobs: ${employeeJobs.length}`);
              updateAllJobs(employeeJobs, employee.uid);
            },
            (error) => {
              console.error(`❌ Employee ${employee.name} jobs listener error:`, error);
            }
          );
          
          unsubscribes.push(unsubscribeEmployeeJobs);
        });
      } catch (error) {
        console.error('❌ Error loading employee jobs:', error);
      }
    }
    
  } else if (!user) {
    console.log('👤 No user - clearing jobs');
    setJobs([]);
    setSyncStatus('idle');
    setIsLoading(false);
  } else {
    // Test user - load from AsyncStorage only
    console.log('📱 Loading from AsyncStorage (test user)');
    const jobsData = await AsyncStorage.getItem('jobs');
    if (jobsData && isMounted) {
      const loadedJobs = JSON.parse(jobsData);
      setJobs(loadedJobs);
    }
    setSyncStatus('idle');
    setIsLoading(false);
  }
};
    initializeJobs();

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribes.forEach(unsub => unsub());
      if (unsubscribes.length > 0) {
        console.log(`🔇 Cleaned up ${unsubscribes.length} real-time listeners`);
      }
    };
  }, [user?.uid, user?.email, user?.role]);

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
    jobCount: jobs.length,
    showEmployeeJobs,
    setShowEmployeeJobs,
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};