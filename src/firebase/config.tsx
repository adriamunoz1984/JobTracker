// src/firebase/config.tsx
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

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

// Initialize Firestore
const db = getFirestore(app);

// Pump Finder development can be pointed at the local Firestore emulator
// without changing production firebase.json or deploying Finder rules.
// On a physical Android device, use:
//   adb reverse tcp:8080 tcp:8080
// and leave the host as 127.0.0.1.
const useFirestoreEmulator =
  __DEV__ && process.env.EXPO_PUBLIC_USE_FIRESTORE_EMULATOR === 'true';

if (useFirestoreEmulator) {
  const emulatorHost =
    process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
  const emulatorPort = Number(
    process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080'
  );

  connectFirestoreEmulator(db, emulatorHost, emulatorPort);
  console.log(
    `🧪 Firestore emulator enabled at ${emulatorHost}:${emulatorPort}`
  );
}

export { app, auth, storage, db };
