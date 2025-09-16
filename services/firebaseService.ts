import type { User, CurrentSession, AttendanceRecord } from '../types';

const FIREBASE_DB_URL = 'https://markit-868ce-default-rtdb.firebaseio.com/';

export async function fetchUsers(cardId: string): Promise<{ [key: string]: User }> {
  const response = await fetch(`${FIREBASE_DB_URL}/cards/${cardId}/users.json`);
  if (!response.ok) {
    throw new Error('Failed to fetch users from the database.');
  }
  const data = await response.json();
  return data || {};
}

export async function addUser(cardId: string, user: User): Promise<void> {
  const response = await fetch(`${FIREBASE_DB_URL}/cards/${cardId}/users.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error('Failed to add user to the database.');
  }
}

export async function updateUser(cardId: string, userKey: string, userData: Partial<User>): Promise<void> {
  const response = await fetch(`${FIREBASE_DB_URL}/cards/${cardId}/users/${userKey}.json`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    throw new Error('Failed to update user in the database.');
  }
}

export async function writeAttendanceRecord(
    cardId: string, 
    userKey: string, 
    record: AttendanceRecord
): Promise<{ name: string }> {
  // The record for the user doesn't need userId and userName, but the global one does.
  const { userId, userName, ...userRecord } = record;

  // 1. Write to user's attendance log
  const userAttendanceResponse = await fetch(`${FIREBASE_DB_URL}/cards/${cardId}/users/${userKey}/attendance.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userRecord),
  });

  if (!userAttendanceResponse.ok) {
    throw new Error('Failed to save attendance record to user profile.');
  }
  const userAttendanceData = await userAttendanceResponse.json();

  // 2. Write to the global daily log
  const today = new Date();
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const globalLogResponse = await fetch(`${FIREBASE_DB_URL}/cards/${cardId}/logs/${dateString}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record), // Use full record for global log
  });

  if (!globalLogResponse.ok) {
      // This is a non-critical error, log it but don't fail the whole operation
      // if the user's personal record was saved.
      console.error('Failed to write to global attendance log.');
  }
  
  return userAttendanceData; // Returns { name: "-FirebasePushKey" }
}


export async function fetchCurrentSession(cardId: string): Promise<CurrentSession | null> {
  const response = await fetch(`${FIREBASE_DB_URL}/cards/${cardId}/current.json`);
  if (!response.ok) {
    // It's okay if it doesn't exist, just return null.
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch current session from the database.');
  }
  const data = await response.json();
  return data;
}