import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { FAB, Searchbar, IconButton, Button, Divider, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, endOfWeek, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import SyncStatus from '../components/SyncStatus';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Job } from '../types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/colors';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { 
    jobs, 
    getJobsByDateRange, 
    calculateWeeklySummary,
    showEmployeeJobs,
    setShowEmployeeJobs,
    updateJob,
    deleteJob,
  } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  
  // Function to group jobs by date and assign sequence numbers
  const processJobs = (jobsList: Job[]): {jobsWithSequence: Job[], jobsByDate: Record<string, Job[]>} => {
    const jobsByDate: Record<string, Job[]> = {};
    
    jobsList.forEach(job => {
      const dateKey = job.date.split('T')[0];
      
      if (!jobsByDate[dateKey]) {
        jobsByDate[dateKey] = [];
      }
      
      jobsByDate[dateKey].push(job);
    });
    
    const jobsWithSequence: Job[] = [];
    
    Object.entries(jobsByDate).forEach(([dateKey, dateJobs]) => {
      const sortedJobs = [...dateJobs].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id);
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id);
        return aTime - bTime;
      });
      
      sortedJobs.forEach((job, index) => {
        jobsWithSequence.push({
          ...job,
          sequenceNumber: index + 1,
          totalJobsOnDate: sortedJobs.length
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
      const weekEnd = format(endOfWeek(jobDate), 'yyyy-MM-dd');
      
      if (!jobsByWeek[weekEnd]) {
        jobsByWeek[weekEnd] = [];
      }
      
      jobsByWeek[weekEnd].push(job);
    });
    
    return jobsByWeek;
  };
  
  // Filter jobs based on search query
  const searchFilteredJobs = searchQuery
    ? jobs.filter(
        (job) =>
          job.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

  // Filter jobs based on employee toggle
  const filteredJobs = (user?.role === 'owner' && !showEmployeeJobs)
    ? searchFilteredJobs.filter(job => !(job as any).isEmployeeJob)
    : searchFilteredJobs;

  const { jobsWithSequence, jobsByDate } = processJobs(filteredJobs);
  const jobsByWeek = groupJobsByWeek(jobsWithSequence);
  
  // Create week section data
  const weekSections = Object.keys(jobsByWeek)
    .sort((a, b) => {
      const dateA = parseISO(a);
      const dateB = parseISO(b);
      return sortNewestFirst ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    })
    .map(weekEnd => {
      const jobs = jobsByWeek[weekEnd];
      
      const jobsByDateInWeek: Record<string, Job[]> = {};
      jobs.forEach(job => {
        const dateKey = job.date.split('T')[0];
        if (!jobsByDateInWeek[dateKey]) {
          jobsByDateInWeek[dateKey] = [];
        }
        jobsByDateInWeek[dateKey].push(job);
      });
      
      const sortedDates = Object.keys(jobsByDateInWeek).sort((a, b) => {
        const dateA = new Date(a).getTime();
        const dateB = new Date(b).getTime();
        return sortNewestFirst ? dateB - dateA : dateA - dateB;
      });
      
      const sortedJobs: Job[] = [];
      sortedDates.forEach(dateKey => {
        const dateJobs = [...jobsByDateInWeek[dateKey]].sort((a, b) => 
          (a.sequenceNumber || 1) - (b.sequenceNumber || 1)
        );
        sortedJobs.push(...dateJobs);
      });
      
      return {
        weekEnd,
        jobs: sortedJobs
      };
    });

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
  
  const toggleSortOrder = () => {
    setSortNewestFirst(!sortNewestFirst);
  };
  
  const handleTogglePaid = async (jobId: string, isPaid: boolean) => {
    const jobToUpdate = jobs.find(job => job.id === jobId);
    if (jobToUpdate) {
      const updatedJob = { ...jobToUpdate, isPaid: isPaid };
      await updateJob(updatedJob);
    }
  };
  
  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(jobId);
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      const weekEndDate = parseISO(item.weekEnd);
      return (
        <View style={styles.weekHeaderContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.weekHeaderGradient}
          >
            <Text style={styles.weekEndText}>
              📅 Week ending {format(weekEndDate, 'MMM d, yyyy')}
            </Text>
          </LinearGradient>
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

  // Calculate summary stats
  const totalJobs = filteredJobs.length;
  const totalAmount = filteredJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
  const paidAmount = filteredJobs.filter(j => j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <View style={styles.container}>
      <SyncStatus />
      
      {/* Summary Stats Bar */}
    

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search jobs..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={Colors.primary}
          placeholderTextColor={Colors.textSecondary}
        />
        <IconButton
          icon={sortNewestFirst ? "sort-calendar-descending" : "sort-calendar-ascending"}
          size={24}
          onPress={toggleSortOrder}
          style={styles.sortButton}
          iconColor={Colors.primary}
        />
      </View>
      
      <View style={styles.filterContainer}>
        
        
        {user?.role === 'owner' && (
          <Chip
            mode={showEmployeeJobs ? 'flat' : 'outlined'}
            onPress={() => setShowEmployeeJobs(!showEmployeeJobs)}
            icon={showEmployeeJobs ? 'account-group' : 'account'}
            style={[
              styles.filterChip,
              showEmployeeJobs && styles.filterChipActive
            ]}
            textStyle={showEmployeeJobs ? styles.filterChipActiveText : styles.filterChipText}
          >
            {showEmployeeJobs ? 'All Jobs' : 'My Jobs'}
          </Chip>
        )}
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
    backgroundColor: Colors.background,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.medium,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryValue: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.textInverse,
    opacity: 0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
  },
  sortButton: {
    marginLeft: Spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    borderColor: Colors.primary,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.primary,
  },
  filterChipActiveText: {
    color: Colors.textInverse,
  },
  listContent: {
    paddingBottom: 80,
  },
  weekHeaderContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    ...Shadows.small,
  },
  weekHeaderGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  weekEndText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
});