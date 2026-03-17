// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Divider, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function LoginScreen() {
  const { login, signup } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signup(email.trim(), password, displayName.trim(), businessName.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
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
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isSignUp 
                ? 'Sign up to start tracking your jobs' 
                : 'Sign in to continue'}
            </Text>

            <Divider style={styles.divider} />

            {/* Sign Up Fields */}
            {isSignUp && (
              <>
                <TextInput
                  label="Your Name *"
                  value={displayName}
                  onChangeText={setDisplayName}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="account" iconColor={Colors.primary} />}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="Business Name (Optional)"
                  value={businessName}
                  onChangeText={setBusinessName}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="domain" iconColor={Colors.primary} />}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />
              </>
            )}

            {/* Email & Password */}
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
            />

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
            />

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              buttonColor={Colors.primary}
              icon={isSignUp ? "account-plus" : "login"}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            {/* Toggle Mode */}
            <Divider style={styles.divider} />

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <Button 
                mode="text" 
                onPress={toggleMode}
                textColor={Colors.primary}
                compact
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Button>
            </View>
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 14,
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