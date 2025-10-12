import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { LogEntry, LogEntryData, UserProfile } from '../types';

const getLogCollectionRef = (userId: string) => {
    return collection(db, 'users', userId, 'logs');
};

export const getLogEntries = async (userId: string): Promise<LogEntry[]> => {
    const logCollectionRef = getLogCollectionRef(userId);
    const q = query(logCollectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const entries: LogEntry[] = [];
    querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() as LogEntryData });
    });
    
    return entries;
};

export const addLogEntry = async (userId: string, entryData: LogEntryData): Promise<LogEntry> => {
    const logCollectionRef = getLogCollectionRef(userId);
    const docRef = await addDoc(logCollectionRef, entryData);
    return { id: docRef.id, ...entryData };
};

export const deleteLogEntry = async (userId: string, entryId: string): Promise<void> => {
    const docRef = doc(db, 'users', userId, 'logs', entryId);
    await deleteDoc(docRef);
};

// Subscribe to realtime updates on the user's log collection.
// callback receives the array of LogEntry ordered by timestamp desc.
export const subscribeToLogEntries = (userId: string, callback: (entries: LogEntry[]) => void) => {
    const logCollectionRef = getLogCollectionRef(userId);
    const q = query(logCollectionRef, orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
        const entries: LogEntry[] = [];
        snapshot.forEach((d) => entries.push({ id: d.id, ...(d.data() as LogEntryData) }));
        callback(entries);
    });
    return unsub;
};

// User profile helpers
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
};

export const setUserProfile = async (userId: string, profile: UserProfile): Promise<void> => {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, profile, { merge: true });
};