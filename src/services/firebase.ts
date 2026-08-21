import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Suppress internal Firestore connection retry logs from cluttering console/monitoring
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel fails
}

// Initialize Firestore Database with custom database ID and resilience settings
let firestoreDb;
const customDbId = firebaseConfig.firestoreDatabaseId || undefined;

try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    customDbId
  );
} catch {
  firestoreDb = getFirestore(app, customDbId);
}

export const db = firestoreDb;

export {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  onSnapshot
};

export default app;
