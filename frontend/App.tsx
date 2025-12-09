import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Biometrics from './pages/Biometrics';
import Operations from './pages/Operations';
import Admin from './pages/Admin';
import { db } from './services/db';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Check if user is already logged in from localStorage persistence
    const user = db.getUser();
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    db.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'members': return <Members />;
      case 'biometrics': return <Biometrics />;
      case 'operations': return <Operations />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout 
        onLogout={handleLogout} 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;