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

  const handleDeleteCard = async (cardId: string, cardName: string) => {
      if (window.confirm(`Are you sure you want to delete "${cardName}"? This will permanently delete all its attendance data and cannot be undone.`)) {
          try {
              const updates: { [key: string]: null } = {};
              updates[`/cards/${cardId}`] = null;
              updates[`/admins/${user.uid}/cards/${cardId}`] = null;
              await update(ref(db), updates);
          } catch (error) {
              console.error("Error deleting card:", error);
              alert("Failed to delete the card. Please try again.");
          }
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
              <div key={card.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow relative group transition-shadow hover:shadow-lg">
                <div onClick={() => setSelectedCardId(card.id)} className="cursor-pointer">
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{card.cardName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 truncate">ID: {card.id}</p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCard(card.id, card.cardName);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete ${card.cardName}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
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