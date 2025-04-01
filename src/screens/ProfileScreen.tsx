// src/screens/ProfileScreen.tsx (enhanced with role and commission settings)
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, TextInput, Switch, SegmentedButtons, RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, updateProfile, logout } = useAuth();
  
  // Basic profile settings
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  
  // Payment settings
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [userRole, setUserRole] = useState(user?.role || 'owner');
  const [commissionRate, setCommissionRate] = useState(user?.commissionRate?.toString() || '50');
  const [keepsCash, setKeepsCash] = useState(user?.keepsCash !== false); // Default to true
  const [keepsCheck, setKeepsCheck] = useState(user?.keepsCheck !== false); // Default to true
  
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUserRole(user.role || 'owner');
      setCommissionRate(user.commissionRate?.toString() || '50');
      setKeepsCash(user.keepsCash !== false);
      setKeepsCheck(user.keepsCheck !== false);
    }
  }, [user]);
  
  // Update basic profile
  const handleSaveProfile = async () => {
    try {
      await updateProfile({ displayName });
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  
  // Update payment settings
  const handleSavePaymentSettings = async () => {
    try {
      const commissionRateNum = parseInt(commissionRate, 10);
      if (isNaN(commissionRateNum) || commissionRateNum < 1 || commissionRateNum > 100) {
        Alert.alert('Invalid Rate', 'Commission rate must be between 1 and 100');
        return;
      }
      
      await updateProfile({
        role: userRole,
        commissionRate: commissionRateNum,
        keepsCash,
        keepsCheck
      });
      
      setIsEditingPayment(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update payment settings');
    }
  };
  
  // Handle logout
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
  
  return (
    <ScrollView style={styles.container}>
      {/* Profile Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerContainer}>
            <Title>Profile</Title>
            <Button 
              mode="text" 
              onPress={() => setIsEditing(!isEditing)} 
              icon={isEditing ? "check" : "pencil"}
            >
              {isEditing ? "Done" : "Edit"}
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {isEditing ? (
            <View style={styles.formGroup}>
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
              />
              
              <Button 
                mode="contained" 
                onPress={handleSaveProfile}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Paragraph style={styles.label}>Name:</Paragraph>
              <Paragraph style={styles.value}>{user?.displayName || 'Not set'}</Paragraph>
              
              <Paragraph style={styles.label}>Email:</Paragraph>
              <Paragraph style={styles.value}>{user?.email || 'Not available'}</Paragraph>
            </View>
          )}
        </Card.Content>
      </Card>
      
      {/* Payment Settings Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerContainer}>
            <Title>Payment Settings</Title>
            <Button 
              mode="text" 
              onPress={() => setIsEditingPayment(!isEditingPayment)} 
              icon={isEditingPayment ? "check" : "pencil"}
            >
              {isEditingPayment ? "Done" : "Edit"}
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {isEditingPayment ? (
            <View style={styles.formGroup}>
              <Text style={styles.sectionLabel}>I am a:</Text>
              <RadioButton.Group 
                onValueChange={value => setUserRole(value)} 
                value={userRole}
              >
                <View style={styles.radioOption}>
                  <RadioButton value="owner" />
                  <Text>Owner (Get 100% of profits)</Text>
                </View>
                <View style={styles.radioOption}>
                  <RadioButton value="employee" />
                  <Text>Employee (Commission-based)</Text>
                </View>
              </RadioButton.Group>
              
              {userRole === 'employee' && (
                <>
                  <Text style={styles.sectionLabel}>My commission rate:</Text>
                  <View style={styles.commissionContainer}>
                    <TextInput
                      label="Commission %"
                      value={commissionRate}
                      onChangeText={setCommissionRate}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.commissionInput}
                    />
                    <Text style={styles.percentSign}>%</Text>
                  </View>
                  
                  <Text style={styles.sectionLabel}>Payment handling:</Text>
                  
                  <View style={styles.switchRow}>
                    <Text>I keep the cash payments</Text>
                    <Switch 
                      value={keepsCash} 
                      onValueChange={setKeepsCash}
                    />
                  </View>
                  
                  <View style={styles.switchRow}>
                    <Text>I keep the check payments</Text>
                    <Switch 
                      value={keepsCheck} 
                      onValueChange={setKeepsCheck}
                    />
                  </View>
                </>
              )}
              
              <Button 
                mode="contained" 
                onPress={handleSavePaymentSettings}
                style={styles.saveButton}
              >
                Save Payment Settings
              </Button>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Paragraph style={styles.label}>Role:</Paragraph>
              <Paragraph style={styles.value}>
                {user?.role === 'owner' ? 'Owner (100% profits)' : 'Employee (Commission)'}
              </Paragraph>
              
              {user?.role === 'employee' && (
                <>
                  <Paragraph style={styles.label}>Commission Rate:</Paragraph>
                  <Paragraph style={styles.value}>{user?.commissionRate || 50}%</Paragraph>
                  
                  <Paragraph style={styles.label}>Cash Handling:</Paragraph>
                  <Paragraph style={styles.value}>
                    {user?.keepsCash !== false ? 'I keep cash payments' : 'I remit cash payments'}
                  </Paragraph>
                  
                  <Paragraph style={styles.label}>Check Handling:</Paragraph>
                  <Paragraph style={styles.value}>
                    {user?.keepsCheck !== false ? 'I keep check payments' : 'I remit check payments'}
                  </Paragraph>
                </>
              )}
            </View>
          )}
          
          {!isEditingPayment && (
            <View style={styles.formulaContainer}>
              <Text style={styles.formulaTitle}>Your Payment Formula:</Text>
              <Text style={styles.formula}>
                {user?.role === 'owner' 
                  ? 'Total Amount = 100% of all jobs'
                  : `Your Pay = (Total Jobs × ${user?.commissionRate || 50}%) ${user?.keepsCash ? '- Cash' : ''} ${user?.keepsCheck ? '- Checks' : ''}`
                }
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      {/* Logout Button */}
      <Button 
        mode="outlined" 
        onPress={handleLogout}
        style={styles.logoutButton}
        icon="logout"
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  profileInfo: {
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  commissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'white',
  },
  percentSign: {
    fontSize: 18,
    marginRight: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  formulaContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  formulaTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formula: {
    fontStyle: 'italic',
  },
  logoutButton: {
    marginVertical: 16,
    borderColor: '#F44336',
    borderWidth: 1,
  },
});