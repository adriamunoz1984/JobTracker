import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { FAB, Searchbar, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import JobCard from '../components/JobCard';
import { Job } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { jobs, updateJob, deleteJob } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortNewestFirst, setSortNewestFirst] = useState(true); // Default to newest first
  
  // Function to assign sequence numbers to jobs with the same date
  const assignSequenceNumbers = (jobsList: Job[]): Job[] => {
    // Group jobs by date
    const jobsByDate: Record<string, Job[]> = {};
    
    jobsList.forEach(job => {
      // Get just the date part (without time)
      const dateKey = job.date.split('T')[0];
      
      if (!jobsByDate[dateKey]) {
        jobsByDate[dateKey] = [];
      }
      
      jobsByDate[dateKey].push(job);
    });
    
    // Sort each group by id (assuming newer jobs have higher ids)
    // and assign sequence numbers
    const jobsWithSequence: Job[] = [];
    
    Object.values(jobsByDate).forEach(dateJobs => {
      // Sort jobs by id (assuming id has some chronological aspect)
      const sortedJobs = [...dateJobs].sort((a, b) => 
        parseInt(a.id) - parseInt(b.id)
      );
      
      // Assign sequence numbers
      sortedJobs.forEach((job, index) => {
        jobsWithSequence.push({
          ...job,
          sequenceNumber: index + 1
        });
      });
    });
    
    return jobsWithSequence;
  };
  
  // Filter jobs based on search query
  const filteredJobs = searchQuery
    ? jobs.filter(
        (job) =>
          job.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

  // Process jobs with sequence numbers
  const processedJobs = assignSequenceNumbers(filteredJobs);
  
  // Sort jobs by date (based on sortNewestFirst flag)
  const sortedJobs = [...processedJobs].sort(
    (a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortNewestFirst ? dateB - dateA : dateA - dateB;
    }
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddJob = () => {
    navigation.navigate('AddJob' as never);
  };

  const handleJobPress = (job: Job) => {
    navigation.navigate('JobDetail' as never, { jobId: job.id } as never);
  };
  
  // Toggle sort order
  const toggleSortOrder = () => {
    setSortNewestFirst(!sortNewestFirst);
  };
  
  // Handle toggle payment status
  const handleTogglePaid = async (jobId: string, isPaid: boolean) => {
    console.log('Toggle paid called for job:', jobId, 'New isPaid value:', isPaid);
    
    const jobToUpdate = jobs.find(job => job.id === jobId);
    if (jobToUpdate) {
      console.log('Found job to update:', jobToUpdate);
      const updatedJob = { ...jobToUpdate, isPaid: isPaid };
      await updateJob(updatedJob);
      console.log('Job updated successfully');
    } else {
      console.log('Job not found for ID:', jobId);
    }
  };
  
  // Handle job deletion
  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search jobs..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <IconButton
          icon={sortNewestFirst ? "sort-calendar-descending" : "sort-calendar-ascending"}
          size={24}
          onPress={toggleSortOrder}
          style={styles.sortButton}
          color="#2196F3"
        />
      </View>

      <FlatList
        data={sortedJobs}
        keyExtractor={(item) => `job-card-${item.id}`}
        renderItem={({ item }) => (
          <JobCard 
            job={item} 
            onTogglePaid={handleTogglePaid}
            onDelete={handleDeleteJob}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddJob}
        label="Add Job"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  searchBar: {
    flex: 1,
    marginBottom: 0,
  },
  sortButton: {
    marginLeft: 5,
  },
  sortLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  listContent: {
    padding: 10,
    paddingBottom: 80, // Space for the FAB
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});