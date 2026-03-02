// src/components/NotificationBell.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { IconButton, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

const db = getFirestore();

export default function NotificationBell() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.uid || user.role !== 'employee') {
      setPendingCount(0);
      return;
    }

    // Real-time listener for pending jobs
    const jobsRef = collection(db, 'users', user.uid, 'ownerJobs');
    const q = query(jobsRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
      console.log(`🔔 Pending jobs notification count: ${snapshot.size}`);
    });

    return () => unsubscribe();
  }, [user?.uid, user?.role]);

  // Only show for employees
  if (user?.role !== 'employee') {
    return null;
  }

  const handlePress = () => {
    navigation.navigate('PendingJobs' as never);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View>
        <IconButton 
          icon="bell-outline" 
          size={24} 
          iconColor="#fff"
          style={styles.iconButton}
        />
        {pendingCount > 0 && (
          <Badge style={styles.badge}>
            {pendingCount}
          </Badge>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 4,
  },
  iconButton: {
    margin: 0,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    color: 'white',
    fontSize: 10,
    minWidth: 18,
    height: 18,
  },
});