import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase config to prevent null pointer crashes
const validateFirebaseConfig = (config: any) => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    throw new Error(`Firebase configuration incomplete: ${missingFields.join(', ')}`);
  }
  
  return config;
};

let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  // Validate config before initializing
  const validatedConfig = validateFirebaseConfig(firebaseConfig);
  
  // Initialize Firebase app
  app = initializeApp(validatedConfig);
  console.log('Firebase app initialized successfully');
  
  // Initialize Auth with AsyncStorage persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // Fallback to getAuth if initializeAuth fails (already initialized)
    console.log('Using existing auth instance');
    auth = getAuth(app);
  }
  
  // Initialize Firestore with better error handling
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: false,
    });
  } catch (error) {
    // Fallback to getFirestore if already initialized
    console.log('Using existing Firestore instance');
    db = getFirestore(app);
  }
  
  // Initialize Storage
  storage = getStorage(app);
  
  console.log('Firebase services initialized successfully');
  
} catch (error) {
  console.error('Firebase initialization failed:', error);
  
  // Create fallback objects to prevent null pointer crashes
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signOut: () => Promise.reject(new Error('Firebase not initialized')),
  };
  
  db = {
    collection: () => ({
      add: () => Promise.reject(new Error('Firebase not initialized')),
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase not initialized')),
        set: () => Promise.reject(new Error('Firebase not initialized')),
      }),
    }),
  };
  
  storage = {
    ref: () => ({
      putString: () => Promise.reject(new Error('Firebase not initialized')),
    }),
  };
}

export { auth, db, storage };
export default app;