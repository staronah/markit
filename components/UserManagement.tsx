import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import { updateUser } from '../services/firebaseService';
import LoadingSpinner from './LoadingSpinner';

interface UserManagementProps {
    cardId: string;
    users: { [key: string]: User };
    onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ cardId, users, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserKey, setEditingUserKey] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedId, setEditedId] = useState('');
    const [updatingKeys, setUpdatingKeys] = useState<string[]>([]);


    const userList = useMemo(() => {
        if (!users) return [];
        return Object.entries(users)
            .map(([key, data]) => ({ key, data }))
            .filter(({ data }) => 
                data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                data.id.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => a.data.name.localeCompare(b.data.name));
    }, [users, searchQuery]);

    const handleEdit = (user: { key: string; data: User }) => {
        setEditingUserKey(user.key);
        setEditedName(user.data.name);
        setEditedId(user.data.id);
    };

    const handleCancel = () => {
        setEditingUserKey(null);
    };

    const handleSave = async (userKey: string) => {
        if (!editedName.trim() || !editedId.trim()) return;
        setUpdatingKeys(prev => [...prev, userKey]);
        try {
            await updateUser(cardId, userKey, { name: editedName.trim(), id: editedId.trim() });
            setEditingUserKey(null);
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("Failed to save changes.");
        } finally {
            setUpdatingKeys(prev => prev.filter(k => k !== userKey));
        }
    };
    
    const handleClearSession = async (userKey: string) => {
        if (window.confirm("Are you sure you want to clear this user's session ID? This will require them to sign in again on their device.")) {
            setUpdatingKeys(prev => [...prev, userKey]);
            try {
                // In Firebase RTDB, setting a value to null removes it.
                await updateUser(cardId, userKey, { sessionId: null as any }); 
            } catch (error) {
                console.error("Failed to clear session ID:", error);
                alert("Failed to clear session ID.");
            } finally {
                setUpdatingKeys(prev => prev.filter(k => k !== userKey));
            }
        }
    };
    
    const isUpdating = (key: string) => updatingKeys.includes(key);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="user-management-title">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 id="user-management-title" className="text-xl font-semibold text-gray-800 dark:text-gray-100">Manage Users ({userList.length})</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <input
                        type="search"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <main className="flex-1 overflow-y-auto p-4 space-y-3">
                    {userList.map(user => (
                        <div key={user.key} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all">
                            {editingUserKey === user.key ? (
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <label htmlFor={`name-${user.key}`} className="sr-only">Full Name</label>
                                        <input id={`name-${user.key}`} type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="w-full px-2 py-1 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="Full Name"/>
                                    </div>
                                    <div>
                                        <label htmlFor={`id-${user.key}`} className="sr-only">User ID</label>
                                        <input id={`id-${user.key}`} type="text" value={editedId} onChange={e => setEditedId(e.target.value)} className="w-full px-2 py-1 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="User ID"/>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{user.data.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ID: {user.data.id}</p>
                                    {user.data.sessionId && <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 truncate" title={user.data.sessionId}>Session Active</p>}
                                </div>
                            )}

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isUpdating(user.key) && <LoadingSpinner className="h-5 w-5 text-indigo-500" />}
                                {editingUserKey === user.key ? (
                                    <>
                                        <button onClick={() => handleSave(user.key)} disabled={isUpdating(user.key)} className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">Save</button>
                                        <button onClick={handleCancel} disabled={isUpdating(user.key)} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleEdit(user)} disabled={isUpdating(user.key)} className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">Edit</button>
                                        <button 
                                            onClick={() => handleClearSession(user.key)} 
                                            disabled={!user.data.sessionId || isUpdating(user.key)} 
                                            className="px-3 py-1 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                                            Clear Session
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                     {userList.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {searchQuery ? "No users found for your search." : "No users have registered for this card yet."}
                        </p>
                    )}
                </main>
            </div>
        </div>
    );
};

export default UserManagement;
