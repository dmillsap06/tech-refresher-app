import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { v4 as uuidv4 } from 'uuid';
import logError from '../../utils/logError';

const RegisterPage = ({ onSignUp, onSwitchToLogin, showNotification }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = async () => {
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }

    // Check if username already exists
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('Username already taken. Please choose another.');
        return false;
      }
    } catch (err) {
      setError('Error checking username availability.');
      await logError('SignUp-CheckUsername', err);
      return false;
    }

    return true;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    
    setIsLoading(true);
    const isValid = await validateForm();
    
    if (!isValid) {
      setIsLoading(false);
      return;
    }

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
        displayName: `${firstName} ${lastName}`,
        createdAt: serverTimestamp(),
        isAdmin: true,
        isSuperAdmin: false,
        groupId,
      };

      const userRef = doc(db, 'users', userProfile.uid);
      await setDoc(userRef, userProfile);

      // Also create a group document
      await setDoc(doc(db, 'groups', groupId), {
        name: `${firstName}'s Group`,
        adminId: userProfile.uid,
        createdAt: serverTimestamp(),
        members: [userProfile.uid]
      });

      if (onSignUp) onSignUp(userProfile);
      if (showNotification) showNotification("Account created successfully!", "success");
    } catch (err) {
      await logError('SignUp-CreateUser', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered.');
        if (showNotification) showNotification('Email is already registered.', 'error');
      } else {
        setError('Error creating account: ' + err.message);
        if (showNotification) showNotification('Error creating account: ' + err.message, 'error');
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
          <p className="text-indigo-200 mt-2">Create a new account</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Choose a username"
              />
            </div>
            
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Create a password"
                minLength={8}
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Confirm your password"
                minLength={8}
              />
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
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button 
                onClick={onSwitchToLogin} 
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 focus:outline-none transition-colors"
              >
                Sign in
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

export default RegisterPage;