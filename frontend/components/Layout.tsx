import React, { useEffect, useState } from 'react';
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
  Clock,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Toast from './Toast';
import NotificationBell from './NotificationBell';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserStatus } from '../types';
import { QrCode } from 'lucide-react'; // Asegúrate de tener este import
import { LOGO_BASE64 } from '../services/assets';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalesAPI, PaymentLogsAPI, MembersAPI, ReservationsAPI } from '../services/api';

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
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null); // Para guardar los datos antes de exportar
  const [totalHoy, setTotalHoy] = useState(0);
  const [ventasHoyList, setVentasHoyList] = useState<any[]>([]);
  const [statsReporte, setStatsReporte] = useState({
  activos: 0,
  nuevosMes: 0,
  bajas: 0,
  total: 0
  });
  const [pagosMesList, setPagosMesList] = useState<any[]>([]);
  const [ocupacionStats, setOcupacionStats] = useState({ porcentaje: 0, totalTurnos: 0, asistencias: 0 });
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

useEffect(() => {
  const cargarDatosReporte = async () => {
    if (!showReports) return;
    try {
      const [ventas, pagos, socios, reservas] = await Promise.all([
        SalesAPI.list().catch(() => []),
        PaymentLogsAPI.list().catch(() => []),
        MembersAPI.list().catch(() => []),
        ReservationsAPI.list().catch(() => [])
      ]);

      const ahora = new Date();
      const hoyStr = ahora.toISOString().split('T')[0];
      const mesActual = ahora.getMonth();
      const anioActual = ahora.getFullYear();

      // --- INGRESOS MENSUALES (Pagos de este mes) ---
      const pMes = pagos.filter((p: any) => {
        const d = new Date(p.date);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
      });
      setPagosMesList(pMes);

      // --- RECAUDACIÓN DE HOY (Ventas + Pagos hoy) ---
      const vHoyTotal = ventas.filter((v: any) => v.date?.split('T')[0] === hoyStr).reduce((acc: number, v: any) => acc + v.total, 0);
      const pHoyTotal = pagos.filter((p: any) => p.date?.split('T')[0] === hoyStr).reduce((acc: number, p: any) => acc + p.amount, 0);
      setTotalHoy(vHoyTotal + pHoyTotal);

      // --- OCUPACIÓN (Reservas de hoy) ---
      const resHoy = reservas.filter((r: any) => {
        // Asumiendo que r.slot.date o r.date es la fecha
        const fechaRes = r.slot?.date || r.date;
        return fechaRes?.split('T')[0] === hoyStr;
      });
      const asistencias = resHoy.filter((r: any) => r.attended === true).length;
      const porcentaje = resHoy.length > 0 ? Math.round((asistencias / resHoy.length) * 100) : 0;
      setOcupacionStats({ porcentaje, totalTurnos: resHoy.length, asistencias });

      // --- AFILIACIONES ---
      const nuevos = socios.filter((s: any) => {
        const d = new Date(s.joinDate);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
      }).length;
      setStatsReporte({
        activos: socios.filter((s: any) => s.status === 'ACTIVE').length,
        nuevosMes: nuevos,
        bajas: socios.filter((s: any) => s.status === 'INACTIVE').length,
        total: socios.length
      });

      // --- VENTAS ---
      setVentasHoyList(ventas.filter((v: any) => v.date?.split('T')[0] === hoyStr));

    } catch (error) { console.error(error); }
  };
  cargarDatosReporte();
}, [showReports]);

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
  const exportAllReportsPDF = async () => {
  setToast({ message: "Generando reporte integral con diseño...", type: "info" });
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const hoy = new Date().toLocaleDateString();

  // --- FUNCIÓN PARA EL DISEÑO IGUAL AL PLAN NUTRICIONAL ---
  const aplicarDisenoPagina = (doc: any, tituloReporte: string) => {
    // 1. Fondo Oscuro (#1a1a1a)
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 2. Marca de Agua GIGANTE (Ocupa el 80% del alto de la página)
    doc.saveGraphicsState();
    try {
        // Opacidad muy sutil (0.08 como en el plan nutricional)
        if (typeof (doc as any).GState === 'function') {
            doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
        }
        const imgSize = pageHeight * 0.8; // TAMAÑO GIGANTE
        const xCentered = (pageWidth - imgSize) / 2;
        const yCentered = (pageHeight - imgSize) / 2;
        
        doc.addImage(LOGO_BASE64, 'PNG', xCentered, yCentered, imgSize, imgSize);
    } catch (e) { console.warn("Error en marca de agua", e); }
    doc.restoreGraphicsState();

    // 3. Barras Doradas Decorativas
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageWidth, 3, 'F'); // Superior
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F'); // Inferior

    // 4. Logo Corporativo (esquina superior derecha)
    doc.addImage(LOGO_BASE64, 'PNG', pageWidth - 45, 8, 35, 25);

    // 5. Títulos Principales
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(212, 175, 55); // Dorado
    doc.text(tituloReporte, pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180); // Gris claro
    doc.text("REPORTE INTEGRAL DE GESTIÓN", pageWidth / 2, 30, { align: "center" });
    doc.text("EL ARCA - GYM & FITNESS", pageWidth / 2, 38, { align: "center" });

    // Datos del pie de página
    doc.setFontSize(8);
    doc.setTextColor(212, 175, 55);
    doc.text(`Generado por: ${user?.firstName || 'Admin'}`, 10, pageHeight - 8);
    doc.text(`Fecha: ${hoy}`, pageWidth - 40, pageHeight - 8);
  };

  try {
    const [ventas, pagos, socios] = await Promise.all([
      SalesAPI.list().catch(() => []),
      PaymentLogsAPI.list().catch(() => []),
      MembersAPI.list().catch(() => [])
    ]);

    // --- PÁGINA 1: INGRESOS ---
    aplicarDisenoPagina(doc, "INGRESOS DEL MES");
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text("Desglose de Membresías y Matrículas", 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Fecha', 'Socio', 'Concepto', 'Monto']],
      body: pagos.map(p => [new Date(p.date).toLocaleDateString(), p.memberName || 'Socio', p.concept, `$${p.amount}`]),
      theme: 'plain',
      styles: { textColor: [255, 255, 255], fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    // --- PÁGINA 2: VENTAS ---
    doc.addPage();
    aplicarDisenoPagina(doc, "VENTAS DE PRODUCTOS");
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text("Resumen de Comercio / Shop", 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Fecha', 'Productos', 'Total']],
      body: ventas.map(v => [new Date(v.date).toLocaleDateString(), v.items.map((i:any) => i.productName).join(", "), `$${v.total}`]),
      theme: 'plain',
      styles: { textColor: [255, 255, 255], fontSize: 9 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // --- PÁGINA 3: AFILIACIONES ---
    doc.addPage();
    aplicarDisenoPagina(doc, "ESTADO DE SOCIOS");
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text("Resumen de la Comunidad", 14, 55);

    const activos = socios.filter(s => s.status === 'ACTIVE').length;
    const morosos = socios.filter(s => s.status === 'DEBTOR').length;

    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor']],
      body: [
          ['Socios Activos', activos],
          ['Socios Morosos', morosos],
          ['Socios Inactivos', socios.filter(s => s.status === 'INACTIVE').length],
          ['TOTAL EN BASE DE DATOS', socios.length]
      ],
      theme: 'plain',
      styles: { textColor: [255, 255, 255], fontSize: 11 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Reporte_Integral_ArcaGym_${hoy.replace(/\//g, '-')}.pdf`);
    setToast({ message: "Reporte generado con éxito", type: "success" });

  } catch (error) {
    console.error(error);
    setToast({ message: "Error al generar el PDF", type: "error" });
  }
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
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                {activeReport && (
                  <button 
                      onClick={() => setActiveReport(null)}
                      className="p-1 hover:bg-gray-800 rounded-full text-gray-400 transition"
                  >
                      <ChevronLeft size={24} />
                  </button>
                )}
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-purple-400" />
                  {activeReport ? `Reporte: ${activeReport}` : "Reportes y Estadísticas"}
                </h3>
              </div>
              <button onClick={() => { setShowReports(false); setActiveReport(null); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {!activeReport ? (
              // --- VISTA DE MENÚ PRINCIPAL ---
              <div className="space-y-3">
                <button 
                  onClick={() => setActiveReport("Ingresos")}
                  className="w-full bg-purple-600/10 border border-purple-700/30 p-4 rounded-lg text-left hover:bg-purple-600/20 transition group"
                >
                  <p className="text-white font-semibold group-hover:text-purple-300">📊 Reporte de Ingresos Mensuales</p>
                  <p className="text-xs text-gray-400">Ver pagos de cuotas y matrículas del mes actual</p>
                </button>

                <button 
                  onClick={() => setActiveReport("Ventas")}
                  className="w-full bg-purple-600/10 border border-purple-700/30 p-4 rounded-lg text-left hover:bg-purple-600/20 transition group"
                >
                  <p className="text-white font-semibold group-hover:text-purple-300">💰 Reporte de Ventas</p>
                  <p className="text-xs text-gray-400">Detalles de suplementos y productos vendidos</p>
                </button>

                <button 
                  onClick={() => setActiveReport("Afiliaciones")}
                  className="w-full bg-purple-600/10 border border-purple-700/30 p-4 rounded-lg text-left hover:bg-purple-600/20 transition group"
                >
                  <p className="text-white font-semibold group-hover:text-purple-300">👥 Reporte de Afiliaciones</p>
                  <p className="text-xs text-gray-400">Nuevos miembros activos vs bajas</p>
                </button>

                <button 
                  onClick={() => setActiveReport("Ocupación")}
                  className="w-full bg-purple-600/10 border border-purple-700/30 p-4 rounded-lg text-left hover:bg-purple-600/20 transition group"
                >
                  <p className="text-white font-semibold group-hover:text-purple-300">📈 Reporte de Ocupación</p>
                  <p className="text-xs text-gray-400">Uso de turnos y niveles de asistencia</p>
                </button>

                <button 
                  onClick={exportAllReportsPDF}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition mt-4 flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Exportar Reportes PDF
                </button>
              </div>
            ) : (
              // --- VISTA DE DETALLE DESPLEGADA ---
              <div className="bg-gray-900/40 p-6 rounded-xl border border-gray-800 border-t-4 border-t-purple-500">
                  {activeReport === "Ingresos" && (
                  <div className="text-gray-300">
                    <div className="flex justify-between items-end mb-4">
                      <p className="text-sm">Pagos de cuotas y matrículas (Mes actual):</p>
                      <p className="text-2xl font-bold text-green-500">
                        Total: $ {pagosMesList.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {pagosMesList.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">No hay pagos registrados este mes.</p>
                      ) : (
                        pagosMesList.map((p, idx) => (
                          <div key={idx} className="bg-black/40 p-3 rounded border border-gray-800 flex justify-between items-center">
                            <div>
                              <p className="text-white font-bold text-sm">{p.memberName || 'Socio'}</p>
                              <p className="text-[10px] text-gray-500 uppercase">{p.concept} - {new Date(p.date).toLocaleDateString()}</p>
                            </div>
                            <span className="text-brand-gold font-mono font-bold">$ {p.amount}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                  {activeReport === "Ventas" && (
                    <div className="text-gray-300">
                      <p className="mb-4 text-sm font-semibold">Productos vendidos hoy:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {ventasHoyList.length === 0 ? (
                          <p className="text-center text-gray-500 py-10">No se registraron ventas hoy.</p>
                        ) : (
                          ventasHoyList.map((venta, idx) => (
                            <div key={idx} className="bg-black/40 p-3 rounded border border-gray-800 flex justify-between items-center">
                              <div>
                                <p className="text-xs text-brand-gold font-mono">
                                  {new Date(venta.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs
                                </p>
                                <p className="text-sm font-medium">
                                  {venta.items?.map((i: any) => `${i.productName || 'Producto'} x${i.quantity}`).join(', ')}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-white">$ {venta.total}</p>
                            </div>
                          ))
                        )}
                      </div>
                      {ventasHoyList.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
                          <span className="text-xs text-gray-500 uppercase">Subtotal Ventas</span>
                          <span className="text-lg font-bold text-brand-gold">
                            $ {ventasHoyList.reduce((acc, v) => acc + v.total, 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ... Aquí puedes agregar más detalles para los otros reportes ... */}
                  {activeReport === "Afiliaciones" && (
                    <div className="text-gray-300">
                      <p className="mb-4 text-sm">Movimiento de socios en el mes actual:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black p-4 rounded text-center border border-green-500/30">
                          <span className="text-3xl font-bold text-green-500">{statsReporte.nuevosMes}</span>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Nuevos este mes</p>
                        </div>
                        <div className="bg-black p-4 rounded text-center border border-red-500/30">
                          <span className="text-3xl font-bold text-red-500">{statsReporte.bajas}</span>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Socios Inactivos</p>
                        </div>
                      </div>
                      <div className="mt-4 bg-gray-800/20 p-3 rounded text-center border border-gray-700">
                        <p className="text-xs">Total de la base de datos: <span className="text-white font-bold">{statsReporte.total} socios</span></p>
                      </div>
                    </div>
                  )}

                {activeReport === "Ocupación" && (
                  <div className="text-gray-300">
                    <p className="mb-4 text-sm">Nivel de asistencia y uso de turnos hoy:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-black p-4 rounded border border-gray-800 text-center">
                        <p className="text-xs text-gray-500 uppercase">Turnos Reservados</p>
                        <p className="text-2xl font-bold text-white">{ocupacionStats.totalTurnos}</p>
                      </div>
                      <div className="bg-black p-4 rounded border border-gray-800 text-center">
                        <p className="text-xs text-gray-500 uppercase">Asistencias</p>
                        <p className="text-2xl font-bold text-green-500">{ocupacionStats.asistencias}</p>
                      </div>
                      <div className="bg-black p-4 rounded border border-gray-800 text-center">
                        <p className="text-xs text-gray-500 uppercase">% Asistencia</p>
                        <p className="text-2xl font-bold text-brand-gold">{ocupacionStats.porcentaje}%</p>
                      </div>
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
                      <div 
                        className="bg-brand-gold h-full transition-all duration-1000" 
                        style={{ width: `${ocupacionStats.porcentaje}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-4 text-center">
                      El nivel de ocupación se calcula en base a los turnos reservados y marcados como "Asistió" en la agenda.
                    </p>
                  </div>
                )}
                  <button 
                      onClick={() => setActiveReport(null)}
                      className="mt-4 text-xs text-purple-400 hover:underline uppercase tracking-widest font-bold"
                  >
                      Volver al panel principal
                  </button>
              </div>
            )}
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
                  <p className="text-white"><strong>Lanzamiento:</strong> Febrero 2026</p>
                  <p className="text-white"><strong>Desarrollado por:</strong> <a href="https://www.folkode.com.ar" className="text-cyan-400 hover:underline">Folkode</a></p>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>© 2026 El Arca Gym. <strong>Desarrollado por:</strong> <a href="https://www.folkode.com.ar" className="text-cyan-400 hover:underline">Folkode</a> Todos los derechos reservados.</p>
                  <p 
                    onClick={() => { setShowAbout(false); setShowTerms(true); }} 
                    className="cursor-pointer text-cyan-400 hover:underline"
                  >
                    Términos de Servicio
                  </p>
                  <p 
                    onClick={() => { setShowAbout(false); setShowPrivacy(true); }} 
                    className="cursor-pointer text-cyan-400 hover:underline"
                  >
                    Política de Privacidad
                </p>
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
      {/* Modal: Términos de Servicio */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#111]">
              <h3 className="text-xl font-bold text-brand-gold flex items-center gap-2 uppercase tracking-tighter">
                <FileText size={20} /> Términos de Servicio
              </h3>
              <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto text-sm text-gray-300 space-y-6 leading-relaxed custom-scrollbar">
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">1. Aceptación de los Términos</h4>
                <p>El acceso y uso de la plataforma de EL ARCA GYM implica la aceptación plena de los presentes Términos y Condiciones por parte del socio o usuario administrativo.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">2. Responsabilidad sobre la Salud</h4>
                <p>Todo socio declara poseer un certificado de aptitud física vigente. EL GIMNASIO no se responsabiliza por lesiones resultantes de una mala ejecución de los ejercicios o de la omisión de patologías previas.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">3. Sistema de Acceso QR y Geolocalización</h4>
                <p>El uso del código QR y validación de DNI es personal e intransferible. El sistema requiere geolocalización activa para garantizar el uso lícito dentro de las instalaciones.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">4. Régimen de Pagos</h4>
                <p>Las membresías se abonan del 1 al 10 de cada mes. A partir del día 11, la falta de pago cambiará el estado a "Moroso", pudiendo restringir el acceso a rutinas digitales.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">5. Jurisdicción</h4>
                <p>Para cualquier controversia, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de Lomas de Zamora, República Argentina.</p>
              </section>
            </div>
            <div className="p-4 border-t border-gray-800 bg-[#111] flex justify-end">
              <button onClick={() => setShowTerms(false)} className="px-6 py-2 bg-brand-gold text-black rounded-lg font-bold hover:bg-yellow-500 transition">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Política de Privacidad */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#111]">
              <h3 className="text-xl font-bold text-brand-gold flex items-center gap-2 uppercase tracking-tighter">
                <Shield size={20} /> Política de Privacidad
              </h3>
              <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
            </div>
            <div className="p-8 overflow-y-auto text-sm text-gray-300 space-y-6 leading-relaxed custom-scrollbar">
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">I. Marco Legal</h4>
                <p>Esta política regula el tratamiento de datos personales de socios y personal conforme a la Ley de Protección de Datos Personales Nº 25.326 de la República Argentina.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">II. Datos Biométricos</h4>
                <p>EL USUARIO presta su consentimiento expreso para el tratamiento de datos biométricos (peso, medidas corporales) con fines exclusivos de salud y seguimiento del entrenamiento.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">III. Geolocalización</h4>
                <p>El sistema accede a la ubicación únicamente para validar la presencia física en el establecimiento durante el acceso por QR. Estos datos no se almacenan permanentemente.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">IV. Seguridad</h4>
                <p>Implementamos cifrado mediante algoritmos de hash (Bcrypt) y protocolos HTTPS para asegurar que la información personal esté protegida contra accesos no autorizados.</p>
              </section>
              <section>
                <h4 className="text-white font-bold mb-2 uppercase text-xs tracking-widest border-b border-gray-800 pb-1">V. Derechos ARCO</h4>
                <p>Usted tiene derecho a acceder, rectificar y suprimir sus datos en forma gratuita. El órgano de control es la Agencia de Acceso a la Información Pública.</p>
              </section>
            </div>
            <div className="p-4 border-t border-gray-800 bg-[#111] flex justify-end">
              <button onClick={() => setShowPrivacy(false)} className="px-6 py-2 bg-brand-gold text-black rounded-lg font-bold hover:bg-yellow-500 transition">Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

const ReportButton = ({ title, desc, onClick }: { title: string, desc: string, onClick: () => void }) => (
  <button 
      onClick={onClick}
      className="w-full bg-purple-600/10 border border-purple-700/50 p-4 rounded-lg text-left hover:bg-purple-600/30 transition group"
  >
      <p className="text-white font-semibold group-hover:text-purple-300">{title}</p>
      <p className="text-xs text-gray-400">{desc}</p>
  </button>
);