
import React, { useState } from 'react';
import { db } from '../services/db';
import { LOGO_BASE64 } from '../services/assets';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.login(password)) {
      onLogin();
    } else {
      setError('Contraseña incorrecta. (Prueba: admin123)');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-gold"></div>
        
        <div className="flex flex-col items-center mb-10">
          <div className="h-32 w-32 rounded-full border-4 border-brand-gold flex items-center justify-center bg-black mb-4 shadow-[0_0_20px_rgba(212,175,55,0.3)] overflow-hidden">
             {/* LOGO REAL AQUI */}
             <img src={LOGO_BASE64} alt="El Arca Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-widest text-center mt-2">
            EL ARCA
          </h1>
          <p className="text-brand-gold text-sm tracking-[0.4em] uppercase mt-1">Gym & Fitness</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2 uppercase tracking-wider">
              Código de Acceso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#111] border border-gray-700 text-white rounded-lg py-4 px-4 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all text-center text-lg tracking-widest"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-brand-gold hover:bg-yellow-500 text-black font-bold py-4 rounded-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
          >
            Ingresar
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
