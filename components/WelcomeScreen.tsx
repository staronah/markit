// FIX: Import `useMemo` from React to resolve 'Cannot find name' error.
import React, { useState, useEffect, useMemo } from 'react';
import type { User, CurrentSession, GeoLocation, AttendanceRecord } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { getHaversineDistance } from '../utils/geolocation';
import LoadingSpinner from './LoadingSpinner';

interface WelcomeScreenProps {
  user: User;
  session: CurrentSession | null;
  onMarkAttendance: (location: GeoLocation) => void;
  loading: boolean;
  checkoutEnabled?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ user, session, onMarkAttendance, loading, checkoutEnabled }) => {
  const { coordinates, loading: geoLoading, error: geoError } = useGeolocation();
  const [distance, setDistance] = useState<number | null>(null);

  const sessionAttendanceRecord = useMemo(() => 
    session ? Object.values(user.attendance || {}).find(record => record.sessionId === session.createdAt) : undefined
  , [session, user.attendance]);

  const isCheckedIn = !!sessionAttendanceRecord;
  const isCheckedOut = !!sessionAttendanceRecord?.checkout;

  useEffect(() => {
    if (coordinates && session?.location) {
      const dist = getHaversineDistance(coordinates, session.location);
      setDistance(dist);
    }
  }, [coordinates, session]);
  
  const renderAttendanceStatus = () => {
    if (!session || !session.active) {
      return (
        <div className="p-4 text-center bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">No active attendance session at the moment.</p>
        </div>
      );
    }
    
    // Logic for when checkout is enabled
    if (checkoutEnabled) {
      if (isCheckedIn && !isCheckedOut) {
        return (
          <div>
            <div className="p-4 text-center bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center space-x-2 mb-4">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold text-green-800 dark:text-green-300">You are checked in.</p>
            </div>
             <button
                onClick={() => coordinates && onMarkAttendance(coordinates)}
                disabled={loading || geoLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
              >
                {loading ? <LoadingSpinner className="text-white"/> : 'Check Out'}
              </button>
          </div>
        );
      }
      if (isCheckedIn && isCheckedOut) {
         return (
             <div className="p-4 text-center bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold text-blue-800 dark:text-blue-300">You have checked out.</p>
            </div>
         );
      }
    } else if (isCheckedIn) { // Original logic if checkout is disabled
         return (
             <div className="p-4 text-center bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center space-x-2">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold text-green-800 dark:text-green-300">Attendance Marked</p>
            </div>
         );
    }

    if (geoLoading) {
       return (
        <div className="p-4 text-center bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center space-x-2">
            <LoadingSpinner className="h-5 w-5 text-indigo-500" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Getting your location...</p>
        </div>
      );
    }
    
    if (geoError) {
        return (
            <div className="p-4 text-center bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{geoError}</p>
            </div>
        );
    }

    if (distance !== null) {
      const inRange = distance <= session.maxDistance;
      return (
        <div>
          <div className={`p-3 text-center rounded-lg mb-4 ${inRange ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-yellow-50 dark:bg-yellow-900/30'}`}>
              <p className={`text-sm ${inRange ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                You are <strong>{distance.toFixed(0)} meters</strong> away. 
                (Max: {session.maxDistance}m)
              </p>
          </div>
          <button
              onClick={() => coordinates && onMarkAttendance(coordinates)}
              disabled={loading || !inRange}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
            >
              {loading ? <LoadingSpinner className="text-white"/> : (inRange ? 'Mark Attendance' : 'You are too far')}
            </button>
        </div>
      );
    }

    return null; // Should not be reached if logic is correct
  };

  const renderAttendanceHistory = () => {
    if (!user.attendance || Object.keys(user.attendance).length === 0) {
      return (
        <div className="p-4 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">No attendance history yet.</p>
        </div>
      );
    }

    const sortedHistory = Object.values(user.attendance).sort((a, b) => 
      new Date(b.checkin.timestamp).getTime() - new Date(a.checkin.timestamp).getTime()
    );

    return (
      <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {sortedHistory.map((record, index) => {
          const recordDate = new Date(record.checkin.timestamp);
          const checkOutDate = record.checkout ? new Date(record.checkout.timestamp) : null;
          return (
            <li key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between text-left">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 dark:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002 2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                   </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {recordDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {recordDate.toLocaleTimeString()}
                    {checkOutDate ? ` - ${checkOutDate.toLocaleTimeString()}` : ''}
                    &nbsp;&bull; {record.deviceInfo.os} ({record.deviceInfo.browser})
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="text-center p-8 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl transform transition-all duration-500 space-y-6">
       <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Welcome, {user.name.split(' ')[0]}!</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Signed in as: {user.name} (ID: {user.id})
            </p>
       </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Attendance Status</h3>
        {renderAttendanceStatus()}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Your History</h3>
        {renderAttendanceHistory()}
      </div>
    </div>
  );
};

export default WelcomeScreen;