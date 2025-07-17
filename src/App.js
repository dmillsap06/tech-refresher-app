import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import InventoryPage from './components/inventory/InventoryPage';
import Settings from './components/Settings';
import PartsPage from './components/parts/PartsPage';
import ArchivedInventory from './components/ArchivedInventory';
import OrdersPage from './components/orders/OrdersPage';
import ErrorLog from './components/ErrorLog';
import Notification from './components/Notification';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import logError from './utils/logError';

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // On auth state change, get the user's profile from Firestore if logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);
      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
      } else {
        // Fetch user profile from Firestore
        // We use the username stored as a document key in /users collection
        // Option 1: If you store by username
        // Option 2: If you store by uid, use user.uid
        let profile = null;
        // Try by uid first (recommended for uniqueness)
        let userRef = doc(db, 'users', user.uid);
        let userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          profile = userSnap.data();
        } else {
          // fallback: try by email or username
          // You may need to search by email if username is not unique
          // For now, let's just fallback to null
          profile = null;
        }
        if (profile) {
          setUserProfile(profile);
          setIsAdmin(profile.role === "admin");
        } else {
          setUserProfile(null);
          setIsAdmin(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (message, type) => {
    setNotification({ message, type });
  };

  const handleLogin = (profile) => {
    setUserProfile(profile);
    setIsAdmin(profile.role === "admin");
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      logError('App-SignOut', error);
      showNotification('Could not sign out properly.', 'error');
    }
    setUserProfile(null);
    setIsAdmin(false);
  };

  const navigate = (page) => {
    setCurrentPage(page);
  };

  if (!authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Initializing Secure Session...
      </div>
    );
  }

  const pageProps = {
    onBack: () => navigate('dashboard'),
    showNotification: showNotification,
    userProfile: userProfile,
    isAdmin: isAdmin
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'inventory':
        return <InventoryPage {...pageProps} />;
      case 'settings':
        return <Settings {...pageProps} />;
      case 'parts':
        return <PartsPage {...pageProps} />;
      case 'archived':
        return <ArchivedInventory {...pageProps} />;
      case 'orders':
        return <OrdersPage {...pageProps} />;
      case 'errorlog':
        return isAdmin ? <ErrorLog {...pageProps} /> : <Dashboard userProfile={userProfile} onLogout={handleLogout} onNavigate={navigate} isAdmin={isAdmin} />;
      case 'dashboard':
      default:
        return <Dashboard userProfile={userProfile} onLogout={handleLogout} onNavigate={navigate} isAdmin={isAdmin} />;
    }
  }

  return (
    <div className="App bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Notification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      {!userProfile ? (
        <Login onLogin={handleLogin} showNotification={showNotification} />
      ) : (
        renderPage()
      )}
    </div>
  );
}

export default App;