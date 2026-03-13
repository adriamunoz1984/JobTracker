// src/components/EmployeeInviteChecker.tsx
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';

const db = getFirestore();

interface Invite {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerBusinessName?: string;
  employeeEmail: string;
  status: string;
  createdAt: string;
}

export default function EmployeeInviteChecker() {
  const { user, updateProfile } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!user?.email || user?.role !== 'employee') return;

    console.log('🔍 Employee invite checker started for:', user.email);

    const invitesRef = collection(db, 'employeeInvites');
    const q = query(
      invitesRef,
      where('employeeEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invite));

      console.log(`📨 Found ${invites.length} pending invitations`);
      setPendingInvites(invites);

      if (invites.length > 0 && !showDialog) {
        setCurrentInvite(invites[0]);
        setShowDialog(true);
      }
    });

    return () => unsubscribe();
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (currentInvite && showDialog) {
      showInviteDialog(currentInvite);
    }
  }, [currentInvite, showDialog]);

  const showInviteDialog = (invite: Invite) => {
    const businessName = invite.ownerBusinessName || invite.ownerName;
    
    Alert.alert(
      'Job Invitation',
      `${businessName} has invited you to join their team!\n\nOwner: ${invite.ownerName}\nEmail: ${invite.ownerEmail}`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => handleDeclineInvite(invite)
        },
        {
          text: 'Accept',
          onPress: () => handleAcceptInvite(invite)
        }
      ],
      { cancelable: false }
    );
  };

  const handleAcceptInvite = async (invite: Invite) => {
    try {
      console.log(`✅ Accepting invitation from ${invite.ownerName}`);

      // Remove from pending list
      const remaining = pendingInvites.filter(inv => inv.id !== invite.id);
      setPendingInvites(remaining);

      // Cast to any to allow setting custom/profile-specific fields not present on User type
      await updateProfile({
        role: 'employee',
        ownerStatus: 'active',
        ownerId: invite.ownerId,
        ownerName: invite.ownerName,
        ownerEmail: invite.ownerEmail,
      } as any);

      // Update invite status
      await updateDoc(doc(db, 'employeeInvites', invite.id), {
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });

      // Add to owner's employees collection
      await setDoc(doc(db, 'users', invite.ownerId, 'employees', user!.uid), {
        uid: user!.uid,
        email: user!.email,
        displayName: user!.displayName || 'Employee',
        status: 'active',
        acceptedAt: new Date().toISOString()
      });

      console.log(`✅ Successfully accepted invitation from ${invite.ownerName}`);

      // Show next invite or close dialog
      if (remaining.length > 0) {
        setCurrentInvite(remaining[0]);
      } else {
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvite = async (invite: Invite) => {
    try {
      console.log(`❌ Declining invitation from ${invite.ownerName}`);

      // Remove from pending list
      const remaining = pendingInvites.filter(inv => inv.id !== invite.id);
      setPendingInvites(remaining);

      // Delete the invite
      await deleteDoc(doc(db, 'employeeInvites', invite.id));

      console.log(`✅ Successfully declined invitation from ${invite.ownerName}`);

      // Show next invite or close dialog
      if (remaining.length > 0) {
        setCurrentInvite(remaining[0]);
      } else {
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation. Please try again.');
    }
  };

  return null;
}