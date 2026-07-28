// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Divider, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpRedirect = () => {
    navigation.navigate('RoleSelection' as never);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.logo}>🚛</Text>
          <Text style={styles.title}>Job Tracker</Text>
          <Text style={styles.subtitle}>Concrete Pumping Management</Text>
        </LinearGradient>

        {/* Login Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              Welcome Back
            </Text>
            <Text style={styles.cardSubtitle}>
              Sign in to continue managing your jobs
            </Text>

            <Divider style={styles.divider} />

            {/* Email Input */}
            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="email" iconColor={Colors.primary} />}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
              editable={!loading}
            />

            {/* Password Input */}
            <TextInput
              label="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="lock" iconColor={Colors.primary} />}
              right={
                <TextInput.Icon 
                  icon={showPassword ? "eye-off" : "eye"} 
                  onPress={() => setShowPassword(!showPassword)}
                  iconColor={Colors.textSecondary}
                />
              }
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
              editable={!loading}
            />

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              buttonColor={Colors.primary}
              icon="login"
            >
              Sign In
            </Button>

            {/* Divider */}
            <Divider style={styles.divider} />

            {/* Sign Up Section */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                Don't have an account?
              </Text>
              <Button 
                mode="contained"
                onPress={handleSignUpRedirect}
                style={styles.signUpButton}
                buttonColor={Colors.secondary}
                icon="account-plus"
              >
                Create Account
              </Button>
            </View>

            {/* Forgot Password */}
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('ForgotPassword' as never)}
              textColor={Colors.primary}
              compact
              style={styles.forgotButton}
            >
              Forgot Password?
            </Button>
          </Card.Content>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Manage jobs, track payments, and grow your business
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    ...Shadows.large,
  },
  logo: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.large,
    ...Shadows.large,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  divider: {
    marginVertical: Spacing.lg,
    backgroundColor: Colors.borderLight,
  },
  input: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  errorContainer: {
    backgroundColor: Colors.errorBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  submitButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  signUpContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  signUpText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  signUpButton: {
    width: '100%',
    borderRadius: BorderRadius.medium,
    ...Shadows.small,
  },
  forgotButton: {
    marginTop: Spacing.sm,
    alignSelf: 'center',
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});