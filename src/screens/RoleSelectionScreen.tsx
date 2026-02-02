// src/screens/RoleSelectionScreen.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function RoleSelectionScreen() {
  const navigation = useNavigation();

  const handleOwnerSelection = () => {
    navigation.navigate('Register', { role: 'owner' });
  };

  const handleEmployeeSelection = () => {
    navigation.navigate('Register', { role: 'employee' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Account Type</Text>
        <Text style={styles.subtitle}>
          Select how you'll be using Job Tracker
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <Title>👔 Business Owner</Title>
            <Paragraph style={styles.description}>
              • Manage your concrete pumping business{'\n'}
              • Track your personal jobs{'\n'}
              • Invite and manage employees{'\n'}
              • See all employee jobs and earnings{'\n'}
              • Set commission rates and payment rules
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={handleOwnerSelection}
              style={styles.button}
            >
              Create Owner Account
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>👷 Employee</Title>
            <Paragraph style={styles.description}>
              • Track jobs assigned by your employer{'\n'}
              • Also track your personal side jobs{'\n'}
              • Accept job assignments{'\n'}
              • Complete job details after completion{'\n'}
              • Keep personal jobs private from employer
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={handleEmployeeSelection}
              style={styles.button}
            >
              Create Employee Account
            </Button>
          </Card.Actions>
        </Card>

        <Button 
          mode="text" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Back to Login
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#2196F3',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  description: {
    marginTop: 8,
    lineHeight: 24,
    color: '#555',
  },
  button: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
  },
});