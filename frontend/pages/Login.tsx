import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LOGO_BASE64 } from '../services/assets';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { login, error: authError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setShowModal(false);
    if (!usuario || !password) {
      setError('Por favor ingresa usuario y contraseña.');
      setIsLoading(false);
      return;
    }
    const success = await login(usuario, password);
    if (success) {
      onLogin();
    } else {
      setShowModal(true);
    }
    setIsLoading(false);
  };

  // Mostrar modal si hay error de autenticación
  React.useEffect(() => {
    if (authError && !error) {
      setShowModal(true);
    }
  }, [authError, error]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-black/60 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-gold"></div>
        {/* Alerta para campos vacíos */}
        {error && (
          <div className="mb-6 p-3 bg-brand-gold/20 border border-brand-gold text-brand-gold text-base font-semibold rounded text-center animate-fadeIn">
            {error}
          </div>
        )}
        {/* Modal de credenciales incorrectas */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-black/90 border-2 border-brand-gold rounded-xl p-6 shadow-2xl flex flex-col items-center">
              <span className="text-brand-gold text-xl font-bold mb-2">Credenciales incorrectas</span>
              <p className="text-white mb-4">{authError || 'El correo o la contraseña ingresados no son válidos.'}</p>
              <button
                className="bg-brand-gold text-black font-bold py-2 px-6 rounded-lg mt-2 hover:bg-yellow-500 transition-all"
                onClick={() => setShowModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center mb-10">
          <div className="h-32 w-32 rounded-full border-4 border-brand-gold flex items-center justify-center bg-black mb-4 shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden">
             {/* Intenta cargar el logo desde /images/arca-logo.jpg; si falla usa el BASE64 en assets */}
             <img
               src="/images/arca-logo.png"
               onError={(e) => {
                 const img = e.currentTarget as HTMLImageElement;
                 if (img.src !== LOGO_BASE64) img.src = LOGO_BASE64;
               }}
               alt="El Arca Logo"
               className="w-full h-full object-cover"
             />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-widest text-center mt-2">
            EL ARCA
          </h1>
          <p className="text-brand-gold text-sm tracking-[0.4em] uppercase mt-1">Gym & Fitness</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wider">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full bg-[#111] border border-gray-700 text-white rounded-lg py-4 px-4 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all text-center text-lg tracking-widest"
              placeholder="Email"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#111] border border-gray-700 text-white rounded-lg py-4 px-4 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all text-center text-lg tracking-widest"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-brand-gold/20 border border-brand-gold text-brand-gold text-sm rounded text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-gold hover:bg-yellow-500 text-black font-bold py-4 rounded-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-xs">Sistema de Gestión Interna v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
