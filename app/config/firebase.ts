import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - updated to match google-services.json
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firebase Collections
export const collections = {
  users: 'users',
  appointments: 'appointments',
  barbers: 'barbers',
  treatments: 'treatments',
  gallery: 'gallery',
  waitlist: 'waitlist',
  settings: 'settings',
} as const;

// Type definitions for Firebase data
export interface User {
  uid: string;
  name: string;
  phone: string;
  photoURL?: string;
  createdAt: any;
  type: 'client' | 'barber' | 'admin';
}

export interface Appointment {
  appointmentId: string;
  clientId: string;
  barberId: string;
  treatmentId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: any;
}

export interface Barber {
  id?: string;
  barberId?: string;
  userId?: string;
  name: string;
  photo?: string;
  image?: string;
  photoUrl?: string;
  phone?: string;
  whatsapp?: string;
  isMainBarber?: boolean;
  experience?: string;
  bio?: string;
  rating?: number;
  specialties?: string[];
  available?: boolean;
  availableSlots?: string[];
  availabilityWindow?: {
    start: string;
    end: string;
  };
  customPrices?: {
    [treatmentId: string]: number;
  };
  pricing?: {
    [treatmentId: string]: number;
  };
}

export interface Treatment {
  id?: string;
  treatmentId?: string;
  name?: string;
  title?: string;
  price: number; // Default price
  duration: number;
  image?: string;
  description?: string;
}

export interface GalleryImage {
  imageId: string;
  url: string;
  uploadedBy: string;
  timestamp: any;
}

export interface WaitlistEntry {
  waitlistId: string;
  clientId: string;
  requestedDate: string;
  requestedTime: string;
  treatmentId: string;
  status: 'waiting' | 'notified' | 'removed';
  createdAt: any;
}

export interface Settings {
  maxBookingDaysAhead: number;
  showGallery: boolean;
  homepageBanner: string;
}

export default app; 