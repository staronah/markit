
import type { User, Group, Section, Name, CurrentSelection } from '../types';

const FIREBASE_DB_URL = 'https://envision-e137f-default-rtdb.firebaseio.com';

async function firebaseRequest<T,>(endpoint: string, method: string = 'GET', data: any = null): Promise<T> {
    const url = `${FIREBASE_DB_URL}/${endpoint}.json`;
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firebase request failed: ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }
    return response.json() as Promise<T>;
}

// Fetches user, group, and section info.
export const getInitialData = async (uid: string, groupId: string, sectionId: string) => {
    try {
        const userPath = `users/${uid}`;
        const sectionPath = `${userPath}/groups/${groupId}/sections/${sectionId}`;
        
        const userData = await firebaseRequest<Omit<User, 'id'>>(userPath);
        if (!userData) throw new Error(`User with ID ${uid} not found.`);
        if (!userData.groups || !userData.groups[groupId]) throw new Error('Access Denied: User does not have access to this group.');

        const user: User = { id: uid, ...userData };

        const [groupData, sectionData, namesData, currentData] = await Promise.all([
             firebaseRequest<Omit<Group, 'id'>>(`${userPath}/groups/${groupId}`),
             firebaseRequest<Omit<Section, 'id' | 'groupId'>>(sectionPath),
             getNames(uid, groupId, sectionId),
             getCurrentSelection(uid, groupId, sectionId),
        ]);

        if (!groupData) throw new Error(`Group with ID ${groupId} not found.`);
        if (!sectionData) throw new Error(`Section with ID ${sectionId} not found.`);
        
        const group: Group = { id: groupId, ...groupData };
        const section: Section = { id: sectionId, groupId, ...sectionData };

        return { user, group, section, names: namesData, currentSelection: currentData };

    } catch (error) {
        console.error("Error fetching initial data:", error);
        throw error;
    }
};

export const getNames = async (uid: string, groupId: string, sectionId: string): Promise<Name[]> => {
    const path = `users/${uid}/groups/${groupId}/sections/${sectionId}/names`;
    const namesData = await firebaseRequest<{ [key: string]: Omit<Name, 'id'> }>(path);
    if (!namesData) return [];

    return Object.entries(namesData)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.rowNumber - b.rowNumber);
};

export const getCurrentSelection = async (uid: string, groupId: string, sectionId: string): Promise<CurrentSelection | null> => {
     const path = `users/${uid}/groups/${groupId}/sections/${sectionId}/current`;
     return firebaseRequest<CurrentSelection | null>(path);
};

export const addNameToFirebase = async (uid: string, groupId: string, sectionId: string, nameData: Omit<Name, 'id'>) => {
    const path = `users/${uid}/groups/${groupId}/sections/${sectionId}/names`;
    return firebaseRequest<{ name: string }>(path, 'POST', nameData);
};
