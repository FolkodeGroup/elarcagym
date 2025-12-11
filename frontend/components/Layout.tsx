import React, { useState } from 'react';
import { 
  Dumbbell, 
  Users, 
  Activity, 
  ClipboardList, 
  DollarSign, 
  LogOut, 
  Menu,
  X,
  Instagram,
  Calendar
} from 'lucide-react';
import { db } from '../services/db';
import { UserStatus } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string, filter?: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, currentPage, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = db.getUser();

  const menuItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: Activity },
    { id: 'members', label: 'Socios', icon: Users },
    { id: 'biometrics', label: 'Seguimiento', icon: ClipboardList },
    { id: 'operations', label: 'Gestor de Rutinas', icon: Dumbbell },
    { id: 'reservas', label: 'Reservas', icon: Calendar },
    { id: 'admin', label: 'Administración', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-white flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-[#1a1a1a] border-r border-gray-800 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 flex flex-col
      `}>
        <div className="h-20 flex items-center justify-center border-b border-gray-800 bg-black">
            <div className="flex flex-col items-center">
                <h1 className="text-2xl font-display font-bold text-brand-gold tracking-widest">EL ARCA</h1>
                <span className="text-xs text-gray-400 tracking-[0.2em] uppercase">Centro Deportivo</span>
            </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group
                  ${active 
                    ? 'bg-brand-gold text-black font-semibold' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <Icon size={20} className={active ? 'text-black' : 'text-brand-gold group-hover:text-white'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-4">
          <a 
            href="https://www.instagram.com/elarcagym/" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center space-x-3 text-gray-400 hover:text-pink-500 transition-colors px-4"
          >
            <Instagram size={20} />
            <span className="text-sm">@elarcagym</span>
          </a>
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-[#1a1a1a] border-b border-gray-800 flex items-center justify-between px-6 lg:px-10">
          <button 
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <h2 className="text-xl font-display font-semibold text-white uppercase tracking-wider hidden md:block">
            {menuItems.find(i => i.id === currentPage)?.label}
          </h2>

          <div className="flex items-center space-x-4">
             <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white">{user?.name}</span>
                <span className="text-xs text-brand-gold">{user?.role === 'ADMIN' ? 'Administrador' : 'Entrenador'}</span>
             </div>
             <div className="h-10 w-10 rounded-full bg-brand-gold flex items-center justify-center text-black font-bold">
                {user?.name.charAt(0)}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-brand-dark">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;