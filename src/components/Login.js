import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const Login = ({ onLogin, showNotification }) => {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // State to manage the UI flow
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // This local error state is now only for simple form validation, not for database errors.
  const [error, setError] = useState('');

  // Step 1: Handle checking the username
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');

    const userRef = doc(db, 'users', username.toLowerCase());
    
    try {
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // User exists, log them in by passing their profile data up to App.js
        onLogin(userSnap.data());
      } else {
        // User does not exist, show fields for first and last name
        setIsNewUser(true);
      }
    } catch (err) {
      console.error("Error checking user:", err);
      // Use the new notification system for database errors
      showNotification('Could not connect to the database. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle creating the new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and Last name cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');

    const userProfile = {
      username: username.toLowerCase(),
      firstName: firstName,
      lastName: lastName,
      createdAt: serverTimestamp(),
    };

    const userRef = doc(db, 'users', userProfile.username);

    try {
      // Create the new user document in Firestore
      await setDoc(userRef, userProfile);
      // Log the user in with their new profile
      onLogin(userProfile);
    } catch (err) {
      console.error("Error creating user:", err);
      // Use the new notification system for database errors
      showNotification('Could not create account. Please try again.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tech Refresher</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {isNewUser ? 'Welcome! Please create your account.' : 'Securely Login to Your Account'}
            </p>
        </div>

        {error && <p className="my-2 text-center text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}

        {!isNewUser ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Username: <span className="font-bold text-gray-800 dark:text-gray-200">{username}</span></p>
            </div>
            <div>
              <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
             <div>
              <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400">
              {isLoading ? 'Creating Account...' : 'Create Account & Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;