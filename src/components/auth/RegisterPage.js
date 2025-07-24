import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { v4 as uuidv4 } from 'uuid';
import logError from '../../utils/logError';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const SignUp = ({ onSignUp, onSwitchToLogin, showNotification }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!passwordPattern.test(password)) {
      setError('Password must be at least 8 characters, alphanumeric, and include at least one special character.');
      return;
    }
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // New users are admins and get a new groupId by default
      const groupId = uuidv4();
      const userProfile = {
        uid: userCredential.user.uid,
        username: username.toLowerCase(),
        email,
        firstName,
        lastName,
        createdAt: serverTimestamp(),
        role: "admin",
        groupId,
      };
      const userRef = doc(db, 'users', userProfile.uid);
      await setDoc(userRef, userProfile);

      if (onSignUp) onSignUp(userProfile);
      if (showNotification) showNotification("Account created successfully!", "success");
    } catch (err) {
      await logError('SignUp-CreateUser', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered.');
        if (showNotification) showNotification('Email is already registered.', 'error');
      } else {
        setError('Error creating user: ' + err.message);
        if (showNotification) showNotification('Error creating user: ' + err.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tech Refresher</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create your administrator account to get started.
          </p>
        </div>

        {error && <p className="my-2 text-center text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Enter your last name"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="family-name"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              minLength={8}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="new-password"
            />
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Minimum 8 characters, alphanumeric, at least 1 special character.</p>
          </div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none">
            {isLoading ? 'Creating Account...' : 'Create Account & Login'}
          </button>
        </form>
        <div className="text-center mt-4">
          <button onClick={onSwitchToLogin} className="text-indigo-600 hover:underline text-sm font-medium">
            Already have an account? Login.
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;