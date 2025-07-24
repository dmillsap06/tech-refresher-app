import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { setPersistence, browserLocalPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import logError from '../../utils/logError';

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const Login = ({ onLogin, showNotification, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUsernameEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email cannot be empty.');
      return;
    }
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    if (!passwordPattern.test(password)) {
      setError('Password must be at least 8 characters, alphanumeric, and include at least one special character.');
      return;
    }
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      // Try sign in first
      await signInWithEmailAndPassword(auth, email, password);

      // Get user profile from Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        onLogin(userData);
      } else {
        setError('No user profile found. Please contact support.');
        if (showNotification) showNotification('No user profile found. Please contact support.', 'error');
        await logError('Login-NoUserProfile', { email, username });
      }
    } catch (err) {
      await logError('Login-AuthError', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found for this email.');
        if (showNotification) showNotification('No account found for this email.', 'error');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
        if (showNotification) showNotification('Incorrect password.', 'error');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
        if (showNotification) showNotification('Invalid email format.', 'error');
      } else {
        setError('Authentication error: ' + err.message);
        if (showNotification) showNotification('Authentication error: ' + err.message, 'error');
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
            Securely Login to Your Account
          </p>
        </div>

        {error && <p className="my-2 text-center text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}

        <form onSubmit={handleUsernameEmailSubmit} className="space-y-4">
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
              placeholder="Your username"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              minLength={8}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500"
              required
              autoComplete="current-password"
            />
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Minimum 8 characters, alphanumeric, at least 1 special character.</p>
          </div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">
            {isLoading ? 'Checking...' : 'Login'}
          </button>
        </form>
        <div className="text-center mt-4">
          <button onClick={onSwitchToSignUp} className="text-indigo-600 hover:underline text-sm font-medium">
            Don't have an account? Sign up.
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;