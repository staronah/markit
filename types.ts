
export interface User {
  id: string;
  displayName: string;
  photoURL?: string;
  groups?: { [key: string]: boolean };
}

export interface Group {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  groupId: string;
  name: string;
}

export interface Name {
  id: string;
  fullName: string;
  rowNumber: number;
  createdAt: string;
  addedBy: string;
  ipAddress?: string;
}

export interface CurrentSelection {
  currentRow: number;
  currentName: string;
}
