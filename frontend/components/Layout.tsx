import React, { useState } from 'react';
import { 
  Dumbbell, 
  Users, 
  Activity, 
  ClipboardList, 
  ClipboardCheck,
  DollarSign, 
  LogOut, 
  Menu,
  X,
  Instagram,
  Calendar,
  Settings,
  Download,
  BarChart3,
  Shield,
  FileText,
  ChevronDown,
  Sun,
  Moon,
  ShoppingCart,
  Apple,
  User,
  UserCog,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Toast from './Toast';
import NotificationBell from './NotificationBell';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserStatus } from '../types';
import { QrCode } from 'lucide-react'; // Asegúrate de tener este import
import { LOGO_BASE64 } from '../services/assets';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string, filter?: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, currentPage, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const { user, isAdmin, hasPermission, hasAnyPermission } = useAuth();

  // Mapeo de páginas a permisos requeridos
  const PAGE_PERMISSIONS: Record<string, string[]> = {
    dashboard: ['dashboard.view'],
    members: ['members.view'],
    biometrics: ['biometrics.view'],
    operations: ['routines.view'],
    nutrition: ['nutrition.view'],
    reservas: ['reservations.view'],
    attendance: ['reservations.view'],
    qr_manager: ['members.view'],
    admin: ['products.view', 'sales.view'],
    Ingresos: ['payments.view', 'sales.view'],
    waitlist: ['members.view'],
    users_management: ['users.view'],
  };

  const allMenuItems = [
    { id: 'dashboard', label: t('panelPrincipal'), icon: Activity },
    { id: 'members', label: t('socios'), icon: Users },
    { id: 'biometrics', label: t('seguimiento'), icon: ClipboardList },
    { id: 'operations', label: t('gestorRutinas'), icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrición', icon: Apple },
    { id: 'reservas', label: t('reservas'), icon: Calendar },
    { id: 'attendance', label: 'Asistencia', icon: ClipboardCheck },
    { id: 'qr_manager', label: 'Codigo QR', icon: QrCode },
    { id: 'admin', label: t('comercio'), icon: ShoppingCart },
    { id: 'Ingresos', label: t('ingresosVentas'), icon: DollarSign },
    { id: 'waitlist', label: 'Lista de Espera', icon: Clock },
  ];

  // Agregar opción de gestión de usuarios solo para administradores
  if (isAdmin) {
    allMenuItems.push({ id: 'users_management', label: 'Usuarios', icon: UserCog });
  }

  // Filtrar items del menú según permisos del usuario
  const menuItems = allMenuItems.filter(item => {
    if (isAdmin) return true; // Admin ve todo
    const requiredPerms = PAGE_PERMISSIONS[item.id];
    if (!requiredPerms) return true; // Si no hay permisos definidos, se muestra
    return hasAnyPermission(requiredPerms);
  });

  return (
    <div className="min-h-screen bg-brand-dark text-white flex overflow-hidden" onClick={() => { adminMenuOpen && setAdminMenuOpen(false); showUserMenu && setShowUserMenu(false); }}>
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
        <div className="h-20 flex items-center justify-center border-b border-gray-800 bg-black flex-shrink-0">
            <div className="flex !mt-4 !pt-4 flex-col items-center">
              <div className="h-20 w-20 rounded-full border-2 border-brand-gold flex items-center justify-center bg-black mb-1 shadow-[0_0_10px_rgba(212,175,55,0.3)] overflow-hidden">
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
            </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto min-h-0">
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

        <div className="p-4 border-t border-gray-800 space-y-3 flex-shrink-0">
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
            onClick={() => setShowLogoutConfirm(true)}
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
            {menuItems.find(i => i.id === currentPage)?.label || (currentPage === 'user_profile' ? 'Mi Perfil' : '')}
          </h2>

          <div className="flex items-center space-x-4 relative">
             {/* Notification Bell */}
             <NotificationBell onNavigate={onNavigate} />
             
             {/* User Profile Button */}
             <div className="relative">
               <button 
                 onClick={() => setShowUserMenu(!showUserMenu)}
                 className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition"
               >
                 <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center">
                   <User size={18} className="text-brand-gold" />
                 </div>
                 <div className="hidden md:block text-left">
                   <p className="text-sm text-white font-medium truncate max-w-[120px]">
                     {user?.name || user?.firstName || 'Usuario'}
                   </p>
                   <p className="text-xs text-gray-400">
                     {user?.role === 'ADMIN' ? 'Administrador' : 'Profesor'}
                   </p>
                 </div>
                 <ChevronDown size={16} className="text-gray-400 hidden md:block" />
               </button>

               {/* User Dropdown Menu */}
               {showUserMenu && (
                 <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-14 w-56 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                   <div className="p-3 border-b border-gray-800">
                     <p className="text-white font-medium">{user?.name || `${user?.firstName} ${user?.lastName}`}</p>
                     <p className="text-xs text-gray-400">{user?.email}</p>
                   </div>
                   <div className="py-2">
                     <button
                       onClick={() => {
                         setShowUserMenu(false);
                         onNavigate('user_profile');
                       }}
                       className="w-full px-4 py-2 flex items-center gap-3 text-gray-300 hover:bg-gray-800 transition"
                     >
                       <User size={16} />
                       <span>Mi Perfil</span>
                     </button>
                     <button
                       onClick={() => {
                         setShowUserMenu(false);
                         setShowLogoutConfirm(true);
                       }}
                       className="w-full px-4 py-2 flex items-center gap-3 text-red-400 hover:bg-red-900/20 transition"
                     >
                       <LogOut size={16} />
                       <span>Cerrar Sesión</span>
                     </button>
                   </div>
                 </div>
               )}
             </div>

             <button 
               onClick={() => setAdminMenuOpen(!adminMenuOpen)}
               className="h-10 w-10 rounded-lg bg-brand-gold flex items-center justify-center text-black hover:bg-yellow-400 transition relative hover:scale-110 group"
               title="Ajustes y configuración"
             >
                <Settings size={20} className="group-hover:rotate-90 transition-transform" />
                {adminMenuOpen && (
                  <span className="absolute inset-0 rounded-lg border-2 border-brand-gold animate-pulse"></span>
                )}
             </button>

             {/* Admin Dropdown Menu */}
             {adminMenuOpen && (
               <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-16 w-64 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                 <div className="bg-gradient-to-r from-brand-gold to-yellow-500 p-3">
                   <h3 className="text-black font-bold text-sm">{t('panelAdmin')}</h3>
                   <p className="text-xs text-black/70">{t('gestiona')}</p>
                 </div>

                 <div className="py-2">
                   {/* Preferencias (Oculto por requerimiento, código preservado) */}
                   {false && (
                   <button
                     onClick={() => {
                       setShowPreferences(true);
                       setShowSettings(false);
                       setShowBackup(false);
                       setShowReports(false);
                       setShowAudit(false);
                       setShowAbout(false);
                       setAdminMenuOpen(false);
                     }}
                     className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition text-white group"
                   >
                     <ChevronDown size={18} className="text-blue-400 group-hover:scale-110 transition" />
                     <div className="flex-1 text-left">
                       <p className="text-sm font-semibold">{t('preferencias')}</p>
                       <p className="text-xs text-gray-400">{t('temaIdioma')}</p>
                     </div>
                   </button>
                   )}

                   {/* Respaldos */}
                   <button
                     onClick={() => {
                       setShowBackup(true);
                       setShowSettings(false);
                       setShowPreferences(false);
                       setShowReports(false);
                       setShowAudit(false);
                       setShowAbout(false);
                       setAdminMenuOpen(false);
                     }}
                     className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition text-white group"
                   >
                     <Download size={18} className="text-green-400 group-hover:scale-110 transition" />
                     <div className="flex-1 text-left">
                       <p className="text-sm font-semibold">{t('respaldos')}</p>
                       <p className="text-xs text-gray-400">{t('importarExportar')}</p>
                     </div>
                   </button>

                   {/* Ejercicios */}
                   <button
                     onClick={() => {
                       setAdminMenuOpen(false);
                       onNavigate('exercises_admin');
                     }}
                     className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition text-white group"
                   >
                     <Dumbbell size={18} className="text-brand-gold group-hover:scale-110 transition" />
                     <div className="flex-1 text-left">
                       <p className="text-sm font-semibold">Ejercicios</p>
                       <p className="text-xs text-gray-400">Gestionar ejercicios</p>
                     </div>
                   </button>

                   {/* Reportes */}
                   <button
                     onClick={() => {
                       setShowReports(true);
                       setShowSettings(false);
                       setShowPreferences(false);
                       setShowBackup(false);
                       setShowAudit(false);
                       setShowAbout(false);
                       setAdminMenuOpen(false);
                     }}
                     className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition text-white group"
                   >
                     <BarChart3 size={18} className="text-purple-400 group-hover:scale-110 transition" />
                     <div className="flex-1 text-left">
                       <p className="text-sm font-semibold">{t('reportes')}</p>
                       <p className="text-xs text-gray-400">{t('analisisIngresos')}</p>
                     </div>
                   </button>

                   {/* Auditoría */}
                   <button
                     onClick={() => {
                       setShowAudit(true);
                       setShowSettings(false);
                       setShowPreferences(false);
                       setShowBackup(false);
                       setShowReports(false);
                       setShowAbout(false);
                       setAdminMenuOpen(false);
                     }}
                     className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition text-white group"
                   >
                     <Shield size={18} className="text-red-400 group-hover:scale-110 transition" />
                     <div className="flex-1 text-left">
                       <p className="text-sm font-semibold">{t('auditoria')}</p>
                       <p className="text-xs text-gray-400">{t('registroCambios')}</p>
                     </div>
                   </button>

                   {/* Sobre la App */}
                   <button
                     onClick={() => {
                       setShowAbout(true);
                       setShowSettings(false);
                       setShowPreferences(false);
                       setShowBackup(false);
                       setShowReports(false);
                       setShowAudit(false);
                       setAdminMenuOpen(false);
                     }}
                     className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800 transition text-white group border-t border-gray-700"
                   >
                     <FileText size={18} className="text-cyan-400 group-hover:scale-110 transition" />
                     <div className="flex-1 text-left">
                       <p className="text-sm font-semibold">{t('sobreApp')}</p>
                       <p className="text-xs text-gray-400">{t('versionInfo')}</p>
                     </div>
                   </button>
                 </div>
               </div>
             )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-brand-dark">
          {children}
        </main>

        {/* MODALES DE ADMINISTRACIÓN */}

        {/* Modal Configuración */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings className="text-brand-gold" />
                  {t('ajustesApp')}
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-white font-semibold mb-2">{t('nombreGimnasio')}</label>
                  <input type="text" defaultValue="El Arca" className="w-full bg-black text-white border border-gray-700 rounded px-3 py-2" />
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-white font-semibold mb-2">{t('correoContacto')}</label>
                  <input type="email" placeholder="info@elarcagym.com" className="w-full bg-black text-white border border-gray-700 rounded px-3 py-2" />
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-white font-semibold mb-2">{t('telefono')}</label>
                  <input type="tel" placeholder="+54 9 (xxx) xxx-xxxx" className="w-full bg-black text-white border border-gray-700 rounded px-3 py-2" />
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-white font-semibold mb-2">{t('horarioAtencion')}</label>
                  <div className="flex gap-2">
                    <input type="time" defaultValue="06:00" className="flex-1 bg-black text-white border border-gray-700 rounded px-3 py-2" />
                    <span className="text-white flex items-center">{t('a')}</span>
                    <input type="time" defaultValue="22:00" className="flex-1 bg-black text-white border border-gray-700 rounded px-3 py-2" />
                  </div>
                </div>

                <button
                  className="w-full bg-brand-gold text-black py-2 rounded-lg font-bold hover:bg-yellow-400 transition"
                  onClick={() => {
                    setShowSettings(false);
                    setToast({ message: t('cambiosGuardados'), type: 'success' });
                  }}
                >
                  {t('guardarCambios')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Preferencias */}
        {showPreferences && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ChevronDown className="text-blue-400" />
                  {t('preferencias')}
                </h3>
                <button onClick={() => setShowPreferences(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Selector de tema oculto por ahora */}
                {/* 
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-white font-semibold mb-2">{t('tema')}</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleTheme('dark')}
                      className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
                        theme === 'dark' 
                          ? 'bg-brand-gold text-black' 
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      <Moon size={16} />
                      {t('oscuro')}
                    </button>
                    <button 
                      onClick={() => toggleTheme('light')}
                      className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
                        theme === 'light' 
                          ? 'bg-brand-gold text-black' 
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      <Sun size={16} />
                      {t('claro')}
                    </button>
                  </div>
                </div>
                */}

                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-white font-semibold mb-2">{t('idioma')}</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'es' | 'en' | 'pt')}
                    className="w-full bg-black text-white border border-gray-700 rounded px-3 py-2"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>

                <button
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                  onClick={() => {
                    setShowPreferences(false);
                    setToast({ message: t('preferenciasAplicadas'), type: 'success' });
                  }}
                >
                  {t('aplicarPreferencias')}
                </button>
                    {toast && (
                      <Toast message={toast.message} type={toast.type} duration={2500} onClose={() => setToast(null)} />
                    )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Respaldos */}
        {showBackup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Download className="text-green-400" />
                  Gestión de Respaldos
                </h3>
                <button onClick={() => setShowBackup(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">

                <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg">
                  <p className="text-white font-semibold mb-3">Exportar Datos</p>
                  <p className="text-sm text-gray-300 mb-3">Descarga un respaldo completo de todos tus datos en formato Excel (.xlsx)</p>
                  <button
                    className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/config/backup/export-excel`, {
                          method: 'GET',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (!res.ok) throw new Error('Error al descargar respaldo');
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'respaldo-el-arca-gym.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        setToast({ message: 'Respaldo descargado correctamente.', type: 'success' });
                      } catch (error) {
                        setToast({ message: 'Error al descargar respaldo.', type: 'error' });
                      }
                    }}
                  >
                    📥 Descargar Respaldo Completo
                  </button>
                </div>

                <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                  <p className="text-white font-semibold mb-3">Importar Datos</p>
                  <p className="text-sm text-gray-300 mb-3">Carga un archivo de respaldo anterior en formato Excel (.xlsx)</p>
                  <form
                    className="w-full flex flex-col gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const input = document.getElementById('import-respaldo-input-layout') as HTMLInputElement;
                      if (!input.files || input.files.length === 0) {
                        setToast({ message: 'Selecciona un archivo Excel.', type: 'error' });
                        return;
                      }
                      const file = input.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const token = localStorage.getItem('auth_token');
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/config/backup/import-excel`, {
                          method: 'POST',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                        });
                        if (!res.ok) throw new Error('Error al importar respaldo');
                        await res.json();
                        setToast({ message: 'Respaldo importado correctamente.', type: 'success' });
                      } catch (error) {
                        setToast({ message: 'Error al importar respaldo.', type: 'error' });
                      }
                    }}
                  >
                    <input id="import-respaldo-input-layout" type="file" accept=".xlsx" className="w-full bg-black text-white border border-gray-700 rounded px-3 py-2 mb-3" />
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                      📤 Importar Respaldo
                    </button>
                  </form>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <p className="text-white text-sm">
                    <strong>Último respaldo:</strong> 16 de enero de 2026 - 14:30
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Reportes */}
        {showReports && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-purple-400" />
                  Reportes
                </h3>
                <button onClick={() => setShowReports(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3">
                <button className="w-full bg-purple-600/20 border border-purple-700 p-4 rounded-lg text-left hover:bg-purple-600/40 transition">
                  <p className="text-white font-semibold">📊 Reporte de Ingresos Mensuales</p>
                  <p className="text-xs text-gray-400">Analiza tus ingresos por mes</p>
                </button>

                <button className="w-full bg-purple-600/20 border border-purple-700 p-4 rounded-lg text-left hover:bg-purple-600/40 transition">
                  <p className="text-white font-semibold">💰 Reporte de Ventas</p>
                  <p className="text-xs text-gray-400">Detalles de productos vendidos</p>
                </button>

                <button className="w-full bg-purple-600/20 border border-purple-700 p-4 rounded-lg text-left hover:bg-purple-600/40 transition">
                  <p className="text-white font-semibold">👥 Reporte de Afiliaciones</p>
                  <p className="text-xs text-gray-400">Nuevos miembros y cancelaciones</p>
                </button>

                <button className="w-full bg-purple-600/20 border border-purple-700 p-4 rounded-lg text-left hover:bg-purple-600/40 transition">
                  <p className="text-white font-semibold">📈 Reporte de Ocupación</p>
                  <p className="text-xs text-gray-400">Uso de reservas y horarios</p>
                </button>

                <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition mt-4">
                  📥 Exportar Reportes PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Auditoría */}
        {showAudit && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="text-red-400" />
                  Registro de Auditoría
                </h3>
                <button onClick={() => setShowAudit(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="bg-gray-800/30 p-3 rounded border-l-4 border-blue-500">
                  <p className="text-white text-sm font-semibold">✏️ Productos actualizados</p>
                  <p className="text-xs text-gray-400">Por: Admin - 16/01/2026 14:30</p>
                </div>

                <div className="bg-gray-800/30 p-3 rounded border-l-4 border-green-500">
                  <p className="text-white text-sm font-semibold">➕ Nuevo socio agregado</p>
                  <p className="text-xs text-gray-400">Por: Admin - 16/01/2026 13:15</p>
                </div>

                <div className="bg-gray-800/30 p-3 rounded border-l-4 border-yellow-500">
                  <p className="text-white text-sm font-semibold">🛒 Venta registrada - $250.00</p>
                  <p className="text-xs text-gray-400">Por: Admin - 16/01/2026 12:45</p>
                </div>

                <div className="bg-gray-800/30 p-3 rounded border-l-4 border-red-500">
                  <p className="text-white text-sm font-semibold">🗑️ Producto eliminado</p>
                  <p className="text-xs text-gray-400">Por: Admin - 15/01/2026 11:20</p>
                </div>
              </div>

              <button className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition mt-4">
                📥 Exportar Auditoría
              </button>
            </div>
          </div>
        )}

        {/* Modal Sobre la App */}
        {showAbout && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-cyan-400" />
                  Sobre la App
                </h3>
                <button onClick={() => setShowAbout(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="text-center space-y-4">
                <div className="text-4xl font-display font-bold text-brand-gold">
                  EL ARCA
                </div>
                <p className="text-gray-400 text-sm">Centro Deportivo - Gestor Integral</p>

                <div className="bg-gray-800/50 p-4 rounded-lg space-y-2">
                  <p className="text-white"><strong>Versión:</strong> 1.0.0</p>
                  <p className="text-white"><strong>Lanzamiento:</strong> Enero 2026</p>
                  <p className="text-white"><strong>Desarrollado por:</strong> <a href="https://www.folkode.com.ar" className="text-cyan-400 hover:underline">Folkode</a></p>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>© 2026 El Arca Gym. <strong>Desarrollado por:</strong> <a href="https://www.folkode.com.ar" className="text-cyan-400 hover:underline">Folkode</a> Todos los derechos reservados.</p>
                  <p className="cursor-pointer text-cyan-400 hover:underline">Términos de Servicio</p>
                  <p className="cursor-pointer text-cyan-400 hover:underline">Política de Privacidad</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal de confirmación de cierre de sesión */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#222] max-w-sm w-full rounded-xl border border-gray-700 p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <LogOut size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Cerrar Sesión</h3>
              <p className="text-gray-400 text-sm mt-2">
                ¿Estás seguro de que deseas cerrar sesión? Deberás volver a ingresar tus credenciales para acceder al sistema.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} duration={2500} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default Layout;