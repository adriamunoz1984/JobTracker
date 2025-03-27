// src/screens/RegisterScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Title, Surface, HelperText, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register, error, clearError, isLoading } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const [validationError, setValidationError] = useState('');
  
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
    
    setValidationError('');
    return true;
  };
  
  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      await register(email, password, name);
      // Navigation will happen automatically after successful registration
      // due to the auth state change listener
    } catch (e) {
      // Error is handled by auth context
    }
  };
  
  // Navigate back to login screen
  const goToLogin = () => {
    navigation.navigate('Login' as never);
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formContainer}>
          <Title style={styles.title}>Create Account</Title>
          
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
          
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.registerButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Sign Up
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
  registerButton: {
    marginVertical: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
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