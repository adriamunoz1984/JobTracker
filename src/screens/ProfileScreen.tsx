// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card, Title, Paragraph, Button, Text, TextInput, Divider, ActivityIndicator, Avatar, IconButton, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { initializeApp } from 'firebase/app';

// The Firebase config should match your AuthContext
const firebaseConfig = {
  apiKey: "AIzaSyDd7dRBchgo1AQlsHFUr42CSTc-fdkFF6c",
  authDomain: "job-tracker-4b731.firebaseapp.com",
  projectId: "job-tracker-4b731",
  storageBucket: "job-tracker-4b731.firebasestorage.app",
  messagingSenderId: "365435353785",
  appId: "1:365435353785:web:cdca12ac9218565c947968",
  measurementId: "G-6KQM169CGN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, updateProfile, logout, error, clearError } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showError, setShowError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);
  
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);
  
  // Handle selecting and uploading profile picture
  const handleSelectPhoto = async () => {
    try {
      // Request permission to access the media library (for Expo)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }
      
      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadProfilePicture(selectedImage.uri);
      }
    } catch (e) {
      console.error('Error selecting photo:', e);
      Alert.alert('Error', 'Failed to select photo');
    }
  };
  
  // Upload profile picture to Firebase Storage
  const uploadProfilePicture = async (uri: string) => {
    if (!user) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create storage reference
      const filename = `profile_${user.uid}_${new Date().getTime()}`;
      const extension = uri.split('.').pop();
      const storageRef = ref(storage, `profile_pictures/${filename}.${extension}`);
      
      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      // Monitor upload progress
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          Alert.alert('Error', 'Failed to upload profile picture');
          setUploading(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Update user profile with new photo URL
          await updateProfile({ photoURL: downloadURL });
          
          setUploading(false);
          setSuccessMessage('Profile picture updated successfully');
          setShowSuccess(true);
        }
      );
    } catch (e) {
      console.error('Error uploading profile picture:', e);
      Alert.alert('Error', 'Failed to upload profile picture');
      setUploading(false);
    }
  };
  
  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      await updateProfile({ displayName });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully');
      setShowSuccess(true);
    } catch (e) {
      // Error is handled by auth context
    }
  };
  
  // Handle logout with confirmation
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
              // Navigation will occur automatically due to auth state change
            } catch (e) {
              // Error is handled by auth context
            }
          }
        }
      ]
    );
  };
  
  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleSelectPhoto}>
            {user.photoURL ? (
              <Avatar.Image 
                source={{ uri: user.photoURL }} 
                size={120} 
                style={styles.avatar} 
              />
            ) : (
              <Avatar.Text 
                size={120} 
                label={user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'U'} 
                style={styles.avatar} 
              />
            )}
            <IconButton 
              icon="camera" 
              style={styles.cameraButton} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          {uploading && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{`Uploading: ${Math.round(uploadProgress)}%`}</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${uploadProgress}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
        
        <Card.Content style={styles.cardContent}>
          {isEditing ? (
            <>
              <TextInput
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
              />
              
              <View style={styles.editButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setIsEditing(false);
                    setDisplayName(user.displayName || '');
                  }} 
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSaveProfile} 
                  style={styles.saveButton}
                >
                  Save Changes
                </Button>
              </View>
            </>
          ) : (
            <>
              <Title style={styles.name}>{user.displayName || 'User'}</Title>
              <Paragraph style={styles.email}>{user.email}</Paragraph>
              
              <Button 
                mode="outlined" 
                onPress={() => setIsEditing(true)} 
                style={styles.editButton}
                icon="pencil"
              >
                Edit Profile
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Title style={styles.settingsTitle}>Account Settings</Title>
          <Divider style={styles.divider} />
          
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('ChangePassword' as never)} 
            style={styles.settingButton}
            icon="lock-reset"
          >
            Change Password
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('DataSync' as never)} 
            style={styles.settingButton}
            icon="cloud-sync"
          >
            Manage Data Sync
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={handleLogout} 
            style={[styles.settingButton, styles.logoutButton]}
            icon="logout"
          >
            Logout
          </Button>
        </Card.Content>
      </Card>
      
      <Snackbar
        visible={showError}
        onDismiss={() => {
          setShowError(false);
          clearError();
        }}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {error}
      </Snackbar>
      
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={3000}
        style={styles.successSnackbar}
      >
        {successMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    margin: 16,
    elevation: 4,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 20,
  },
  progressContainer: {
    width: '80%',
    marginTop: 16,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  name: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    textAlign: 'center',
    color: '#757575',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#2196F3',
  },
  editButton: {
    borderColor: '#2196F3',
  },
  settingsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
    marginBottom: 32,
  },
  settingsTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  settingButton: {
    marginBottom: 12,
    borderColor: '#2196F3',
  },
  logoutButton: {
    borderColor: '#F44336',
    marginTop: 8,
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
  successSnackbar: {
    backgroundColor: '#4CAF50',
  },
});