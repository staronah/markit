import React, { useState, useEffect, useMemo } from 'react';
import { User as FirebaseUser } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js';
import { ref, onValue, update, get } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';
import { db } from '../firebase/config';
import type { Card, CurrentSession, AttendanceRecord, GeoLocation } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { getHaversineDistance } from '../utils/geolocation';
import LoadingSpinner from './LoadingSpinner';
import UserManagement from './UserManagement';
import AttendanceMatrix from './AttendanceMatrix';

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
  const [showAttendanceMatrix, setShowAttendanceMatrix] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isUpdatingCheckout, setIsUpdatingCheckout] = useState(false);

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
      // Sort by checkin time descending
      records.sort((a, b) => new Date(b.checkin.timestamp).getTime() - new Date(a.checkin.timestamp).getTime());
      setDailyLog(records);
    });
    return () => unsubscribe();
  }, [cardId, selectedDate]);

  useEffect(() => {
    // Periodically update host's location if they are hosting an active session
    if (currentSession?.active && user.uid === currentSession.hostId) {
      const locationUpdateInterval = setInterval(() => {
        if (!navigator.geolocation) {
          console.warn("Geolocation is not supported, cannot update host location.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newCoordinates: GeoLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            const sessionRef = ref(db, `cards/${cardId}/current`);
            update(sessionRef, { location: newCoordinates })
              .catch(err => console.error("Failed to auto-update session location:", err));
          },
          (error) => {
            console.error("Error getting location for periodic update:", error.message);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }, 120000); // 2 minutes

      return () => clearInterval(locationUpdateInterval);
    }
  }, [cardId, user.uid, currentSession]);

  const handleGetShareableLink = async () => {
    if (!card || !card.cardName) {
      alert("Card details not available yet. Please try again in a moment.");
      return;
    }
    try {
        const urlRef = ref(db, 'url');
        const snapshot = await get(urlRef);
        if (snapshot.exists()) {
            const baseUrl = snapshot.val();
            const shareableLink = `${baseUrl}?cardid=${cardId}`;
            const messageToCopy = `This is the attendance url for ${card.cardName} ${shareableLink}`;
            await navigator.clipboard.writeText(messageToCopy);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        } else {
            alert("The base URL for sharing is not configured in the database.");
        }
    } catch (error) {
        console.error("Failed to get shareable link:", error);
        alert("Could not copy the link. Please try again.");
    }
  };

  const handleGenerateQRCode = async () => {
    if (!card || !card.cardName) {
        alert("Card details not available yet. Please try again in a moment.");
        return;
    }
    setIsGeneratingQR(true);
    try {
        const urlRef = ref(db, 'url');
        const snapshot = await get(urlRef);
        if (!snapshot.exists()) {
            throw new Error("Base URL for sharing is not configured in the database.");
        }
        
        const qrCodeLib = (window as any).QRCode;
        if (!qrCodeLib) {
            throw new Error('QRCode.js library is not loaded. Please try again.');
        }

        const baseUrl = snapshot.val();
        const shareableLink = `${baseUrl}?cardid=${cardId}`;

        // Create an in-memory canvas for the QR code
        const qrCanvas = document.createElement('canvas');
        await qrCodeLib.toCanvas(qrCanvas, shareableLink, { 
            width: 256, 
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        // Create the final canvas for the image with text
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context.");

        const padding = 20;
        const textHeight = 40;
        const qrSize = qrCanvas.width;
        
        finalCanvas.width = qrSize + padding * 2;
        finalCanvas.height = qrSize + padding * 2 + textHeight;

        // Fill background with white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Draw the QR code onto the final canvas
        ctx.drawImage(qrCanvas, padding, padding);

        // Add the card name text below the QR code
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(card.cardName, finalCanvas.width / 2, qrSize + padding + 25);

        // Trigger the download
        const link = document.createElement('a');
        const safeCardName = card.cardName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeCardName}_qr_code.png`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();

    } catch (error) {
        console.error("Failed to generate QR code:", error);
        alert(`Could not generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsGeneratingQR(false);
    }
  };

  const handleToggleSignOut = async () => {
    setIsUpdatingSettings(true);
    try {
      const currentStatus = card?.settings?.signOutEnabled || false;
      const updates: { [key: string]: any } = {};
      updates[`/cards/${cardId}/settings/signOutEnabled`] = !currentStatus;
      await update(ref(db), updates);
    } catch (error) {
      console.error("Failed to update sign out setting:", error);
      alert("Failed to update setting. Please try again.");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleToggleCheckout = async () => {
    setIsUpdatingCheckout(true);
    try {
      const currentStatus = card?.settings?.checkoutEnabled || false;
      const updates: { [key: string]: any } = {};
      updates[`/cards/${cardId}/settings/checkoutEnabled`] = !currentStatus;
      await update(ref(db), updates);
    } catch (error) {
      console.error("Failed to update checkout setting:", error);
      alert("Failed to update setting. Please try again.");
    } finally {
      setIsUpdatingCheckout(false);
    }
  };

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

  const getDuration = (start: string, end?: string): string => {
      if (!end) return '—';
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      if (diffMinutes < 60) {
          return `${diffMinutes} min`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
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
        ? getHaversineDistance(record.checkin.location, currentSession.location) 
        : null;
      return {
        'Name': record.userName,
        'ID': record.userId,
        'Check-in Time': new Date(record.checkin.timestamp).toLocaleTimeString(),
        'Check-out Time': record.checkout ? new Date(record.checkout.timestamp).toLocaleTimeString() : 'N/A',
        'Duration': getDuration(record.checkin.timestamp, record.checkout?.timestamp),
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
        { wch: 15 }, // Check-in Time
        { wch: 15 }, // Check-out Time
        { wch: 12 }, // Duration
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
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Session Control</h2>
                  <div className="flex items-center gap-2">
                    <button
                        onClick={handleGetShareableLink}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                        title="Copy public sign-in link"
                    >
                        {linkCopied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleGenerateQRCode}
                        disabled={isGeneratingQR}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50"
                        title="Generate and save QR code"
                    >
                        {isGeneratingQR ? (
                            <LoadingSpinner className="h-4 w-4 text-indigo-500" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V5zM3 3a3 3 0 013-3h8a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3V3zm5 5h4v4H8V8zm2-2H8v2h2V6z" />
                            </svg>
                        )}
                    </button>
                </div>
              </div>
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

            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Card Settings</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        User Sign Out Button
                    </p>
                    <button
                        onClick={handleToggleSignOut}
                        disabled={isUpdatingSettings}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors w-24 flex justify-center ${
                            card?.settings?.signOutEnabled 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50`}
                    >
                        {isUpdatingSettings ? (
                            <LoadingSpinner className="h-4 w-4" />
                        ) : card?.settings?.signOutEnabled ? (
                            'Disable'
                        ) : (
                            'Enable'
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    When enabled, users will see a "Sign Out" button on the attendance page, allowing them to clear their session on that device.
                </p>
                 <div className="border-t border-gray-200 dark:border-gray-700"></div>
                 <div className="flex justify-between items-center pt-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enable Checkout
                    </p>
                    <button
                        onClick={handleToggleCheckout}
                        disabled={isUpdatingCheckout}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors w-24 flex justify-center ${
                            card?.settings?.checkoutEnabled 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50`}
                    >
                        {isUpdatingCheckout ? (
                            <LoadingSpinner className="h-4 w-4" />
                        ) : card?.settings?.checkoutEnabled ? (
                            'Disable'
                        ) : (
                            'Enable'
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    When enabled, users who have checked in can also check out, recording their departure time.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Attendance Log</h2>
              <div className="flex items-center gap-2">
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" />
                  <button 
                    onClick={() => setShowAttendanceMatrix(true)} 
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                    title="View attendance record matrix"
                  >
                    View Records
                  </button>
                  <button onClick={handleExportToExcel} disabled={dailyLog.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800">Export to Excel</button>
              </div>
            </div>
            {dailyLog.length > 0 ? (
              <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Check-in</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Check-out</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dist (m)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedLog.map((record, index) => {
                      const distance = currentSession && currentSession.active && record.sessionId === currentSession.createdAt ? getHaversineDistance(record.checkin.location, currentSession.location) : null;
                      const isOutOfRange = distance !== null && currentSession ? distance > currentSession.maxDistance : false;
                      return (
                          <tr key={index} className={isOutOfRange ? 'bg-red-50 dark:bg-red-900/30' : ''}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.userName}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.userId}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(record.checkin.timestamp).toLocaleTimeString()}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.checkout ? new Date(record.checkout.timestamp).toLocaleTimeString() : '—'}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getDuration(record.checkin.timestamp, record.checkout?.timestamp)}</td>
                            <td className={`px-4 py-4 whitespace-nowrap text-sm ${isOutOfRange ? 'font-bold text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
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

      {showAttendanceMatrix && (
        <AttendanceMatrix
          cardId={cardId}
          onClose={() => setShowAttendanceMatrix(false)}
        />
      )}
    </>
  );
};

export default CardDetail;