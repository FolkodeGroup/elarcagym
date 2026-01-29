import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Biometrics from './pages/Biometrics';
import Operations from './pages/Operations';
import Nutrition from './pages/Nutrition.tsx';
import Admin from './pages/Admin';
import Ingresos from './pages/Ingresos';
import Reservas from './pages/Reservas';
import RoutineSelfService from './pages/RoutineSelfService'; // Importar nueva sección
import { db } from './services/db';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import QRManager from './pages/QRManager.tsx';
const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageFilter, setPageFilter] = useState<string | null>(null);
  const [showNavModal, setShowNavModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { canNavigate, pendingPage, setPendingPage, confirmNavigation } = useNavigation();

  useEffect(() => {
    // 1. Detectar si venimos desde el QR
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'routine') {
      setCurrentPage('self_service');
      setIsAuthenticated(true); // Saltamos login para consulta pública
      return;
    }

    // 2. Check login normal
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

  const handleNavigate = (page: string, filter?: string) => {
    if (!canNavigate) {
      setPendingPage(page);
      setShowNavModal(true);
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setPageFilter(filter || null);
      setIsTransitioning(false);
    }, 200);
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

  // Renderizado especial para el portal de socios (sin barra lateral)
  if (currentPage === 'self_service') {
    return <RoutineSelfService />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'qr_manager': return <QRManager />;
      case 'members': return <Members initialFilter={pageFilter} />;
      case 'biometrics': return <Biometrics />;
      case 'operations': return <Operations />;
      case 'nutrition': return <Nutrition />;
      case 'admin': return <Admin />;
      case 'Ingresos': return <Ingresos />;
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
        <div className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {renderPage()}
        </div>
      </Layout>
      {showNavModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] max-w-md w-full rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-bold text-white mb-2">Tienes cambios sin guardar</h3>
            <p className="text-sm text-gray-300 mb-4">Si sales ahora, perderás todos los cambios que has hecho. ¿Deseas continuar?</p>
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
    <ThemeProvider>
      <LanguageProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;