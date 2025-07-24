import React, { useState } from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

const AuthPage = ({ onLogin, showNotification }) => {
  const [mode, setMode] = useState('login');
  return (
    <>
      {mode === 'login' ? (
        <LoginPage
          onLogin={onLogin}
          showNotification={showNotification}
          onSwitchToSignUp={() => setMode('register')}
        />
      ) : (
        <RegisterPage
          onSignUp={onLogin}
          showNotification={showNotification}
          onSwitchToLogin={() => setMode('login')}
        />
      )}
    </>
  );
};

export default AuthPage;