// src/screens/EmployeeManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  Title, 
  Paragraph, 
  TextInput,
  Portal,
  Dialog,
  Divider,
  List,
  IconButton,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';

const db = getFirestore();

export default function EmployeeManagementScreen() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Load employees
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    
    // Set up real-time listener for employees
    const employeesRef = collection(db, 'users', user.uid, 'employees');
    const unsubscribe = onSnapshot(employeesRef, (snapshot) => {
      const loadedEmployees = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as Employee));
      
      setEmployees(loadedEmployees);
      setIsLoading(false);
      console.log(`📋 Loaded ${loadedEmployees.length} employees`);
    }, (error) => {
      console.error('Error loading employees:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Send employee invitation
  const handleInviteEmployee = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      Alert.alert('Error', 'Please enter both name and email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    try {
      setIsSending(true);

      // Create employee invite
      const employeeId = `emp_${Date.now()}`;
      const employeeData: Employee = {
        uid: employeeId,
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim(),
        status: 'invited',
        commissionRate: 50, // Default 50%
        keepsCash: false,
        keepsCheck: false,
        invitedAt: new Date().toISOString(),
      };

      // Save to owner's employees collection
      await setDoc(
        doc(db, 'users', user!.uid, 'employees', employeeId),
        employeeData
      );

      // Create pending request for employee to see
      await setDoc(doc(db, 'employeeInvites', employeeId), {
        ownerId: user!.uid,
        ownerEmail: user!.email,
        ownerName: user!.displayName || 'Owner',
        ownerBusinessName: user!.businessName || 'Business',
        employeeEmail: inviteEmail.trim().toLowerCase(),
        employeeName: inviteName.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        'Invitation Sent!',
        `${inviteName} will receive your invitation when they sign up with ${inviteEmail}`
      );

      // Reset form
      setInviteEmail('');
      setInviteName('');
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Error inviting employee:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Update employee settings
  const handleUpdateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    try {
      await updateDoc(
        doc(db, 'users', user!.uid, 'employees', employeeId),
        updates as any
      );
      console.log('✅ Updated employee settings');
    } catch (error) {
      console.error('Error updating employee:', error);
      Alert.alert('Error', 'Failed to update employee settings');
    }
  };

  // Remove employee
  const handleRemoveEmployee = (employee: Employee) => {
    Alert.alert(
      'Remove Employee',
      `Are you sure you want to remove ${employee.name}? They will no longer have access to your business.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user!.uid, 'employees', employee.uid));
              Alert.alert('Success', `${employee.name} has been removed`);
            } catch (error) {
              console.error('Error removing employee:', error);
              Alert.alert('Error', 'Failed to remove employee');
            }
          }
        }
      ]
    );
  };

  if (!user || user.role !== 'owner') {
    return (
      <View style={styles.container}>
        <Text>Only business owners can access this screen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.title}>Employee Management</Title>
          <Paragraph style={styles.subtitle}>
            Manage your team and their settings
          </Paragraph>
        </View>

        <Button
          mode="contained"
          icon="account-plus"
          onPress={() => setShowInviteDialog(true)}
          style={styles.inviteButton}
        >
          Invite Employee
        </Button>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : employees.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Title>No Employees Yet</Title>
              <Paragraph>
                Invite your first employee to get started. They'll be able to track jobs
                and you'll see all their work in your dashboard.
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          employees.map((employee) => (
            <Card key={employee.uid} style={styles.employeeCard}>
              <Card.Content>
                <View style={styles.employeeHeader}>
                  <View style={styles.employeeInfo}>
                    <Title>{employee.name}</Title>
                    <Paragraph style={styles.email}>{employee.email}</Paragraph>
                    <Chip
                      mode="outlined"
                      style={[
                        styles.statusChip,
                        employee.status === 'active' ? styles.activeChip : styles.invitedChip
                      ]}
                    >
                      {employee.status === 'active' ? '✓ Active' : '⏳ Invited'}
                    </Chip>
                  </View>
                  <IconButton
                    icon="delete"
                    iconColor="#F44336"
                    size={24}
                    onPress={() => handleRemoveEmployee(employee)}
                  />
                </View>

                <Divider style={styles.divider} />

                {/* Commission Rate */}
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Commission Rate:</Text>
                  <View style={styles.rateButtons}>
                    {[30, 40, 50, 60, 70].map((rate) => (
                      <Button
                        key={rate}
                        mode={employee.commissionRate === rate ? 'contained' : 'outlined'}
                        onPress={() => handleUpdateEmployee(employee.uid, { commissionRate: rate })}
                        style={styles.rateButton}
                        compact
                      >
                        {rate}%
                      </Button>
                    ))}
                  </View>
                </View>

                {/* Payment Rules */}
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Employee Keeps:</Text>
                  <View style={styles.paymentToggles}>
                    <Button
                      mode={employee.keepsCash ? 'contained' : 'outlined'}
                      onPress={() => handleUpdateEmployee(employee.uid, { keepsCash: !employee.keepsCash })}
                      style={styles.toggleButton}
                      compact
                    >
                      💵 Cash
                    </Button>
                    <Button
                      mode={employee.keepsCheck ? 'contained' : 'outlined'}
                      onPress={() => handleUpdateEmployee(employee.uid, { keepsCheck: !employee.keepsCheck })}
                      style={styles.toggleButton}
                      compact
                    >
                      📝 Check
                    </Button>
                  </View>
                </View>

                {employee.acceptedAt && (
                  <Text style={styles.joinedText}>
                    Joined: {new Date(employee.acceptedAt).toLocaleDateString()}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Invite Dialog */}
      <Portal>
        <Dialog visible={showInviteDialog} onDismiss={() => setShowInviteDialog(false)}>
          <Dialog.Title>Invite Employee</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Employee Name"
              value={inviteName}
              onChangeText={setInviteName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Employee Email"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.dialogInput}
            />
            <Text style={styles.dialogHint}>
              The employee will need to sign up with this email to accept your invitation.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowInviteDialog(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onPress={handleInviteEmployee}
              loading={isSending}
              disabled={isSending}
            >
              Send Invite
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  inviteButton: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  employeeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  employeeInfo: {
    flex: 1,
  },
  email: {
    color: '#666',
    fontSize: 14,
  },
  statusChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  activeChip: {
    backgroundColor: '#E8F5E9',
  },
  invitedChip: {
    backgroundColor: '#FFF3E0',
  },
  divider: {
    marginVertical: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  rateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rateButton: {
    minWidth: 60,
  },
  paymentToggles: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
  },
  joinedText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  dialogInput: {
    marginBottom: 12,
  },
  dialogHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});