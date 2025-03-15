import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { FAB, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import JobCard from '../components/JobCard';
import { Job } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { jobs, isLoading } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter jobs based on search query
  const filteredJobs = searchQuery
    ? jobs.filter(
        (job) =>
          job.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

  // Sort jobs by date (most recent first)
  const sortedJobs = [...filteredJobs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search jobs..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

<FlatList
  data={sortedJobs}
  keyExtractor={(item, index) => `job-card-${item.id}-${index}`}
  renderItem={({ item }) => (
    <JobCard job={item} onPress={() => handleJobPress(item)} />
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
  searchBar: {
    margin: 10,
    elevation: 2,
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