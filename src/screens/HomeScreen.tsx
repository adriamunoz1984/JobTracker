import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { FAB, Searchbar, IconButton, Button, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, endOfWeek, startOfWeek, isSameDay, parseISO } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import JobCard from '../components/JobCard';
import { Job } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { jobs, updateJob, deleteJob } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortNewestFirst, setSortNewestFirst] = useState(true); // Default to newest first
  
  // Function to group jobs by date and assign sequence numbers
  const processJobs = (jobsList: Job[]): {jobsWithSequence: Job[], jobsByDate: Record<string, Job[]>} => {
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
    
    // Sort each date group by id or createdAt (to maintain original posting order)
    // and assign sequence numbers
    const jobsWithSequence: Job[] = [];
    
    Object.entries(jobsByDate).forEach(([dateKey, dateJobs]) => {
      // Sort jobs by creation timestamp/id to ensure original posting order
      const sortedJobs = [...dateJobs].sort((a, b) => {
        // Use createdAt if available, otherwise use id as a fallback
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id);
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id);
        return aTime - bTime; // Always sort in ascending order (oldest first within the date)
      });
      
      // Assign sequence numbers within the date group
      sortedJobs.forEach((job, index) => {
        jobsWithSequence.push({
          ...job,
          sequenceNumber: index + 1, // 1-based sequence number
          totalJobsOnDate: sortedJobs.length // Add total jobs count for this date
        });
      });
    });
    
    return { jobsWithSequence, jobsByDate };
  };
  
  // Group jobs by week for display
  const groupJobsByWeek = (processedJobs: Job[]): Record<string, Job[]> => {
    const jobsByWeek: Record<string, Job[]> = {};
    
    processedJobs.forEach(job => {
      const jobDate = parseISO(job.date);
      const weekEnd = format(endOfWeek(jobDate), 'yyyy-MM-dd'); // Saturday
      
      if (!jobsByWeek[weekEnd]) {
        jobsByWeek[weekEnd] = [];
      }
      
      jobsByWeek[weekEnd].push(job);
    });
    
    return jobsByWeek;
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
  const { jobsWithSequence, jobsByDate } = processJobs(filteredJobs);
  
  // Group by week
  const jobsByWeek = groupJobsByWeek(jobsWithSequence);
  
  // Create week section data
  const weekSections = Object.keys(jobsByWeek)
    .sort((a, b) => {
      // Parse dates for comparison
      const dateA = parseISO(a);
      const dateB = parseISO(b);
      // Sort based on the direction
      return sortNewestFirst ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    })
    .map(weekEnd => {
      const jobs = jobsByWeek[weekEnd];
      
      // Group jobs by date first
      const jobsByDateInWeek: Record<string, Job[]> = {};
      jobs.forEach(job => {
        const dateKey = job.date.split('T')[0];
        if (!jobsByDateInWeek[dateKey]) {
          jobsByDateInWeek[dateKey] = [];
        }
        jobsByDateInWeek[dateKey].push(job);
      });
      
      // Sort the dates based on the sort direction
      const sortedDates = Object.keys(jobsByDateInWeek).sort((a, b) => {
        const dateA = new Date(a).getTime();
        const dateB = new Date(b).getTime();
        return sortNewestFirst ? dateB - dateA : dateA - dateB;
      });
      
      // Create a new sorted job array, maintaining sequence order within dates
      const sortedJobs: Job[] = [];
      sortedDates.forEach(dateKey => {
        // For each date, sort by sequence number (always ascending)
        const dateJobs = [...jobsByDateInWeek[dateKey]].sort((a, b) => 
          (a.sequenceNumber || 1) - (b.sequenceNumber || 1)
        );
        
        // Add all jobs for this date to the final array
        sortedJobs.push(...dateJobs);
      });
      
      return {
        weekEnd,
        jobs: sortedJobs
      };
    });

  // Flatten the data for rendering
  const flatListData = weekSections.flatMap(section => [
    { 
      type: 'header', 
      id: `week-${section.weekEnd}`,
      weekEnd: section.weekEnd
    },
    ...section.jobs.map(job => ({ type: 'job', job }))
  ]);

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
    const jobToUpdate = jobs.find(job => job.id === jobId);
    if (jobToUpdate) {
      const updatedJob = { ...jobToUpdate, isPaid: isPaid };
      await updateJob(updatedJob);
    }
  };
  
  // Handle job deletion
  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId);
  };

  // Render item based on type
  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      // Parse the date to display
      const weekEndDate = parseISO(item.weekEnd);
      return (
        <View style={styles.weekHeader}>
          <Divider style={styles.weekDivider} />
          <Text style={styles.weekEndText}>Week ending {format(weekEndDate, 'MMM d, yyyy')}</Text>
          <Divider style={styles.weekDivider} />
        </View>
      );
    } else {
      return (
        <JobCard 
          job={item.job} 
          onTogglePaid={handleTogglePaid}
          onDelete={handleDeleteJob}
        />
      );
    }
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
      
      <View style={styles.sortLabelContainer}>
        <Button 
          mode="text" 
          compact 
          icon={sortNewestFirst ? "arrow-down" : "arrow-up"} 
          onPress={toggleSortOrder}
        >
          {sortNewestFirst ? "Newest first" : "Oldest first"}
        </Button>
      </View>

      <FlatList
        data={flatListData}
        keyExtractor={(item) => 
          item.type === 'header' ? item.id : `job-card-${item.job.id}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
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
  weekHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  weekDivider: {
    height: 1,
    backgroundColor: '#bdbdbd',
  },
  weekEndText: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#616161',
    backgroundColor: '#f0f0f0',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});