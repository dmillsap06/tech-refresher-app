import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth
import AuthPage from './components/auth/AuthPage';

// Pages
import Dashboard from './components/Dashboard';

// Orders
import PurchaseOrdersPage from './components/purchaseOrders/PurchaseOrdersPage';
import CustomerOrdersPage from './components/orders/CustomerOrdersPage';
import ArchivedOrdersPage from './components/orders/ArchivedOrdersPage';

// Inventory
import DevicesPage from './components/inventory/DevicesPage';
import PartsPage from './components/inventory/PartsPage';
import AccessoriesPage from './components/inventory/AccessoriesPage';
import GamesPage from './components/inventory/GamesPage';

// Other sections
import RepairsPage from './components/repairs/RepairsPage';
import CustomersPage from './components/customers/CustomersPage';
import SettingsPage from './components/Settings/SettingsPage';
import AdminPage from './components/admin/AdminPage';
import Changelog from './components/admin/Changelog';

// Protected route wrapper
const ProtectedRoute = ({ children, isAuthenticated, userProfile, requiredRole }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // If route requires specific role
  if (requiredRole) {
    const hasRole = 
      (requiredRole === 'admin' && (userProfile?.isAdmin || userProfile?.isSuperAdmin)) ||
      (requiredRole === 'superAdmin' && userProfile?.isSuperAdmin);
      
    if (!hasRole) {
      return <Navigate to="/" />;
    }
  }
  
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  const showNotification = (message, type = 'info') => {
    toast[type](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const handleLogin = (userData) => {
    setUserProfile(userData);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile({ id: user.uid, ...userDoc.data() });
          }
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsAuthenticated(false);
      setUserProfile(null);
      showNotification('Logged out successfully', 'success');
    } catch (error) {
      showNotification('Error signing out: ' + error.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/" /> : 
            <AuthPage onLogin={handleLogin} showNotification={showNotification} />
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Dashboard">
                <Dashboard userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Orders Routes */}
        <Route 
          path="/purchase-orders" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Purchase Orders">
                <PurchaseOrdersPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/customer-orders" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Customer Orders">
                <CustomerOrdersPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/archived-orders" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Archived Orders">
                <ArchivedOrdersPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Inventory Routes */}        
        <Route 
          path="/devices" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Devices">
                <DevicesPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/parts" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Parts">
                <PartsPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/accessories" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Accessories">
                <AccessoriesPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/games" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Games">
                <GamesPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Other Routes */}
        <Route 
          path="/repairs" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Repairs">
                <RepairsPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Customers">
                <CustomersPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile}>
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Settings">
                <SettingsPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile} requiredRole="admin">
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Admin">
                <AdminPage userProfile={userProfile} showNotification={showNotification} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/changelog" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} userProfile={userProfile} requiredRole="superAdmin">
              <AppLayout userProfile={userProfile} onLogout={handleLogout} title="Changelog">
                <Changelog userProfile={userProfile} />
              </AppLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all - redirect to dashboard if authenticated, login if not */}
        <Route path="*" element={isAuthenticated ? <Navigate to="/" /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;