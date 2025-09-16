import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, signOut } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js';
import { ref, onValue, push, update, get } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js';
import { auth, db } from '../firebase/config';
import type { Card, AdminProfile } from '../types';
import CardDetail from './CardDetail';
import LoadingSpinner from './LoadingSpinner';

interface AdminDashboardProps {
  user: FirebaseUser;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [newCardName, setNewCardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);


  useEffect(() => {
    // Fetch admin's profile name
    const adminRef = ref(db, `admins/${user.uid}`);
    const unsubscribeAdmin = onValue(adminRef, (snapshot) => {
        const data = snapshot.val() as AdminProfile;
        if (data && data.firstName) {
            setAdminName(data.firstName);
        }
    });

    // Listen for changes to the admin's list of card IDs
    const adminCardsRef = ref(db, `admins/${user.uid}/cards`);
    const unsubscribeAdminCards = onValue(adminCardsRef, async (snapshot) => {
        const cardIdsObject = snapshot.val();
        setLoading(true);

        if (cardIdsObject) {
            const cardIds = Object.keys(cardIdsObject);
            // Use Promise.all to fetch all card data in parallel
            const cardPromises = cardIds.map(cardId => 
                get(ref(db, `cards/${cardId}`)).then(cardSnapshot => 
                    cardSnapshot.exists() ? { id: cardId, ...cardSnapshot.val() } : null
                )
            );
            
            try {
                const results = await Promise.all(cardPromises);
                // Filter out any null results (e.g., if a card was deleted)
                setCards(results.filter(c => c !== null) as Card[]);
            } catch (error) {
                console.error("Error fetching card details:", error);
                setCards([]);
            }

        } else {
            setCards([]);
        }
        setLoading(false);
    });


    return () => {
        unsubscribeAdmin();
        unsubscribeAdminCards();
    };
  }, [user.uid]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) return;
    
    setIsCreating(true);
    try {
        const newCardKey = push(ref(db, 'cards')).key;
        if (!newCardKey) {
            throw new Error("Could not generate a new card key.");
        }

        const newCardData = {
            cardName: newCardName,
            hostId: user.uid,
            createdAt: new Date().toISOString()
        };

        // Use a multi-path update to write to both locations atomically
        const updates: { [key: string]: any } = {};
        updates[`/cards/${newCardKey}`] = newCardData;
        updates[`/admins/${user.uid}/cards/${newCardKey}`] = true;

        await update(ref(db), updates);
        
        setNewCardName('');
    } catch (error) {
        console.error("Error creating card:", error);
    } finally {
        setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner className="h-12 w-12 text-indigo-500" /></div>;
  }
  
  if (selectedCardId) {
    return <CardDetail cardId={selectedCardId} onBack={() => setSelectedCardId(null)} user={user} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Welcome, {adminName || user.email}</p>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Sign Out
        </button>
      </header>

      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Create New Attendance Card</h2>
        <form onSubmit={handleCreateCard} className="flex gap-4">
          <input
            type="text"
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            placeholder="e.g., Weekly Team Meeting"
            className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button type="submit" disabled={isCreating} className="px-6 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
            {isCreating ? <LoadingSpinner /> : 'Create'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Your Cards</h2>
        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(card => (
              <div key={card.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCardId(card.id)}>
                <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{card.cardName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 truncate">ID: {card.id}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">You haven't created any cards yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;