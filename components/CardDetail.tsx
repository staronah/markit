import React, { useState, useEffect, useMemo } from 'react';
import { User as FirebaseUser } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js';
import { ref, onValue, update } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';
import { db } from '../firebase/config';
import type { Card, CurrentSession, AttendanceRecord } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { getHaversineDistance } from '../utils/geolocation';
import LoadingSpinner from './LoadingSpinner';
import UserManagement from './UserManagement';

declare const XLSX: any;

interface CardDetailProps {
  cardId: string;
  user: FirebaseUser;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 10;

const CardDetail: React.FC<CardDetailProps> = ({ cardId, user, onBack }) => {
  const [card, setCard] = useState<Card | null>(null);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [dailyLog, setDailyLog] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [maxDistance, setMaxDistance] = useState(100);
  const { coordinates, loading: geoLoading, error: geoError } = useGeolocation();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const cardRef = ref(db, `cards/${cardId}`);
    const unsubscribe = onValue(cardRef, (snapshot) => {
      const data = snapshot.val();
      setCard({ id: cardId, ...data });
      setCurrentSession(data?.current || null);
      if (data?.current?.maxDistance) {
        setMaxDistance(data.current.maxDistance);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [cardId]);

  useEffect(() => {
    if (!card?.codeExpiresAt || !currentSession?.active) {
        setCountdown(0);
        return;
    }

    const interval = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.round((card.codeExpiresAt! - now) / 1000);

        if (timeLeft <= 0) {
            // Time to regenerate. Only the session host should do this.
            if (user.uid === currentSession.hostId) {
                const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                const newExpiresAt = Date.now() + 2 * 60 * 1000;
                
                const updates: { [key: string]: any } = {};
                updates[`/cards/${cardId}/code`] = newCode;
                updates[`/cards/${cardId}/codeExpiresAt`] = newExpiresAt;

                update(ref(db), updates).catch(err => console.error("Failed to regenerate code:", err));
            }
            setCountdown(0);
        } else {
            setCountdown(timeLeft);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [card?.codeExpiresAt, currentSession, user.uid, cardId]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when date changes
    const logRef = ref(db, `cards/${cardId}/logs/${selectedDate}`);
    const unsubscribe = onValue(logRef, (snapshot) => {
      const data = snapshot.val();
      const records: AttendanceRecord[] = data ? Object.values(data) : [];
      // Sort by timestamp descending
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDailyLog(records);
    });
    return () => unsubscribe();
  }, [cardId, selectedDate]);

  const handleStartSession = async () => {
    if (!coordinates) {
        alert(geoError || 'Could not get your location. Please enable location services.');
        return;
    }
    setSessionLoading(true);

    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 2 * 60 * 1000;

    const newSession: CurrentSession = {
      active: true,
      cardId: cardId,
      createdAt: Date.now(),
      hostId: user.uid,
      hostName: user.email || 'Admin',
      location: coordinates,
      maxDistance: Number(maxDistance),
    };

    try {
      const updates: { [key: string]: any } = {};
      updates[`/cards/${cardId}/current`] = newSession;
      updates[`/cards/${cardId}/code`] = newCode;
      updates[`/cards/${cardId}/codeExpiresAt`] = expiresAt;
      await update(ref(db), updates);
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleStopSession = async () => {
    setSessionLoading(true);
    try {
      const updates: { [key: string]: null } = {};
      updates[`/cards/${cardId}/current`] = null;
      updates[`/cards/${cardId}/code`] = null;
      updates[`/cards/${cardId}/codeExpiresAt`] = null;
      await update(ref(db), updates);
    } catch (error) {
      console.error("Failed to stop session:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (dailyLog.length === 0) {
      alert("No data to export for the selected date.");
      return;
    }
     if (!card?.cardName) {
      alert("Card name not available for export.");
      return;
    }

    const dataToExport = dailyLog.map(record => {
      const distance = currentSession && currentSession.active && record.sessionId === currentSession.createdAt 
        ? getHaversineDistance(record.location, currentSession.location) 
        : null;
      return {
        'Name': record.userName,
        'ID': record.userId,
        'Time': new Date(record.timestamp).toLocaleTimeString(),
        'Date': new Date(record.timestamp).toLocaleDateString(),
        'Distance (m)': distance !== null ? distance.toFixed(0) : 'N/A',
        'OS': record.deviceInfo.os,
        'Browser': record.deviceInfo.browser,
      };
    });
    
    // Create a worksheet with card name and date headers, plus a blank row
    const header = [
        ['Card Name:', card.cardName],
        ['Date:', selectedDate],
        [] // Blank row for spacing
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(header);

    // Add the main data table below the header (origin A4 will put headers on row 4)
    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A4' });

    // Define column widths for better readability
    const columnWidths = [
        { wch: 25 }, // Name
        { wch: 20 }, // ID
        { wch: 15 }, // Time
        { wch: 15 }, // Date
        { wch: 15 }, // Distance (m)
        { wch: 15 }, // OS
        { wch: 20 }, // Browser
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");
    
    // Sanitize card name for the file name
    const safeCardName = card.cardName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${safeCardName}_attendance_${selectedDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const paginatedLog = useMemo(() => {
    return dailyLog.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [dailyLog, currentPage]);
  
  const totalPages = Math.ceil(dailyLog.length / ITEMS_PER_PAGE);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner className="h-12 w-12 text-indigo-500" /></div>;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <button onClick={onBack} className="mb-6 text-indigo-600 dark:text-indigo-400 hover:underline">
          &larr; Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{card?.cardName}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Card ID: {cardId}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Session Control</h2>
              {currentSession && currentSession.active ? (
                  <div className="space-y-4">
                      <p className="text-green-600 dark:text-green-400 font-semibold text-center">Session is LIVE</p>
                      
                      <div className="text-center py-4 border-y border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session Code</p>
                          <p className="text-5xl font-bold tracking-widest text-gray-800 dark:text-gray-100 my-2">{card?.code || '----'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 h-4">
                              { countdown > 0 
                                  ? `Refreshes in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
                                  : 'Refreshing...'
                              }
                          </p>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400">Max Distance: {currentSession.maxDistance}m</p>
                      <button onClick={handleStopSession} disabled={sessionLoading} className="w-full py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400">
                          {sessionLoading ? <LoadingSpinner /> : 'Stop Session'}
                      </button>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-300">Session is INACTIVE</p>
                      <div>
                          <label htmlFor="maxDistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Distance (meters)</label>
                          <input type="number" id="maxDistance" value={maxDistance} onChange={e => setMaxDistance(parseInt(e.target.value, 10))} className="mt-1 w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"/>
                      </div>
                      <button onClick={handleStartSession} disabled={sessionLoading || geoLoading} className="w-full py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                        {sessionLoading || geoLoading ? <LoadingSpinner /> : 'Start Session'}
                      </button>
                      {geoError && <p className="text-xs text-red-500">{geoError}</p>}
                  </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Attendance Log</h2>
              <div className="flex items-center gap-4">
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" />
                  <button onClick={handleExportToExcel} disabled={dailyLog.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800">Export to Excel</button>
              </div>
            </div>
            {dailyLog.length > 0 ? (
              <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Distance (m)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedLog.map((record, index) => {
                      const distance = currentSession && currentSession.active && record.sessionId === currentSession.createdAt ? getHaversineDistance(record.location, currentSession.location) : null;
                      const isOutOfRange = distance !== null && currentSession ? distance > currentSession.maxDistance : false;
                      return (
                          <tr key={index} className={isOutOfRange ? 'bg-red-50 dark:bg-red-900/30' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.userName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.userId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(record.timestamp).toLocaleTimeString()}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isOutOfRange ? 'font-bold text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {distance !== null ? distance.toFixed(0) : 'N/A'}
                            </td>
                          </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50">Previous</button>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50">Next</button>
                  </div>
              )}
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No one marked attendance for {selectedDate}.</p>
            )}
          </div>
        </div>
      </div>
      
      <button
        onClick={() => setShowUserManagement(true)}
        className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-label="Manage Users"
        title="Manage Users"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      {showUserManagement && card?.users && (
        <UserManagement
            cardId={cardId}
            users={card.users}
            onClose={() => setShowUserManagement(false)}
        />
      )}
    </>
  );
};

export default CardDetail;
