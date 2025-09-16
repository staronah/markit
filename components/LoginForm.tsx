
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoginFormProps {
  onSignIn: (userId: string, fullName: string) => void;
  loading: boolean;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSignIn, loading, error }) => {
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !fullName.trim()) {
      setFormError('Both ID and Full Name are required.');
      return;
    }
    setFormError('');
    onSignIn(userId, fullName);
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl transform transition-all duration-500">
      <h2 className="text-center text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-6">Attendance Sign-In</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Student / Staff ID
            </label>
            <div className="mt-1">
              <input
                id="userId"
                name="userId"
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., 123456"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name
            </label>
            <div className="mt-1">
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., Jane Doe"
              />
            </div>
          </div>
          
          {(error || formError) && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
              <p className="text-sm text-red-700 dark:text-red-300">{error || formError}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors duration-300"
            >
              {loading ? <LoadingSpinner className="text-white"/> : 'Sign In'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
