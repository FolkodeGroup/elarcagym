import React from 'react';
import { LOGO_BASE64 } from '../services/assets';

interface LandingProps {
  onGoToLogin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onGoToLogin }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#111] to-black"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-gold/5 rounded-full blur-3xl"></div>
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="h-40 w-40 md:h-48 md:w-48 rounded-full border-4 border-brand-gold flex items-center justify-center bg-black mb-8 shadow-[0_0_40px_rgba(212,175,55,0.3)] overflow-hidden">
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

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-display font-bold text-brand-gold tracking-[0.3em] text-center mb-2">
          EL ARCA
        </h1>
        <p className="text-gray-400 text-lg md:text-xl tracking-[0.5em] uppercase mb-12">
          Centro Deportivo
        </p>

        {/* Coming Soon Badge */}
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl px-8 py-6 text-center max-w-md backdrop-blur-sm">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Próximamente</h2>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Estamos trabajando en nuestra nueva plataforma web. 
            Muy pronto podrás conocer más sobre nosotros, nuestros servicios 
            y todo lo que El Arca tiene para ofrecerte.
          </p>
        </div>

        {/* Social */}
        <div className="mt-12 flex items-center gap-4">
          <a
            href="https://www.instagram.com/elarcagym/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-pink-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
            <span className="text-sm">@elarcagym</span>
          </a>
        </div>
      </div>

      {/* Footer with hidden login access */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-gray-700 text-xs">
          © {new Date().getFullYear()} El Arca Gym. <strong>Desarrollado por:</strong> <a href="https://www.folkode.com.ar" className="text-cyan-400 hover:underline">Folkode</a>  Todos los derechos reservados.
        </p>
        {/* Acceso oculto al login: doble click en el footer */}
        <button
          onClick={onGoToLogin}
          className="mt-2 text-gray-800 hover:text-gray-600 text-[10px] transition-colors cursor-default select-none"
          title=""
          aria-label="Acceso interno"
        >
          <strong>Acceso staff</strong> 
        </button>
      </footer>
    </div>
  );
};

export default Landing;
