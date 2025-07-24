import React, { useState, useEffect } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to format date as "January 1st, 2025 11:30AM EST"
  const getFormattedDate = () => {
    const now = new Date();
    const options = {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    
    const timeStr = new Intl.DateTimeFormat('en-US', options).format(now);
    
    const dateOptions = {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    const dateStr = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    
    // Add the ordinal suffix (st, nd, rd, th) to the day
    const dayMatch = dateStr.match(/(\d+),/);
    if (dayMatch && dayMatch[1]) {
      const day = parseInt(dayMatch[1], 10);
      let suffix = 'th';
      
      if (day % 10 === 1 && day !== 11) {
        suffix = 'st';
      } else if (day % 10 === 2 && day !== 12) {
        suffix = 'nd';
      } else if (day % 10 === 3 && day !== 13) {
        suffix = 'rd';
      }
      
      // Replace the day number with day + suffix
      const formattedDate = dateStr.replace(/(\d+),/, `$1${suffix},`);
      return `${formattedDate} ${timeStr} EST`;
    }
    
    return `${dateStr} ${timeStr} EST`;
  };

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 1;
    // Uppercase letter check
    if (/[A-Z]/.test(password)) strength += 1;
    // Lowercase letter check
    if (/[a-z]/.test(password)) strength += 1;
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    setPasswordStrength(strength);
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Moderate';
    return 'Strong';
  };

  const validateForm = async () => {
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    // Username validation (alphanumeric, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setError('Username must be 3-20 characters and contain only letters, numbers, and underscores.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    if (password.length < 8 || passwordStrength < 3) {
      setError('Password is too weak. It should be at least 8 characters and include a mix of letters, numbers, and special characters.');
      return false;
    }
	
	// Check if email already exists
try {
  console.log(`Checking if email "${email.toLowerCase()}" is already registered...`);
  const emailQuery = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const emailSnapshot = await getDocs(emailQuery);
  
  if (!emailSnapshot.empty) {
    setError('Email is already registered. Please use a different email or try logging in.');
    return false;
  }
} catch (err) {
  console.error("Email check error:", err);
  // Log error with more explicit error object
  await logError('SignUp-CheckEmail', {
    message: `Error checking if email ${email.toLowerCase()} is already registered: ${err.message}`,
    code: err.code,
    stack: err.stack
  }, {
    email: email.toLowerCase(),
    action: 'Checking email availability'
  });
  setError('Error checking email availability. Please try again or contact support.');
  return false;
}

    // Check if username already exists
    try {
      const usernameQuery = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        setError('Username already taken. Please choose another.');
        return false;
      }
      return true;
    } catch (err) {
      console.error("Username check error:", err);
      await logError('SignUp-CheckUsername', {
        message: 'Error checking username availability',
        originalError: err
      }, {
        username: username.toLowerCase(),
        action: 'Checking username availability'
      });
      setError('Error checking username availability. Please try again or contact support.');
      return false;
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    
    setIsLoading(true);

    try {
      const isValid = await validateForm();
      
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // New users are admins and get a new groupId by default
      const groupId = uuidv4();
      const userProfile = {
        uid: userCredential.user.uid,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
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
      console.error("Account creation error:", err);
      await logError('SignUp-CreateUser', err, {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        firstName,
        lastName,
        userId: auth.currentUser?.uid || 'anonymous'
      });
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered.');
        if (showNotification) showNotification('Email is already registered.', 'error');
      } else {
        setError('Error creating account: ' + (err.message || 'Please try again later.'));
        if (showNotification) showNotification('Error creating account. Please try again.', 'error');
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
                  aria-label="First name"
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
                  aria-label="Last name"
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
                aria-label="Email address"
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
                aria-label="Username"
              />
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                3-20 characters, letters, numbers, and underscores only.
              </p>
            </div>
            
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Create a password"
                  minLength={8}
                  aria-label="Password"
                />
                <button 
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${getStrengthColor()}`} style={{ width: `${(passwordStrength / 5) * 100}%` }}></div>
                  </div>
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                    Password strength: <span className="font-medium">{getStrengthText()}</span>
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2 border ${password && confirmPassword && password !== confirmPassword ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Confirm your password"
                  minLength={8}
                  aria-label="Confirm password"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs mt-1 text-red-500">Passwords do not match</p>
              )}
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
        <p className="mt-1">{getFormattedDate()}</p>
      </div>
    </div>
  );
};

export default RegisterPage;