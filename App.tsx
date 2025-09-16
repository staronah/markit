import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js';
import { auth } from './firebase/config';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner className="h-12 w-12 text-indigo-500" />
        </div>
      );
    }

    if (user) {
      return <AdminDashboard user={user} />;
    }

    return <LoginScreen />;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {renderContent()}
    </div>
  );
};

export default App;