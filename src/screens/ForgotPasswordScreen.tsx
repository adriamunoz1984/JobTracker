// src/screens/ForgotPasswordScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Title, Surface, HelperText, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { resetPassword, error, clearError, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Show error message when auth error occurs
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  // Handle reset password request
  const handleResetPassword = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setShowError(true);
      return;
    }
    
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setShowSuccess(true);
      
      // Clear the form
      setEmail('');
      
      // Navigate back to login after a delay
      setTimeout(() => {
        navigation.navigate('Login' as never);
      }, 3000);
    } catch (e) {
      // Error is handled by auth context
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formContainer}>
          <Title style={styles.title}>Reset Your Password</Title>
          
          <Text style={styles.instructions}>
            Enter your email address below, and we'll send you a link to reset your password.
          </Text>
          
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
          
          <Button
            mode="contained"
            onPress={handleResetPassword}
            style={styles.resetButton}
            loading={isLoading}
            disabled={isLoading || !email.trim()}
          >
            Send Reset Link
          </Button>
          
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login' as never)}
            style={styles.backButton}
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </Surface>
      </ScrollView>
      
      <Snackbar
        visible={showError}
        onDismiss={() => {
          setShowError(false);
          clearError();
        }}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {error || 'Please enter a valid email address'}
      </Snackbar>
      
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={3000}
        style={styles.successSnackbar}
      >
        {successMessage}
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
    marginBottom: 16,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    marginBottom: 24,
  },
  resetButton: {
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
  backButton: {
    marginBottom: 8,
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
  successSnackbar: {
    backgroundColor: '#4CAF50',
  },
});