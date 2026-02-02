// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Title, Surface, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, error, clearError, isLoading, bypassAuthForTesting, loginWithGoogle } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  
  // Show error message when auth error occurs
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      return;
    }
    
    try {
      await login(email, password);
    } catch (e) {
      // Error is handled by auth context
    }
  };
  
  // Google login
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      // Error is handled by auth context
    }
  };
  
  // Navigate to registration screen
  // Navigate to role selection screen
    const goToRegister = () => {
  navigation.navigate('RoleSelection' as never);
    };
  
  // Navigate to forgot password screen
  const goToForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.formContainer}>
          <View style={styles.logoContainer}>
            <Title style={styles.appTitle}>Job Tracker</Title>
            <Text style={styles.subtitle}>Track your concrete pumping jobs</Text>
          </View>
          
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
          
          <TouchableOpacity onPress={goToForgotPassword} style={styles.forgotPasswordLink}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
          
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            loading={isLoading}
            disabled={isLoading || !email || !password}
          >
            Log In
          </Button>
          
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>
          
          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            style={styles.googleButton}
            icon="google"
            disabled={isLoading}
          >
            Continue with Google
          </Button>
          
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Development</Text>
            <View style={styles.divider} />
          </View>
          
          <Button
            mode="outlined"
            onPress={bypassAuthForTesting}
            style={styles.testButton}
            icon="wrench"
            disabled={isLoading}
          >
            🔧 Test Account (Dev Only)
          </Button>
          
          <View style={styles.registerContainer}>
            <Text>Don't have an account? </Text>
            <TouchableOpacity onPress={goToRegister}>
              <Text style={styles.registerLink}>Sign Up</Text>
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
    borderRadius: 12,
    elevation: 4,
    backgroundColor: 'white',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#2196F3',
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 20,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  googleButton: {
    marginBottom: 16,
    borderColor: '#757575',
    paddingVertical: 8,
  },
  testButton: {
    marginBottom: 24,
    borderColor: '#FF9800',
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerLink: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  snackbar: {
    backgroundColor: '#F44336',
  },
});