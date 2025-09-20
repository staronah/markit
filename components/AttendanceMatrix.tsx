import React, { useState, useEffect } from 'react';
import { ref, get } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';
import { db } from '../firebase/config';
import type { User, AttendanceRecord } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface AttendanceMatrixProps {
    cardId: string;
    onClose: () => void;
}

interface MatrixData {
    users: { id: string; name: string }[];
    dates: string[];
    records: { [userId: string]: { [date: string]: boolean } };
}

const AttendanceMatrix: React.FC<AttendanceMatrixProps> = ({ cardId, onClose }) => {
    const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const usersRef = ref(db, `cards/${cardId}/users`);
                const logsRef = ref(db, `cards/${cardId}/logs`);

                const [usersSnapshot, logsSnapshot] = await Promise.all([get(usersRef), get(logsRef)]);

                const usersData: { [key: string]: User } = usersSnapshot.val() || {};
                const logsData: { [date: string]: { [key: string]: AttendanceRecord } } = logsSnapshot.val() || {};
                
                if (Object.keys(usersData).length === 0) {
                    throw new Error("No users found for this card.");
                }

                const usersList = Object.values(usersData).map(u => ({ id: u.id, name: u.name })).sort((a,b) => a.name.localeCompare(b.name));
                const allDates = Object.keys(logsData).sort();
                
                const records: { [userId: string]: { [date: string]: boolean } } = {};
                
                usersList.forEach(user => {
                    records[user.id] = {};
                });

                allDates.forEach(date => {
                    const dailyLogs = logsData[date] || {};
                    const presentUserIds = new Set<string>();

                    // A valid log is an object with a userId and a checkin time.
                    Object.values(dailyLogs).forEach(log => {
                        if (log && log.userId && log.checkin && log.checkin.timestamp) {
                            presentUserIds.add(log.userId);
                        }
                    });

                    usersList.forEach(user => {
                        records[user.id][date] = presentUserIds.has(user.id);
                    });
                });

                setMatrixData({
                    users: usersList,
                    dates: allDates,
                    records: records
                });

            } catch (err: any) {
                setError(err.message || 'Failed to load attendance data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [cardId]);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="matrix-title">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 id="matrix-title" className="text-xl font-semibold text-gray-800 dark:text-gray-100">Attendance Record Matrix</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                
                <main className="flex-1 overflow-auto p-4">
                    {loading && (
                        <div className="flex justify-center items-center h-full">
                            <LoadingSpinner className="h-10 w-10 text-indigo-500" />
                        </div>
                    )}
                    {error && (
                        <div className="text-center text-red-500 p-8">
                            <p>{error}</p>
                            <p className="text-sm text-gray-400 mt-2">There might be no users or attendance logs for this card yet.</p>
                        </div>
                    )}
                    {matrixData && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                                    <tr>
                                        <th className="p-2 border border-gray-300 dark:border-gray-600 text-left font-semibold text-gray-700 dark:text-gray-200 min-w-[200px]">User</th>
                                        {matrixData.dates.map(date => (
                                            <th key={date} className="p-2 border border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200 min-w-[100px]">
                                                {date}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.users.map(user => (
                                        <tr key={user.id} className="even:bg-gray-50 dark:even:bg-gray-800/50">
                                            <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 font-medium">
                                                <div className="truncate">{user.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{user.id}</div>
                                            </td>
                                            {matrixData.dates.map(date => (
                                                <td key={`${user.id}-${date}`} className="p-2 border border-gray-200 dark:border-gray-700 text-center text-lg">
                                                    {matrixData.records[user.id]?.[date] ? '✅' : '❌'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {matrixData.dates.length === 0 && (
                                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                                    <p>No attendance has been logged for this card yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AttendanceMatrix;