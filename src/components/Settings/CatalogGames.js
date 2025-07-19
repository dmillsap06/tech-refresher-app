import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import TrashIcon from '../icons/TrashIcon';
import logError from '../../utils/logError';

const CatalogGames = ({ userProfile, showNotification }) => {
  const [games, setGames] = useState([]);
  const [newGame, setNewGame] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const q = query(collection(db, 'games'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gameList = [];
      snapshot.forEach(doc => gameList.push({ ...doc.data(), id: doc.id }));
      setGames(gameList);
      setLoading(false);
    }, (error) => {
      logError('CatalogGames-onSnapshot', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddGame = async (e) => {
    e.preventDefault();
    if (!newGame.trim()) {
      showNotification('Game name cannot be empty.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'games'), {
        name: newGame.trim(),
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewGame('');
      showNotification('Game added!', 'success');
    } catch (error) {
      logError('CatalogGames-AddGame', error);
      showNotification('Failed to add game.', 'error');
    }
  };

  const handleDeleteGame = async (id) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    try {
      await deleteDoc(doc(db, 'games', id));
      showNotification('Game deleted.', 'success');
    } catch (error) {
      logError('CatalogGames-DeleteGame', error);
      showNotification('Failed to delete game.', 'error');
    }
  };

  return (
    <div>
      <form onSubmit={handleAddGame} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New game name"
          value={newGame}
          onChange={e => setNewGame(e.target.value)}
          className="input"
          required
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add Game
        </button>
      </form>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading games...</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {games.map(game => (
            <li key={game.id} className="flex items-center justify-between py-2">
              <span>{game.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteGame(game.id)}
                className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800"
                title="Delete game"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CatalogGames;