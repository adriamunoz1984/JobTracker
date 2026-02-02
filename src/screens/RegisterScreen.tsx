// src/screens/RegisterScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Title, Surface, HelperText, Snackbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { register, error, clearError, isLoading } = useAuth();
  
  // Get role from route params (passed from RoleSelectionScreen)
  const role = (route.params?.role as UserRole) || 'owner';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  // Owner-specific fields
  const [businessName, setBusinessName] = useState('');
  
  // Employee-specific fields
  const [ownerEmail, setOwnerEmail] = useState('');
  const [workIndependently, setWorkIndependently] = useState(false);
  
  // Show error message when auth error occurs
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  // Validate form before submitting
  const validateForm = () => {
    if (!name.trim()) {
      setValidationError('Name is required');
      return false;
    }
    
    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email');
      return false;
    }
    
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    
    // Owner-specific validation
    if (role === 'owner' && !businessName.trim()) {
      setValidationError('Business name is required for owners');
      return false;
    }
    
    // Employee-specific validation
    if (role === 'employee' && !workIndependently && !ownerEmail.trim()) {
      setValidationError('Owner email is required, or select "Work Independently"');
      return false;
    }
    
    if (role === 'employee' && ownerEmail.trim() && !/\S+@\S+\.\S+/.test(ownerEmail)) {
      setValidationError('Please enter a valid owner email');
      return false;
    }
    
    setValidationError('');
    return true;
  };
  
  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // Prepare role-specific data
      const roleData: any = {
        role,
      };
      
      if (role === 'owner') {
        roleData.businessName = businessName.trim();
      } else if (role === 'employee') {
        if (workIndependently) {
          roleData.ownerStatus = 'none';
        } else {
          roleData.ownerEmail = ownerEmail.trim();
          roleData.ownerStatus = 'invited'; // Will need owner to confirm
        }
      }
      
      await register(email, password, name, roleData);
      // Navigation will happen automatically after successful registration
    } catch (e) {
      // Error is handled by auth context
    }
  };
  
  // Navigate back to login screen
  const goToLogin = () => {
    navigation.navigate('Login' as never);
  };
  
  // Go back to role selection
  const goBackToRoleSelection = () => {
    navigation.goBack();
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formContainer}>
          <Title style={styles.title}>
            Create {role === 'owner' ? 'Owner' : 'Employee'} Account
          </Title>
          
          {validationError ? (
            <HelperText type="error" visible={!!validationError}>
              {validationError}
            </HelperText>
          ) : null}
          
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
          />
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            disabled={isLoading}
          />
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            disabled={isLoading}
          />
          
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            disabled={isLoading}
          />
          
          {/* Owner-specific fields */}
          {role === 'owner' && (
            <TextInput
              label="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
              placeholder="e.g., Munoz Concrete Pumping"
            />
          )}
          
          {/* Employee-specific fields */}
          {role === 'employee' && (
            <>
              <View style={styles.independentContainer}>
                <Text style={styles.independentLabel}>Work Independently (No Owner)</Text>
                <Button
                  mode={workIndependently ? 'contained' : 'outlined'}
                  onPress={() => setWorkIndependently(!workIndependently)}
                  style={styles.independentButton}
                  compact
                >
                  {workIndependently ? 'Yes' : 'No'}
                </Button>
              </View>
              
              {!workIndependently && (
                <>
                  <TextInput
                    label="Owner's Email"
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    mode="outlined"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    disabled={isLoading}
                    placeholder="Enter your employer's email"
                  />
                  <HelperText type="info">
                    The owner will need to approve your request
                  </HelperText>
                </>
              )}
            </>
          )}
          
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.registerButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Sign Up
          </Button>
          
          <Button
            mode="text"
            onPress={goBackToRoleSelection}
            style={styles.changeRoleButton}
            disabled={isLoading}
          >
            Change Role
          </Button>
          
          <View style={styles.loginContainer}>
            <Text>Already have an account? </Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </ScrollView>
      
      <Snackbar
        visible={showError}
        onDismiss={() => {
          setShowError(false);
          clearError();
        }}
        duration={3000}
        style={styles.snackbar}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    padding: 24,
    borderRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  independentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  independentLabel: {
    fontSize: 16,
    flex: 1,
  },
  independentButton: {
    minWidth: 80,
  },
  registerButton: {
    marginVertical: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
  changeRoleButton: {
    marginBottom: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginLink: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  snackbar: {
    backgroundColor: '#F44336',
  },
});