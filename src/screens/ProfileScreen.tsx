// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Paragraph, Button, Divider, Text, TextInput, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/colors';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, updateProfile, logout } = useAuth();
  const [isCheckingInvites, setIsCheckingInvites] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [commissionRate, setCommissionRate] = useState(user?.commissionRate?.toString() || '50');
  const [keepsCash, setKeepsCash] = useState(user?.keepsCash !== false);
  const [keepsCheck, setKeepsCheck] = useState(user?.keepsCheck !== false);
  
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setCommissionRate(user.commissionRate?.toString() || '50');
      setKeepsCash(user.keepsCash !== false);
      setKeepsCheck(user.keepsCheck !== false);
    }
  }, [user]);
  
  const handleSaveProfile = async () => {
    try {
      await updateProfile({ displayName });
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  
  const handleSavePaymentSettings = async () => {
    try {
      const commissionRateNum = parseInt(commissionRate, 10);
      if (isNaN(commissionRateNum) || commissionRateNum < 1 || commissionRateNum > 100) {
        Alert.alert('Invalid Rate', 'Commission rate must be between 1 and 100');
        return;
      }
      
      await updateProfile({
        commissionRate: commissionRateNum,
        keepsCash,
        keepsCheck
      });
      
      setIsEditingPayment(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update payment settings');
    }
  };
  
  const handleToggleRole = async () => {
    const newRole = user?.role === 'owner' ? 'employee' : 'owner';
    
    Alert.alert(
      'Change Role',
      `Switch to ${newRole} mode? This will change how your earnings are calculated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateProfile({ 
                role: newRole,
                ...(newRole === 'employee' ? {
                  commissionRate: user?.commissionRate || 50,
                  keepsCash: user?.keepsCash !== undefined ? user.keepsCash : false,
                  keepsCheck: user?.keepsCheck !== undefined ? user.keepsCheck : false,
                } : {
                  commissionRate: 100,
                  keepsCash: true,
                  keepsCheck: true,
                })
              });
            } catch (e) {
              Alert.alert('Error', 'Failed to change role');
            }
          }
        }
      ]
    );
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              console.error('Logout error:', e);
            }
          }
        }
      ]
    );
  };

  const handleCheckInvites = async () => {
    if (!user?.email) return;
    
    try {
      setIsCheckingInvites(true);
      
      const db = getFirestore();
      const invitesRef = collection(db, 'employeeInvites');
      const q = query(
        invitesRef,
        where('employeeEmail', '==', user.email.toLowerCase()),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert('No Invitations', 'You don\'t have any pending invitations at this time.');
      } else {
        Alert.alert(
          'Invitations Found!',
          `You have ${snapshot.size} pending invitation(s). Log out and back in to view them.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Log Out Now', onPress: () => logout() }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking invites:', error);
      Alert.alert('Error', 'Failed to check for invitations');
    } finally {
      setIsCheckingInvites(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>👤 Profile</Text>
        <Text style={styles.headerSubtitle}>
          {user?.role === 'owner' ? '👔 Business Owner' : '👷 Employee'}
        </Text>
      </LinearGradient>

      {/* Profile Info Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleLarge" style={styles.cardTitle}>Personal Information</Text>
            <Button 
              mode="text" 
              onPress={() => setIsEditing(!isEditing)} 
              icon={isEditing ? "check" : "pencil"}
              textColor={Colors.primary}
              compact
            >
              {isEditing ? "Done" : "Edit"}
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {isEditing ? (
            <View>
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
              
              <Button 
                mode="contained" 
                onPress={handleSaveProfile}
                style={styles.saveButton}
                buttonColor={Colors.primary}
                icon="check"
              >
                Save Changes
              </Button>
            </View>
          ) : (
            <View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{user?.displayName || 'Not set'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user?.email || 'Not available'}</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
            {/* Dashboard */}
      {/* <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>📈 Dashboard</Text>
          <Divider style={styles.divider} />
          <Paragraph style={styles.subtitle}>
            View trends, analytics, and performance metrics
          </Paragraph>
          <Button
            mode="contained"
            icon="view-dashboard"
            onPress={() => navigation.navigate('Dashboard' as never)}
            style={styles.actionButton}
            buttonColor={Colors.secondary}
          >
            View Dashboard
          </Button>
        </Card.Content>
      </Card> */}
      {/* Role Toggle Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>Account Role</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.roleContainer}>
            <Text style={styles.roleDescription}>
              {user?.role === 'owner' 
                ? 'Owners receive 100% of job earnings and can manage employees.'
                : 'Employees earn based on commission rate with custom payment rules.'}
            </Text>
          </View>
          
          <Button
            mode="outlined"
            icon="swap-horizontal"
            onPress={handleToggleRole}
            style={styles.roleButton}
            textColor={Colors.primary}
          >
            Switch to {user?.role === 'owner' ? 'Employee' : 'Owner'} Mode
          </Button>
        </Card.Content>
      </Card>

      {/* Employee: Check Invites */}
      {user?.role === 'employee' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>📨 Pending Invitations</Text>
            <Divider style={styles.divider} />
            <Paragraph style={styles.subtitle}>
              Check if you have any pending job invitations from employers
            </Paragraph>
            <Button
              mode="contained"
              icon="email-check"
              onPress={handleCheckInvites}
              loading={isCheckingInvites}
              disabled={isCheckingInvites}
              style={styles.actionButton}
              buttonColor={Colors.info}
            >
              Check for Invitations
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Owner: Employee Management */}
      {user?.role === 'owner' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>👥 Employee Management</Text>
            <Divider style={styles.divider} />
            <Paragraph style={styles.subtitle}>
              Invite and manage employees who work for you
            </Paragraph>
            <Button
              mode="contained"
              icon="account-group"
              onPress={() => navigation.navigate('EmployeeManagement' as never)}
              style={styles.actionButton}
              buttonColor={Colors.secondary}
            >
              Manage Employees
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Employee: Pending Jobs */}
      {user?.role === 'employee' && user?.ownerStatus === 'active' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>📋 Assigned Jobs</Text>
            <Divider style={styles.divider} />
            <Paragraph style={styles.subtitle}>
              View and accept jobs assigned by your employer
            </Paragraph>
            <Button
              mode="contained"
              icon="briefcase-clock"
              onPress={() => navigation.navigate('PendingJobs' as never)}
              style={styles.actionButton}
              buttonColor={Colors.warning}
            >
              View Pending Jobs
            </Button>
          </Card.Content>
        </Card>
      )}
      
      {/* Employee: Payment Settings */}
      {user?.role === 'employee' && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleLarge" style={styles.cardTitle}>💰 Payment Settings</Text>
              <Button 
                mode="text" 
                onPress={() => setIsEditingPayment(!isEditingPayment)} 
                icon={isEditingPayment ? "check" : "pencil"}
                textColor={Colors.primary}
                compact
              >
                {isEditingPayment ? "Done" : "Edit"}
              </Button>
            </View>
            <Divider style={styles.divider} />
            
            {isEditingPayment ? (
              <View>
                <Text style={styles.sectionLabel}>My commission rate:</Text>
                <View style={styles.commissionContainer}>
                  <TextInput
                    label="Commission %"
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.commissionInput}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />
                  <Text style={styles.percentSign}>%</Text>
                </View>
                
                <Text style={styles.sectionLabel}>Payment handling:</Text>
                
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>I keep the cash payments</Text>
                  <Switch 
                    value={keepsCash} 
                    onValueChange={setKeepsCash}
                    color={Colors.primary}
                  />
                </View>
                
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>I keep the check payments</Text>
                  <Switch 
                    value={keepsCheck} 
                    onValueChange={setKeepsCheck}
                    color={Colors.primary}
                  />
                </View>
                
                <Button 
                  mode="contained" 
                  onPress={handleSavePaymentSettings}
                  style={styles.saveButton}
                  buttonColor={Colors.primary}
                  icon="check"
                >
                  Save Payment Settings
                </Button>
              </View>
            ) : (
              <View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Commission Rate:</Text>
                  <Text style={styles.value}>{user?.commissionRate || 50}%</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cash Handling:</Text>
                  <Text style={styles.value}>
                    {user?.keepsCash !== false ? 'I keep cash' : 'I remit cash'}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Check Handling:</Text>
                  <Text style={styles.value}>
                    {user?.keepsCheck !== false ? 'I keep checks' : 'I remit checks'}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Client Management */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>🏢 Client Management</Text>
          <Divider style={styles.divider} />
          <Paragraph style={styles.subtitle}>
            Manage your clients and save their addresses for quick job entry
          </Paragraph>
          <Button
            mode="contained"
            icon="office-building"
            onPress={() => navigation.navigate('ClientManagement' as never)}
            style={styles.actionButton}
            buttonColor={Colors.accent}
          >
            Manage Clients
          </Button>
        </Card.Content>
      </Card>

      {/* Reports & Analytics */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>📊 Reports & Analytics</Text>
          <Divider style={styles.divider} />
          <Paragraph style={styles.subtitle}>
            View summaries, export PDFs, and analyze your job data
          </Paragraph>
          <Button
            mode="contained"
            icon="chart-box"
            onPress={() => navigation.navigate('Reports' as never)}
            style={styles.actionButton}
            buttonColor={Colors.info}
          >
            View Reports
          </Button>
        </Card.Content>
      </Card>
      
      {/* Logout Button */}
      <Button 
        mode="outlined" 
        onPress={handleLogout}
        style={styles.logoutButton}
        icon="logout"
        textColor={Colors.error}
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    ...Shadows.medium,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.large,
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 16,
    color: Colors.text,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  input: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  saveButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  actionButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  roleContainer: {
    backgroundColor: Colors.infoBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
  },
  roleDescription: {
    fontSize: 14,
    color: Colors.info,
    lineHeight: 20,
  },
  roleButton: {
    borderColor: Colors.primary,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  commissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  commissionInput: {
    flex: 1,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  percentSign: {
    fontSize: 18,
    color: Colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  logoutButton: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xl,
    borderColor: Colors.error,
    borderWidth: 1,
  },
});