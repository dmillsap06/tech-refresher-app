import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import InventoryPage from './components/inventory/InventoryPage';
import Settings from './components/Settings';
import PartsPage from './components/parts/PartsPage'; // Updated Import
import ArchivedInventory from './components/ArchivedInventory';
import OrdersPage from './components/orders/OrdersPage';
import ErrorLog from './components/ErrorLog';
import Notification from './components/Notification';
import { auth, signIn } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import logError from './utils/logError';

const ADMIN_USERS = ['dmillsap06'];

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [notification, setNotification] = useState({ message: '', type: '' });

  useEffect(() => {
    signIn().catch(error => {
        logError('App-SignIn', error);
        showNotification('Could not connect to authentication service.', 'error');
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            setAuthReady(true);
        } else {
            setUserProfile(null);
            setIsAdmin(false);
        }
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (message, type) => {
    setNotification({ message, type });
  };

  const handleLogin = (profile) => {
    setUserProfile(profile);
    if (ADMIN_USERS.includes(profile.username.toLowerCase())) {
        setIsAdmin(true);
    } else {
        setIsAdmin(false);
    }
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
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
            // Use the new, refactored PartsPage component
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