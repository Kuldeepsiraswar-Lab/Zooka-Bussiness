import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch,
  setLogLevel
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress transient offline polling error warnings from Firestore logger
setLogLevel('silent');

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database with local persistence
let firestoreInstance;
const customDbId = (firebaseConfig as any).firestoreDatabaseId || undefined;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, customDbId);
} catch {
  firestoreInstance = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Connection test helper with offline resilience
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    const docRef = doc(db, 'systemState', 'global');
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch
};
