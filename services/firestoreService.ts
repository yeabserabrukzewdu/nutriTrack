// ...existing code...
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Log entry types
 */
export type LogEntry = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion?: string;
  timestamp: number; // milliseconds since epoch
};

export type LogEntryData = {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  portion?: string;
  timestamp?: number;
};

/**
 * User profile type (optional)
 */
export type UserProfile = {
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
  createdAt?: number;
  lastSeen?: number;
};

/* Helper - collection ref for user's logs */
const getLogCollectionRef = (userId: string) => {
  return collection(db, 'users', userId, 'logs');
};

/* Normalize Firestore timestamp to number (ms) */
const normalizeTimestamp = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (val?.toMillis && typeof val.toMillis === 'function') return val.toMillis();
  return Date.now();
};

/**
 * Read all log entries for a user (ordered desc by timestamp)
 */
export const getLogEntries = async (userId: string): Promise<LogEntry[]> => {
  const colRef = getLogCollectionRef(userId);
  const q = query(colRef, orderBy('timestamp', 'desc'));
  const snap: QuerySnapshot<DocumentData> = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: String(data.name || ''),
      calories: Number(data.calories || 0),
      protein: Number(data.protein || 0),
      carbs: Number(data.carbs || 0),
      fat: Number(data.fat || 0),
      portion: data.portion || '',
      timestamp: normalizeTimestamp(data.timestamp)
    } as LogEntry;
  });
};

/**
 * Ensure user document exists (avoids rules that require a parent doc)
 */
const ensureUserDoc = async (userId: string, profilePatch?: Partial<UserProfile>) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...(profilePatch || {}),
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    // don't throw - allow caller to continue; log for debugging
    console.warn('ensureUserDoc failed', e);
  }
};

/**
 * Add a log entry for a user. Returns the created entry (with generated id).
 */
export const addLogEntry = async (userId: string, entryData: LogEntryData): Promise<LogEntry> => {
  // ensure parent user doc exists (safe for security rules that require it)
  await ensureUserDoc(userId);

  const payload = {
    name: String(entryData.name || ''),
    calories: Number(entryData.calories ?? 0),
    protein: Number(entryData.protein ?? 0),
    carbs: Number(entryData.carbs ?? 0),
    fat: Number(entryData.fat ?? 0),
    portion: entryData.portion || '',
    timestamp: typeof entryData.timestamp === 'number' ? entryData.timestamp : Date.now()
  };

  const docRef = await addDoc(getLogCollectionRef(userId), payload);
  return { id: docRef.id, ...payload };
};

/**
 * Delete a log entry
 */
export const deleteLogEntry = async (userId: string, entryId: string): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'logs', entryId);
  await deleteDoc(docRef);
};

/**
 * Subscribe to realtime updates for user's logs.
 * callback receives an array of LogEntry ordered by timestamp desc.
 * Returns unsubscribe function.
 */
export const subscribeToLogEntries = (userId: string, callback: (entries: LogEntry[]) => void) => {
  const colRef = getLogCollectionRef(userId);
  const q = query(colRef, orderBy('timestamp', 'desc'));

  const unsub = onSnapshot(q, (snap) => {
    const entries: LogEntry[] = snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: String(data.name || ''),
        calories: Number(data.calories || 0),
        protein: Number(data.protein || 0),
        carbs: Number(data.carbs || 0),
        fat: Number(data.fat || 0),
        portion: data.portion || '',
        timestamp: normalizeTimestamp(data.timestamp)
      };
    });
    callback(entries);
  }, (err) => {
    console.error('subscribeToLogEntries error', err);
    callback([]);
  });

  return unsub;
};

/**
 * Get user profile document (if stored at /users/{userId}).
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      email: data.email ?? null,
      createdAt: data.createdAt ? normalizeTimestamp(data.createdAt) : undefined,
      lastSeen: data.lastSeen ? normalizeTimestamp(data.lastSeen) : undefined
    };
  } catch (e) {
    console.error('getUserProfile error', e);
    return null;
  }
};

/**
 * Update user profile (merge)
 */
export const setUserProfile = async (userId: string, profile: Partial<UserProfile>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const write = {
      ...profile,
      lastSeen: serverTimestamp()
    };
    await setDoc(userDocRef, write, { merge: true });
  } catch (e) {
    console.error('setUserProfile error', e);
    throw e;
  }
};
// ...existing code...