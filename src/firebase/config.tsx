// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';

// Your Firebase config
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

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Storage
const storage = getStorage(app);

export { app, auth, storage };