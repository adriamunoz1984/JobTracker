// src/components/SyncStatus.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme, makeStyles } from '../theme';

export default function SyncStatus() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const { syncStatus, lastSyncTime, jobCount } = useJobs();
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <IconButton icon="cloud-outline" size={16} iconColor={Colors.textLight} style={styles.icon} />
        <Text style={styles.offlineText}>Offline mode • {jobCount} jobs stored locally</Text>
      </View>
    );
  }

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'cloud-sync-outline';
      case 'synced':
        return 'cloud-check-outline';
      case 'error':
        return 'cloud-alert-outline';
      default:
        return 'cloud-outline';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return Colors.primary;
      case 'synced':
        return Colors.success;
      case 'error':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing to cloud...';
      case 'synced':
        if (lastSyncTime) {
          const timeStr = lastSyncTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          return `${jobCount} jobs synced • ${timeStr}`;
        }
        return `${jobCount} jobs synced to cloud`;
      case 'error':
        return 'Sync failed • Data saved locally';
      default:
        return `${jobCount} jobs ready to sync`;
    }
  };

  return (
    <View style={styles.container}>
      <IconButton 
        icon={getSyncIcon()} 
        size={16} 
        iconColor={getSyncColor()}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: getSyncColor() }]}>
        {getSyncText()}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  icon: {
    margin: 0,
    marginRight: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  offlineText: {
    fontSize: 13,
    color: Colors.textLight,
    flex: 1,
  },
}));