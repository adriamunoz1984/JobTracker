import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, PaymentMethod, WeeklySummary } from '../types';

interface JobsContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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

  // Load jobs from AsyncStorage on component mount
  useEffect(() => {
    // In your JobsContext.tsx, when loading jobs from storage, ensure you're preserving the sequenceNumber
    const loadJobs = async () => {
      try {
        const jobsData = await AsyncStorage.getItem('jobs');
        if (jobsData) {
          setJobs(JSON.parse(jobsData));
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
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

  const addJob = async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newJob: Job = {
      ...jobData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    setJobs((prevJobs) => [...prevJobs, newJob]);
  };

  const updateJob = async (updatedJob: Job) => {
    const updatedJobs = jobs.map((job) =>
      job.id === updatedJob.id
        ? { ...updatedJob, updatedAt: new Date().toISOString() }
        : job
    );
    setJobs(updatedJobs);
  };

  const deleteJob = async (id: string) => {
    setJobs((prevJobs) => prevJobs.filter((job) => job.id !== id));
  };

  const getJobById = (id: string) => {
    return jobs.find((job) => job.id === id);
  };

  const getJobsByDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return jobs.filter((job) => {
      const jobDate = new Date(job.date);
      return jobDate >= start && jobDate <= end;
    });
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
      
    // Calculate net earnings according to the formula: (Total Earnings / 2) - Cash Payments
    const netEarnings = (totalEarnings / 2) - cashPayments;
    
    return {
      startDate,
      endDate,
      totalJobs: jobsInRange.length,
      totalEarnings,
      totalUnpaid,
      cashPayments,
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