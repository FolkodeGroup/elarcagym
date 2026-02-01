// Utilidad para obtener fecha local YYYY-MM-DD
const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
import React, { useEffect, useState } from 'react';
import { MembersAPI, SlotsAPI, ReservationsAPI, SalesAPI } from '../services/api';
import { Member, UserStatus, Slot, Reservation, Sale } from '../types';
import { isCurrentOnPayment, isDebtorByPayment } from '../services/membershipUtils';
import { Users, AlertCircle, TrendingUp, DollarSign, CreditCard, Clock, UserX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

interface DashboardProps {
  onNavigate: (page: string, filter?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { setCanNavigate } = useNavigation();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersData, slotsData, reservationsData, salesData] = await Promise.all([
        MembersAPI.list(),
        SlotsAPI.list(),
        ReservationsAPI.list(),
        SalesAPI.list()
      ]);
      setMembers(membersData);
      setSlots(slotsData);
      setReservations(reservationsData);
      setSales(salesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setToast({ message: 'Error al cargar datos', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Usar lógica consistente con Members.tsx
  const activeMembers = members.filter(m => m.status === UserStatus.ACTIVE).length;
  const currentMembers = members.filter(m => m.status === UserStatus.ACTIVE && isCurrentOnPayment(m)).length;
  // Morosos = Activos - Al Día
  const debtors = activeMembers - currentMembers;

  // Obtener turnos de hoy con reservaciones
  const getTodaySlots = () => {
    const now = new Date();
    const todayLocal = getLocalDateString(now);
    
    return slots
      .filter(s => {
        const slotDate = typeof s.date === 'string' ? s.date.split('T')[0] : getLocalDateString(new Date(s.date));
        return slotDate === todayLocal;
      })
      .filter(s => reservations.some(r => r.slotId === s.id))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  // Calcular ingresos de hoy
  const getTodayIncome = () => {
    const hoy = getLocalDateString(new Date());
    const ventasHoy = sales.filter(venta => {
      const fechaVenta = getLocalDateString(new Date(venta.date));
      return fechaVenta === hoy;
    });
    return ventasHoy.reduce((acc, venta) => acc + venta.total, 0);
  };

  const todayIncome = getTodayIncome();

  const inactiveMembers = members.filter(m => m.status === UserStatus.INACTIVE).length;
  const data = [
    { name: 'Activos', value: activeMembers, color: '#4ade80' },
    { name: 'Morosos', value: debtors, color: '#ef4444' },
    { name: 'Inactivos', value: inactiveMembers, color: '#9ca3af' },
  ];

  const handleNavigateToIngresos = () => {
    onNavigate('Ingresos');
  };

  // Obtener ausencias recientes (últimos 7 días)
  const getRecentAbsences = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return reservations.filter(r => {
      if (r.attended !== false || !r.slotId) return false;
      const slot = slots.find(s => s.id === r.slotId);
      if (!slot) return false;
      const slotDate = new Date(slot.date);
      return slotDate >= sevenDaysAgo;
    }).sort((a, b) => {
      const slotA = slots.find(s => s.id === a.slotId);
      const slotB = slots.find(s => s.id === b.slotId);
      if (!slotA || !slotB) return 0;
      return new Date(slotB.date).getTime() - new Date(slotA.date).getTime();
    });
  };

  const ausenciasRecientes = getRecentAbsences();
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <button onClick={() => onNavigate('members')} className="text-left hover:opacity-80 transition">
          <StatCard 
            title="Socios Totales" 
            value={members.length} 
            icon={Users} 
            trend="+5% mes pasado" 
          />
        </button>
        <button onClick={() => onNavigate('members', 'active')} className="text-left hover:opacity-80 transition">
          <StatCard 
            title="Activos" 
            value={activeMembers} 
            icon={TrendingUp} 
            color="text-green-500" 
          />
        </button>
        <button onClick={() => onNavigate('members', 'current')} className="text-left hover:opacity-80 transition">
          <StatCard 
            title="Al Día" 
            value={currentMembers} 
            icon={CreditCard} 
            color="text-blue-500" 
          />
        </button>
        <button onClick={() => onNavigate('members', 'debtor')} className="text-left hover:opacity-80 transition">
          <StatCard 
            title="Morosos" 
            value={debtors} 
            icon={AlertCircle} 
            color="text-red-500" 
            bg="bg-red-500/10"
          />
        </button>
        <button onClick={handleNavigateToIngresos} className="text-left hover:opacity-80 transition">
          <StatCard 
            title="Ingresos (Hoy)" 
            value={`$${todayIncome.toFixed(2)}`} 
            icon={DollarSign} 
            color="text-brand-gold" 
          />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-display font-bold text-white mb-6">Estado de la Membresía</h3>
          <div className="h-64 w-full">
            {/* minWidth y minHeight agregados para evitar error de dimensiones en Recharts */}
            <div style={{ minWidth: 0, minHeight: 200, width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                  cursor={{ fill: 'transparent' }}
                  formatter={(value) => [`${value}`, 'Cantidad:']}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Turnos Reservados para Hoy - Movido aqui */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-brand-gold" /> Turnos Hoy
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {getTodaySlots().length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin turnos programados</p>
            ) : (
              getTodaySlots().map(slot => {
                const slotReservations = reservations.filter(r => r.slotId === slot.id);
                return (
                  <div key={slot.id} className="bg-black/40 p-3 rounded border border-brand-gold/30 hover:border-brand-gold/60 transition">
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <Clock size={14} className="text-brand-gold" />
                      {slot.time} 
                      <span className="text-xs bg-gray-700/50 px-2 py-0.5 rounded">
                        {slotReservations.length} {slotReservations.length === 1 ? 'persona' : 'personas'}
                      </span>
                    </p>
                    {slot.target && <p className="text-xs text-gray-400 mt-0.5">📌 {slot.target}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slotReservations.map(r => (
                        <span key={r.id} className="text-xs bg-brand-gold/20 border border-brand-gold/40 px-2 py-1 rounded text-brand-gold truncate max-w-32">
                          {r.clientName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Socios que NO asistieron */}
        <div className="lg:col-span-2 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <UserX size={20} className="text-red-400" />
              No Asistieron
            </h3>
            <span className="text-xs bg-red-500/20 border border-red-500/40 px-2 py-1 rounded text-red-400 font-bold">
              {ausenciasRecientes.length}
            </span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {ausenciasRecientes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin ausencias registradas</p>
            ) : (
              ausenciasRecientes.map(r => {
                const slot = slots.find(s => s.id === r.slotId);
                const socio = members.find(m => m.id === r.memberId);
                const phone = socio?.phone || '';
                
                return (
                  <div key={r.id} className="bg-black/40 p-3 rounded border border-red-700/50 hover:border-red-600 transition flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate">{r.clientName}</p>
                      {slot && (
                        <p className="text-xs text-gray-400">
                          📅 {new Date(slot.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} 
                          {' '} ⏰ {slot.time}
                        </p>
                      )}
                      {phone && <p className="text-xs text-gray-500 mt-0.5">📱 {phone}</p>}
                    </div>
                    {phone && (
                      <button
                        className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 transition"
                        title="Enviar mensaje por WhatsApp"
                        onClick={() => {
                          // Normalizar número para WhatsApp
                          let wpp = phone.replace(/\D/g, '');
                          if (wpp.startsWith('549')) {
                            // Ya está correcto
                          } else if (wpp.startsWith('54')) {
                            wpp = '549' + wpp.substring(2);
                          } else if (wpp.startsWith('0')) {
                            wpp = '549' + wpp.substring(1);
                          } else {
                            wpp = '549' + wpp;
                          }
                          
                          const memberName = r.clientName.split(' ')[0];
                          const slotInfo = slot ? `${new Date(slot.date).toLocaleDateString('es-AR')} a las ${slot.time}` : 'tu turno';
                          const message = `Hola ${memberName}, notamos que no pudiste asistir a ${slotInfo}. ¿Todo bien? ¿Te gustaría reagendar?`;
                          
                          window.open(`https://wa.me/${wpp}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                      >
                        💬 WhatsApp
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color = "text-white", bg, trend }: any) => (
  <div className={`bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 hover:border-brand-gold/50 transition-colors cursor-pointer ${bg}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">{title}</p>
        <h3 className="text-3xl font-display font-bold text-white">{value}</h3>
        {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg bg-black ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default Dashboard;