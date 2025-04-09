// src/context/JobsContext.tsx with role-based calculations
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Job, PaymentMethod, WeeklySummary } from '../types';
import { useAuth } from './AuthContext';
import { isDateInRange, toDateString, createLocalDate } from '../utils/DateUtils';

interface JobsContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateJob: (job: Job) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  getJobById: (id: string) => Job | undefined;
  getJobsByDateRange: (startDate: string, endDate: string) => Job[];
  calculateWeeklySummary: (startDate: string, endDate: string) => WeeklySummary;
  isLoading: boolean;
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
  const { user } = useAuth();

  // Load jobs from AsyncStorage on component mount
  useEffect(() => {
    const loadJobs = async () => {
      try {
        setIsLoading(true);
        const jobsData = await AsyncStorage.getItem('jobs');
        if (jobsData) {
          const parsedJobs = JSON.parse(jobsData);
          console.log(`Loaded ${parsedJobs.length} jobs from storage`);
          setJobs(parsedJobs);
        } else {
          console.log('No jobs found in storage');
          setJobs([]);
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, []);

  // Save jobs to AsyncStorage whenever they change
  useEffect(() => {
    const saveJobs = async () => {
      try {
        await AsyncStorage.setItem('jobs', JSON.stringify(jobs));
      } catch (error) {
        console.error('Failed to save jobs:', error);
      }
    };
  
    if (!isLoading) {
      saveJobs();
    }
  }, [jobs, isLoading]);

  const addJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const jobId = Date.now().toString();
    
    const newJob: Job = {
      ...jobData,
      id: jobId,
      createdAt: now,
      updatedAt: now,
    };

    setJobs((prevJobs) => [...prevJobs, newJob]);
    console.log(`Added new job with ID: ${jobId}`);
    return jobId;
  };

  const updateJob = async (updatedJob: Job) => {
    const updatedJobs = jobs.map((job) =>
      job.id === updatedJob.id
        ? { ...updatedJob, updatedAt: new Date().toISOString() }
        : job
    );
    setJobs(updatedJobs);
    console.log(`Updated job with ID: ${updatedJob.id}`);
  };

  const deleteJob = async (id: string) => {
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== id));
    console.log(`Deleted job with ID: ${id}`);
  };

  const getJobById = (id: string) => {
    return jobs.find((job) => job.id === id);
  };

  const getJobsByDateRange = (startDate: string, endDate: string): Job[] => {
    try {
      console.log(`Getting jobs between ${startDate} and ${endDate}`);
      
      // Make sure we're working with date strings that have the right format
      const startDateStr = startDate.split('T')[0];
      const endDateStr = endDate.split('T')[0];
      
      console.log(`Using date range: ${startDateStr} to ${endDateStr}`);
      
      const jobsInRange = jobs.filter((job) => {
        try {
          // Get the date part of the job date
          const jobDateStr = job.date.split('T')[0];
          
          // Simple string comparison for dates in YYYY-MM-DD format
          // or use the utility function for more complex cases
          return jobDateStr >= startDateStr && jobDateStr <= endDateStr;
          
          // Alternative using the utility function:
          // return isDateInRange(job.date, startDate, endDate);
        } catch (error) {
          console.error(`Error filtering job ${job.id}:`, error);
          return false;
        }
      });
      
      console.log(`Found ${jobsInRange.length} jobs in range`);
      return jobsInRange;
    } catch (error) {
      console.error('Error in getJobsByDateRange:', error);
      return [];
    }
  };

  // This is just the updated calculateWeeklySummary function from JobsContext.tsx

  const calculateWeeklySummary = (startDate: string, endDate: string): WeeklySummary => {
    const jobsInRange = getJobsByDateRange(startDate, endDate);
    
    const totalEarnings = jobsInRange.reduce((sum, job) => sum + job.amount, 0);
    const totalUnpaid = jobsInRange
      .filter(job => !job.isPaid)
      .reduce((sum, job) => sum + job.amount, 0);
      
    // Calculate cash payments
    const cashPayments = jobsInRange
      .filter(job => job.isPaid && job.paymentMethod === 'Cash')
      .reduce((sum, job) => sum + job.amount, 0);
    
    // Calculate payments made directly to you
    const paidToMeAmount = jobsInRange
      .filter(job => job.isPaid && job.isPaidToMe)
      .reduce((sum, job) => sum + job.amount, 0);
      
    // Calculate net earnings according to the updated formula: 
    // (Total Earnings / 2) - Cash Payments - Paid To Me Payments
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
    isLoading
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};