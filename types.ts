export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface CurrentSession {
  active: boolean;
  cardId: string;
  createdAt: number;
  hostId: string;
  hostName: string;
  location: GeoLocation;
  maxDistance: number;
}

export interface DeviceInfo {
  os: string;
  browser: string;
  userAgent: string;
}

export interface AttendanceRecord {
  sessionId: number;
  timestamp: string;
  location: GeoLocation;
  deviceInfo: DeviceInfo;
  userId: string;
  userName: string;
}

export interface User {
  id: string;
  name: string;
  timestamp: string;
  sessionId?: string;
  attendance?: {
    [recordId: string]: Omit<AttendanceRecord, 'userId' | 'userName'>;
  }
}

export interface Card {
    id: string;
    cardName: string;
    hostId: string;
    users?: { [key: string]: User };
    logs?: { [date: string]: { [key: string]: AttendanceRecord } };
    current?: CurrentSession;
    // FIX: Add optional `createdAt` property to align with its usage in `AdminDashboard.tsx`.
    createdAt?: string;
    code?: string;
    codeExpiresAt?: number;
}

export interface AdminProfile {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    cards?: { [cardId: string]: true };
}
