import React, { useState } from 'react';
import Login from './Login';
import SignUp from './SignUp';

const AuthPage = ({ onLogin, showNotification }) => {
  const [mode, setMode] = useState('login');
  return (
    <>
      {mode === 'login' ? (
        <Login
          onLogin={onLogin}
          showNotification={showNotification}
          onSwitchToSignUp={() => setMode('signup')}
        />
      ) : (
        <SignUp
          onSignUp={onLogin}
          showNotification={showNotification}
          onSwitchToLogin={() => setMode('login')}
        />
      )}
    </>
  );
};

export default AuthPage;