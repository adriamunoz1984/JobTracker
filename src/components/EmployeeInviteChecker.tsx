// src/components/EmployeeInviteChecker.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';

const db = getFirestore();

interface PendingInvite {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerBusinessName: string;
}

export default function EmployeeInviteChecker() {
  const { user, updateProfile } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<PendingInvite | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check for pending invites when user logs in
  // useEffect(() => {
  //   if (!user?.email || user.role !== 'employee') {
  //     setIsChecking(false);
  //     return;
  //   }

  //   checkForInvites();
  // }, [user?.email, user?.role]);

  // const checkForInvites = async () => {
  //   if (!user?.email) {
  //     console.log('❌ No user email');
  //     return;
  //   }

  //   console.log('🔍 Checking invites for:', user.email);
  //   console.log('🔍 User role:', user.role);
  //   console.log('🔍 Owner status:', user.ownerStatus);
  //   console.log('🔍 Owner ID:', user.ownerId);

  //   try {
  //     setIsChecking(true);

  //     // Check if employee already has an owner
  //     if (user.ownerId && user.ownerStatus === 'active') {
  //       console.log('✅ Already connected to owner, skipping');
  //       setIsChecking(false);
  //       return;
  //     }

  //     // Query for pending invites
  //     const invitesRef = collection(db, 'employeeInvites');
  //     const q = query(
  //       invitesRef,
  //       where('employeeEmail', '==', user.email.toLowerCase()),
  //       where('status', '==', 'pending')
  //     );

  //     console.log('📡 Querying Firestore for:', user.email.toLowerCase());
  //     const snapshot = await getDocs(q);
  //     console.log('📊 Query results:', snapshot.size, 'invites found');
      
  //     snapshot.docs.forEach(doc => {
  //       console.log('📄 Found invite:', doc.id, doc.data());
  //     });
      
  //     if (snapshot.empty) {
  //       console.log('No pending invites found');
  //       setIsChecking(false);
  //       return;
  //     }

  //     const invites = snapshot.docs.map(doc => ({
  //       id: doc.id,
  //       ownerId: doc.data().ownerId,
  //       ownerName: doc.data().ownerName,
  //       ownerEmail: doc.data().ownerEmail,
  //       ownerBusinessName: doc.data().ownerBusinessName,
  //     } as PendingInvite));

  //     console.log(`Found ${invites.length} pending invite(s)`);
  //     setPendingInvites(invites);
      
  //     // Show the first invite
  //     if (invites.length > 0) {
  //       setCurrentInvite(invites[0]);
  //       setShowDialog(true);
  //     }
  //   } catch (error) {
  //     console.error('Error checking for invites:', error);
  //   } finally {
  //     setIsChecking(false);
  //   }
  // };

  // Check for pending invites when user logs in
useEffect(() => {
    console.log('=== INVITE CHECKER useEffect TRIGGERED ===');
    console.log('User email:', user?.email);
    console.log('User role:', user?.role);
    
    if (!user?.email) {
      console.log('❌ No user email, exiting');
      setIsChecking(false);
      return;
    }
    
    if (user.role !== 'employee') {
      console.log('❌ User is not employee, exiting. Role:', user.role);
      setIsChecking(false);
      return;
    }

    console.log('✅ Conditions met, calling checkForInvites()');
    checkForInvites();
  }, [user?.email, user?.role]);

  const checkForInvites = async () => {
  console.log('=== CHECK FOR INVITES STARTED ===');
  
  if (!user?.email) {
    console.log('❌ No user email in checkForInvites');
    return;
  }

  console.log('🔍 Checking invites for:', user.email);
  console.log('🔍 User role:', user.role);
  console.log('🔍 Owner status:', user.ownerStatus);
  console.log('🔍 Owner ID:', user.ownerId);

  try {
    setIsChecking(true);

    // Check if employee already has an owner
    if (user.ownerId && user.ownerStatus === 'active') {
      console.log('⚠️ Already connected to owner:', user.ownerId);
      // Still check for NEW invites - maybe they were removed and re-invited
      console.log('🔍 Checking for newer invites anyway...');
    }

    console.log('🔍 No active owner connection, proceeding with query');

    // Query for pending invites
    const invitesRef = collection(db, 'employeeInvites');
    const q = query(
      invitesRef,
      where('employeeEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending')
    );

    console.log('📡 Querying Firestore for:', user.email.toLowerCase());
    const snapshot = await getDocs(q);
    console.log('📊 Query completed. Documents found:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('❌ No documents in snapshot');
    }
    
    snapshot.docs.forEach((doc, index) => {
      console.log(`📄 Invite #${index + 1}:`, doc.id);
      console.log(`   Data:`, doc.data());
    });
    
    if (snapshot.empty) {
      console.log('No pending invites found');
      setIsChecking(false);
      return;
    }

    const invites = snapshot.docs.map(doc => ({
      id: doc.id,
      ownerId: doc.data().ownerId,
      ownerName: doc.data().ownerName,
      ownerEmail: doc.data().ownerEmail,
      ownerBusinessName: doc.data().ownerBusinessName,
    } as PendingInvite));

    console.log(`Found ${invites.length} pending invite(s)`);
    setPendingInvites(invites);
    
    // Show the first invite
    if (invites.length > 0) {
      setCurrentInvite(invites[0]);
      setShowDialog(true);
      console.log('✅ Showing invite dialog');
    }
  } catch (error) {
    console.error('Error checking for invites:', error);
  } finally {
    setIsChecking(false);
  }
};

  const handleAcceptInvite = async () => {
    if (!currentInvite || !user) return;

    try {
      setIsProcessing(true);

      // Update employee's profile with owner info
      await updateProfile({
        ownerId: currentInvite.ownerId,
        ownerStatus: 'active',
      });

      // Find and update the employee record in owner's collection by email
      const employeesRef = collection(db, 'users', currentInvite.ownerId, 'employees');
      const q = query(employeesRef, where('email', '==', user.email!.toLowerCase()));
      const empSnapshot = await getDocs(q);

      if (!empSnapshot.empty) {
        const employeeDoc = empSnapshot.docs[0];
        await updateDoc(employeeDoc.ref, {
          uid: user!.uid, // Store the REAL user ID
          status: 'active',
          acceptedAt: new Date().toISOString(),
        });
        console.log('✅ Updated employee record with real UID:', user!.uid);
      }

      // Mark invite as accepted
      await updateDoc(doc(db, 'employeeInvites', currentInvite.id), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      console.log(`✅ Accepted invitation from ${currentInvite.ownerBusinessName}`);

      // Remove from pending list
      const remaining = pendingInvites.filter(inv => inv.id !== currentInvite.id);
      setPendingInvites(remaining);

      // Show next invite or close dialog
      if (remaining.length > 0) {
        setCurrentInvite(remaining[0]);
      } else {
        setShowDialog(false);
        setCurrentInvite(null);
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      alert('Failed to accept invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!currentInvite) return;

    try {
      setIsProcessing(true);

      // Mark invite as declined
      await updateDoc(doc(db, 'employeeInvites', currentInvite.id), {
        status: 'declined',
        declinedAt: new Date().toISOString(),
      });

      // Update employee record in owner's collection
      const employeesRef = collection(db, 'users', currentInvite.ownerId, 'employees');
      const q = query(employeesRef, where('email', '==', user!.email!.toLowerCase()));
      const empSnapshot = await getDocs(q);

      if (!empSnapshot.empty) {
        const employeeDoc = empSnapshot.docs[0];
        await updateDoc(employeeDoc.ref, {
          status: 'declined',
        });
      }

      console.log(`❌ Declined invitation from ${currentInvite.ownerBusinessName}`);

      // Remove from pending list
      const remaining = pendingInvites.filter(inv => inv.id !== currentInvite.id);
      setPendingInvites(remaining);

      // Show next invite or close dialog
      if (remaining.length > 0) {
        setCurrentInvite(remaining[0]);
      } else {
        setShowDialog(false);
        setCurrentInvite(null);
      }
    } catch (error) {
      console.error('Error declining invite:', error);
      alert('Failed to decline invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render anything if not an employee or no invites
  if (!user || user.role !== 'employee' || isChecking) {
    return null;
  }

  return (
    <Portal>
      <Dialog visible={showDialog} dismissable={false}>
        <Dialog.Title>Invitation to Join Team</Dialog.Title>
        <Dialog.Content>
          {currentInvite && (
            <>
              <Text style={styles.businessName}>{currentInvite.ownerBusinessName}</Text>
              <Text style={styles.ownerInfo}>
                {currentInvite.ownerName} ({currentInvite.ownerEmail})
              </Text>
              <Text style={styles.message}>
                has invited you to join their team. By accepting, they will be able to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Assign jobs to you</Text>
                <Text style={styles.bullet}>• View your assigned job details</Text>
                <Text style={styles.bullet}>• Set your commission rate</Text>
                <Text style={styles.bullet}>• Configure payment handling rules</Text>
              </View>
              <Text style={styles.privacy}>
                Your personal jobs will remain private and only visible to you.
              </Text>
              {pendingInvites.length > 1 && (
                <Text style={styles.moreInvites}>
                  You have {pendingInvites.length - 1} more invitation(s) after this.
                </Text>
              )}
            </>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={handleDeclineInvite}
            disabled={isProcessing}
            textColor="#F44336"
          >
            Decline
          </Button>
          <Button
            onPress={handleAcceptInvite}
            disabled={isProcessing}
            loading={isProcessing}
            mode="contained"
          >
            Accept
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2196F3',
  },
  ownerInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 24,
    color: '#555',
  },
  privacy: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#2196F3',
    marginTop: 8,
    marginBottom: 8,
  },
  moreInvites: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});