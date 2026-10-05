import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import ScaledText from '../components/ScaledText';
import { FAB, Searchbar, IconButton, Button, Divider, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, endOfWeek, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SyncStatus from '../components/SyncStatus';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Job } from '../types';
import { Spacing, BorderRadius, Shadows, Typography } from '../theme/colors';
import { useAppTheme, makeStyles } from '../theme';

export default function HomeScreen() {
  const { colors: Colors, gradients } = useAppTheme();
  const styles = useStyles();
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
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [ownerJobFilter, setOwnerJobFilter] = useState<'all' | 'mine' | 'employees'>(
    showEmployeeJobs ? 'all' : 'mine'
  );
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState<string>('all');
  
  // Function to group jobs by date and assign sequence numbers
  const processJobs = (jobsList: Job[]): {jobsWithSequence: Job[], jobsByDate: Record<string, Job[]>} => {
    const jobsByDate: Record<string, Job[]> = {};
    
    jobsList.forEach(job => {
      const dateKey = format(parseISO(job.date), 'yyyy-MM-dd');
      
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

  const employeeKeyForJob = (job: Job) =>
    job.employeeId || job.employeeName || 'unknown-employee';

  const employeeChoices = Array.from(
    jobs
      .filter(job => job.isEmployeeJob)
      .reduce((map, job) => {
        const key = employeeKeyForJob(job);
        if (!map.has(key)) {
          map.set(key, {
            key,
            name: job.employeeName || 'Employee',
          });
        }
        return map;
      }, new Map<string, { key: string; name: string }>())
      .values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Owners can view all work, only their own jobs, all employee jobs, or one
  // specific employee. Employee accounts continue to see their own feed.
  const filteredJobs = user?.role === 'owner'
    ? searchFilteredJobs.filter(job => {
        if (ownerJobFilter === 'mine') {
          return !job.isEmployeeJob;
        }

        if (ownerJobFilter === 'employees') {
          if (!job.isEmployeeJob) return false;
          return selectedEmployeeKey === 'all'
            || employeeKeyForJob(job) === selectedEmployeeKey;
        }

        return true;
      })
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
        const dateKey = format(parseISO(job.date), 'yyyy-MM-dd');
        if (!jobsByDateInWeek[dateKey]) {
          jobsByDateInWeek[dateKey] = [];
        }
        jobsByDateInWeek[dateKey].push(job);
      });
      
      const sortedDates = Object.keys(jobsByDateInWeek).sort((a, b) => {
        const dateA = parseISO(a).getTime();
        const dateB = parseISO(b).getTime();
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

  type FlatListItem =
    | { type: 'header'; id: string; weekEnd: string }
    | { type: 'job'; job: Job };

  const flatListData: FlatListItem[] = weekSections.flatMap(section => {
    const isCollapsed = collapsedWeeks.has(section.weekEnd);
    
    return [
      { 
        type: 'header', 
        id: `week-${section.weekEnd}`,
        weekEnd: section.weekEnd
      },
      ...(isCollapsed ? [] : section.jobs.map(job => ({ type: 'job', job })))
    ];
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddJob = () => {
    (navigation as any).navigate('AddJob');
  };

  const handleJobPress = (job: Job) => {
    (navigation as any).navigate('JobDetail', { job });
  };
  
  const toggleSortOrder = () => {
    setSortNewestFirst(!sortNewestFirst);
  };
  
  const toggleWeekCollapse = (weekEnd: string) => {
    setCollapsedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekEnd)) {
        newSet.delete(weekEnd);
      } else {
        newSet.add(weekEnd);
      }
      return newSet;
    });
  };

  const toggleAllWeeks = () => {
    if (allCollapsed) {
      // Expand all
      setCollapsedWeeks(new Set());
      setAllCollapsed(false);
    } else {
      // Collapse all
      setCollapsedWeeks(new Set(weekSections.map(s => s.weekEnd)));
      setAllCollapsed(true);
    }
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
      const weekJobs = weekSections.find(w => w.weekEnd === item.weekEnd)?.jobs || [];
      const isCollapsed = collapsedWeeks.has(item.weekEnd);
      
      const weekTotal = weekJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
      const isOwner = user?.role === 'owner';
      
      let displayAmount = weekTotal;
      if (!isOwner) {
        // For employees, calculate their share
        const commissionRate = user?.commissionRate || 50;
        displayAmount = (weekTotal * commissionRate) / 100;
      }
      
      return (
        <View style={styles.weekHeaderContainer}>
          <TouchableOpacity
            onPress={() => toggleWeekCollapse(item.weekEnd)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={gradients.primaryAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.weekHeaderGradient}
            >
              <View style={styles.weekHeaderContent}>
                <MaterialCommunityIcons
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={24}
                  color={Colors.textInverse}
                  style={styles.weekChevron}
                />
                <ScaledText
                  style={styles.weekEndText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Week ending {format(weekEndDate, 'MMM dd')}
                </ScaledText>
                <ScaledText
                  style={styles.weekTotalText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  ${Math.round(displayAmount).toLocaleString()}
                </ScaledText>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <TouchableOpacity 
          onPress={() => handleJobPress(item.job)}
          activeOpacity={0.7}
        >
          <JobCard 
            job={item.job} 
            onTogglePaid={handleTogglePaid}
            onDelete={handleDeleteJob}
          />
        </TouchableOpacity>
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
          style={styles.iconButton}
          iconColor={Colors.primary}
        />
        <IconButton
          icon={allCollapsed ? "chevron-down" : "chevron-up"}
          size={20}
          onPress={toggleAllWeeks}
          style={styles.iconButton}
          iconColor={Colors.primary}
        />
      </View>
      
      {user?.role === 'owner' && (
        <View style={styles.filterArea}>
          <View style={styles.filterContainer}>
            <Chip
              mode={ownerJobFilter === 'all' ? 'flat' : 'outlined'}
              onPress={() => {
                setOwnerJobFilter('all');
                setSelectedEmployeeKey('all');
                setShowEmployeeJobs(true);
              }}
              icon="account-group"
              style={[
                styles.filterChip,
                ownerJobFilter === 'all' && styles.filterChipActive
              ]}
              textStyle={ownerJobFilter === 'all' ? styles.filterChipActiveText : styles.filterChipText}
            >
              All Jobs
            </Chip>

            <Chip
              mode={ownerJobFilter === 'mine' ? 'flat' : 'outlined'}
              onPress={() => {
                setOwnerJobFilter('mine');
                setSelectedEmployeeKey('all');
                setShowEmployeeJobs(false);
              }}
              icon="account"
              style={[
                styles.filterChip,
                ownerJobFilter === 'mine' && styles.filterChipActive
              ]}
              textStyle={ownerJobFilter === 'mine' ? styles.filterChipActiveText : styles.filterChipText}
            >
              My Jobs
            </Chip>

            <Chip
              mode={ownerJobFilter === 'employees' ? 'flat' : 'outlined'}
              onPress={() => {
                setOwnerJobFilter('employees');
                setSelectedEmployeeKey('all');
                setShowEmployeeJobs(true);
              }}
              icon="account-hard-hat"
              style={[
                styles.filterChip,
                ownerJobFilter === 'employees' && styles.filterChipActive
              ]}
              textStyle={ownerJobFilter === 'employees' ? styles.filterChipActiveText : styles.filterChipText}
            >
              Employee Jobs
            </Chip>
          </View>

          {ownerJobFilter === 'employees' && employeeChoices.length > 1 && (
            <View style={styles.employeeFilterContainer}>
              <Chip
                compact
                mode={selectedEmployeeKey === 'all' ? 'flat' : 'outlined'}
                onPress={() => setSelectedEmployeeKey('all')}
                style={[
                  styles.employeeFilterChip,
                  selectedEmployeeKey === 'all' && styles.filterChipActive
                ]}
                textStyle={selectedEmployeeKey === 'all' ? styles.filterChipActiveText : styles.filterChipText}
              >
                All Employees
              </Chip>

              {employeeChoices.map(employee => (
                <Chip
                  key={employee.key}
                  compact
                  mode={selectedEmployeeKey === employee.key ? 'flat' : 'outlined'}
                  onPress={() => setSelectedEmployeeKey(employee.key)}
                  style={[
                    styles.employeeFilterChip,
                    selectedEmployeeKey === employee.key && styles.filterChipActive
                  ]}
                  textStyle={selectedEmployeeKey === employee.key ? styles.filterChipActiveText : styles.filterChipText}
                >
                  {employee.name}
                </Chip>
              ))}
            </View>
          )}
        </View>
      )}

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

const useStyles = makeStyles((Colors) => ({
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
  iconButton: {
    marginLeft: 0,
    marginRight: 4,
  },
  filterArea: {
    paddingBottom: Spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  employeeFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    borderColor: Colors.primary,
  },
  employeeFilterChip: {
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
    paddingHorizontal: Spacing.sm,
  },
  weekHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    columnGap: Spacing.sm,
  },
  weekChevron: {
    width: 36,
    marginLeft: 0,
    flexShrink: 0,
  },
  weekEndText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textInverse,
    flex: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
  weekTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textInverse,
    minWidth: 92,
    maxWidth: '34%',
    flexShrink: 1,
    textAlign: 'right',
    paddingRight: Spacing.xs,
  },
}));