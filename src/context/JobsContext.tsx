// src/context/JobsContext.tsx with role-based calculations
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Job, PaymentMethod, WeeklySummary } from '../types';
import { useAuth } from './AuthContext';

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
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Format dates to compare only the date part (yyyy-MM-dd)
      const startFormatted = format(start, 'yyyy-MM-dd');
      const endFormatted = format(end, 'yyyy-MM-dd');
      
      console.log(`Formatted date range: ${startFormatted} to ${endFormatted}`);
      
      const jobsInRange = jobs.filter((job) => {
        try {
          // Create date object from job date
          const jobDate = new Date(job.date);
          
          // Format job date for comparison
          const jobDateFormatted = format(jobDate, 'yyyy-MM-dd');
          
          // Compare formatted dates as strings
          const isInRange = jobDateFormatted >= startFormatted && jobDateFormatted <= endFormatted;
          
          return isInRange;
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

  const calculateWeeklySummary = (startDate: string, endDate: string): WeeklySummary => {
    const jobsInRange = getJobsByDateRange(startDate, endDate);
    
    // Calculate total for all jobs in range
    const totalEarnings = jobsInRange.reduce((sum, job) => sum + job.amount, 0);
    const totalUnpaid = jobsInRange
      .filter(job => !job.isPaid)
      .reduce((sum, job) => sum + job.amount, 0);
    
    // Get cash and check payments that go to the employee
    const cashPayments = jobsInRange
      .filter(job => job.isPaid && job.paymentMethod === 'Cash' && job.paymentToMe)
      .reduce((sum, job) => sum + job.amount, 0);
      
    const checkPayments = jobsInRange
      .filter(job => job.isPaid && job.paymentMethod === 'Check' && job.paymentToMe)
      .reduce((sum, job) => sum + job.amount, 0);
    
    let netEarnings = 0;
    
    // Calculate net earnings based on role
    if (user?.role === 'owner') {
      // Owner gets 100% of profits
      netEarnings = totalEarnings;
    } else {
      // Employee calculation
      const commissionRate = (user?.commissionRate || 50) / 100;
      
      // Calculate commission on total jobs
      netEarnings = totalEarnings * commissionRate;
      
      // Adjust for cash/check payments the employee kept
      // Only subtract if the employee is configured to keep these payment types
      if (user?.keepsCash) {
        netEarnings -= cashPayments;
      }
      
      if (user?.keepsCheck) {
        netEarnings -= checkPayments;
      }
    }
    
    return {
      startDate,
      endDate,
      totalJobs: jobsInRange.length,
      totalEarnings,
      totalUnpaid,
      cashPayments,
      checkPayments, // New field for tracking check payments separately
      netEarnings,
      userRole: user?.role || 'employee',
      commissionRate: user?.commissionRate || 50
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