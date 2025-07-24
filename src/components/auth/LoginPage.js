import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { setPersistence, browserLocalPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import logError from '../../utils/logError';

const LoginPage = ({ onLogin, showNotification, onSwitchToSignUp }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    
    if (!password.trim()) {
      setError('Password cannot be empty.');
      return;
    }
    
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      // First, find the user's email by username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Username not found.');
        setIsLoading(false);
        if (showNotification) showNotification('Username not found.', 'error');
        return;
      }
      
      // Get the email from the found user document
      const userDoc = querySnapshot.docs[0];
      const email = userDoc.data().email;
      
      // Now try sign in with the email and password
      await signInWithEmailAndPassword(auth, email, password);

      // Get user profile from Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        onLogin(userData);
        if (showNotification) showNotification('Login successful!', 'success');
      } else {
        setError('No user profile found. Please contact support.');
        if (showNotification) showNotification('No user profile found. Please contact support.', 'error');
        await logError('Login-NoUserProfile', { username });
      }
    } catch (err) {
      await logError('Login-AuthError', err);
      if (err.code === 'auth/user-not-found') {
        setError('Invalid username or password.');
        if (showNotification) showNotification('Invalid username or password.', 'error');
      } else if (err.code === 'auth/wrong-password') {
        setError('Invalid username or password.');
        if (showNotification) showNotification('Invalid username or password.', 'error');
      } else {
        setError('Authentication error. Please try again.');
        if (showNotification) showNotification('Authentication error. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 dark:bg-indigo-800 py-6 px-8">
          <h1 className="text-3xl font-bold text-white">Tech Refresher</h1>
          <p className="text-indigo-200 mt-2">Sign in to your account</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Your username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="current-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button 
                onClick={onSwitchToSignUp} 
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 focus:outline-none transition-colors"
              >
                Create an account
              </button>
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs text-white/70">
        <p>© {new Date().getFullYear()} Tech Refresher. All rights reserved.</p>
        <p className="mt-1">Current Time (UTC): {new Date().toISOString().replace('T', ' ').substring(0, 19)}</p>
      </div>
    </div>
  );
};

export default LoginPage;