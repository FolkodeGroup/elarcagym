import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Biometrics from './pages/Biometrics';
import Operations from './pages/Operations';
import Admin from './pages/Admin';
import Reservas from './pages/Reservas';
import { db } from './services/db';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageFilter, setPageFilter] = useState<string | null>(null);
  const [showNavModal, setShowNavModal] = useState(false);
  const { canNavigate, pendingPage, setPendingPage, confirmNavigation } = useNavigation();

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

  // Intercept navigation
  const handleNavigate = (page: string, filter?: string) => {
    if (!canNavigate) {
      setPendingPage(page);
      setShowNavModal(true);
      return;
    }
    setCurrentPage(page);
    if (filter) {
      setPageFilter(filter);
    } else {
      setPageFilter(null);
    }
  };

  const handleConfirmNavigation = (allow: boolean) => {
    if (allow && pendingPage) {
      setCurrentPage(pendingPage);
      confirmNavigation(true);
    } else {
      confirmNavigation(false);
    }
    setShowNavModal(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'members': return <Members initialFilter={pageFilter} />;
      case 'biometrics': return <Biometrics />;
      case 'operations': return <Operations />;
      case 'admin': return <Admin />;
      case 'reservas': return <Reservas />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <Layout 
          onLogout={handleLogout} 
          currentPage={currentPage}
          onNavigate={handleNavigate}
      >
        {renderPage()}
      </Layout>
      {showNavModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] max-w-md w-full rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-bold text-white mb-2">Tienes cambios sin guardar</h3>
            <p className="text-sm text-gray-300 mb-4">Si sales ahora, perderás todos los cambios que has hecho en la rutina. ¿Deseas continuar?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => handleConfirmNavigation(false)} className="px-4 py-2 text-sm text-gray-300 rounded border border-gray-700 hover:bg-gray-800">Volver</button>
              <button onClick={() => handleConfirmNavigation(true)} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">Descartar y continuar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
};

export default App;