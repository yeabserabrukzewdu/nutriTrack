export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// LogEntry types used by Firestore-backed logging
export interface LogEntryData {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  // timestamp stored as milliseconds since epoch
  timestamp: number;
}

export interface LogEntry extends LogEntryData {
  id: string;
}

export interface UserProfile {
  name?: string;
  details?: string;
  avatarUrl?: string;
}
