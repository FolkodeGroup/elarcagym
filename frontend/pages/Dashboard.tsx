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
  const [todayReservations, setTodayReservations] = useState<any[]>([]); // Incluye virtuales
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { setCanNavigate } = useNavigation();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const todayLocalStr = getLocalDateString();
      const [membersData, slotsData, reservationsData, salesData, todayReservationsData] = await Promise.all([
        MembersAPI.list(),
        SlotsAPI.list(),
        ReservationsAPI.list(),
        SalesAPI.list(),
        ReservationsAPI.getWithHabitual(todayLocalStr) // Cargar reservas del día con habituales
      ]);
      setMembers(membersData);
      setSlots(slotsData);
      setReservations(reservationsData);
      setSales(salesData);
      setTodayReservations(todayReservationsData.reservations || []);
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

    // const handleTestNotification = () => {
    //   showNativeNotification('¡Notificación nativa!', {
    //     body: 'Esto es una prueba de notificación nativa.',
    //     icon: '/public/favicon_io/favicon.ico',
    //   });
    // };

  // Usar lógica consistente con Members.tsx
  const activeMembers = members.filter(m => m.status === UserStatus.ACTIVE).length;
  const currentMembers = members.filter(m => m.status === UserStatus.ACTIVE && isCurrentOnPayment(m)).length;
  // Morosos = Activos - Al Día
  const debtors = activeMembers - currentMembers;

  // ...existing code...



  // Obtener turnos de hoy con reservaciones (incluyendo horarios habituales)
  const getTodaySlots = () => {
    const TIME_ZONE = 'America/Argentina/Buenos_Aires';
    const now = new Date();
    const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    const todayLocal = getLocalDateString(nowLocal);

    // Obtener slots únicos del día a partir de las reservas (manuales y virtuales)
    const uniqueTimes = new Set<string>();
    const slotMap = new Map<string, any>();
    
    todayReservations.forEach((r: any) => {
      const time = r.time || r.slot?.time;
      if (time) {
        uniqueTimes.add(time);
        if (!slotMap.has(time)) {
          slotMap.set(time, {
            id: r.isVirtual ? `virtual-${time}` : (r.slotId || `slot-${time}`),
            time,
            date: todayLocal,
            duration: 60,
            status: 'reserved',
            isVirtual: r.isVirtual || false
          });
        }
      }
    });
    
    // Convertir mapa a array y ordenar por hora
    const combined = Array.from(slotMap.values())
      .sort((a, b) => a.time.localeCompare(b.time))
      .filter(slot => {
        // Filtrar slots que aún no han vencido (dentro de 2 horas)
        const slotTime = slot.time.length === 5 ? `${slot.time}:00` : slot.time;
        const slotDateTime = new Date(`${todayLocal}T${slotTime}`);
        const slotDateTimeLocal = new Date(slotDateTime.toLocaleString('en-US', { timeZone: TIME_ZONE }));
        const diffMs = nowLocal.getTime() - slotDateTimeLocal.getTime();
        return diffMs <= 2 * 60 * 60 * 1000;
      });

    return combined;
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

  // Obtener ausencias SOLO del día de la fecha (incluye virtuales)
  const getRecentAbsences = () => {
    const TIME_ZONE = 'America/Argentina/Buenos_Aires';
    const now = new Date();
    const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: TIME_ZONE }));
    const todayLocalStr = getLocalDateString(nowLocal);

    return todayReservations.filter(r => {
      // Mostrar como ausente si NO tiene attended:true (incluye null, undefined, false)
      if (r.attended === true) return false;
      
      // Para reservas virtuales, usar el time directamente
      if (r.isVirtual && r.time) {
        const slotTime = r.time.length === 5 ? `${r.time}:00` : r.time;
        const slotDateTime = new Date(`${todayLocalStr}T${slotTime}`);
        const slotDateTimeLocal = new Date(slotDateTime.toLocaleString('en-US', { timeZone: TIME_ZONE }));
        const diffMs = nowLocal.getTime() - slotDateTimeLocal.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);
        return diffHrs > 2; // Más de 2 horas = ausente
      }
      
      // Para reservas manuales, usar el slot
      if (!r.slotId) return false;
      const slot = slots.find(s => s.id === r.slotId);
      if (!slot) return false;
      
      const slotDateLocal = new Date(
        new Date(slot.date).toLocaleString('en-US', { timeZone: TIME_ZONE })
      );
      const slotDateStr = slotDateLocal.toISOString().slice(0, 10);
      
      // Solo turnos del día local
      if (slotDateStr !== todayLocalStr) return false;
      
      const slotTime = slot.time.length === 5 ? `${slot.time}:00` : slot.time;
      const slotDateTime = new Date(`${slotDateStr}T${slotTime}`);
      const slotDateTimeLocal = new Date(
        slotDateTime.toLocaleString('en-US', { timeZone: TIME_ZONE })
      );
      const diffMs = nowLocal.getTime() - slotDateTimeLocal.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      
      return diffHrs > 2;
    }).sort((a, b) => {
      const timeA = a.time || a.slot?.time || '';
      const timeB = b.time || b.slot?.time || '';
      return timeB.localeCompare(timeA);
    });
  };

  // Estado local para ausencias mostradas
  const [ausenciasMostradas, setAusenciasMostradas] = useState<Reservation[]>([]);
  // Para resetear la lista al final del día
  useEffect(() => {
    const now = new Date();
    const resetHour = 23;
    const resetMinute = 0;
    const resetSecond = 0;
    const nextReset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resetHour, resetMinute, resetSecond, 0);
    if (now > nextReset) {
      // Si ya pasó la hora de reset, programar para el día siguiente
      nextReset.setDate(nextReset.getDate() + 1);
    }
    const timeout = setTimeout(() => {
      setAusenciasMostradas(getRecentAbsencesFiltered());
    }, nextReset.getTime() - now.getTime());
    return () => clearTimeout(timeout);
  }, [reservations, slots]);

  // Filtrar ausencias para no mostrar después de las 23hs
  const getRecentAbsencesFiltered = () => {
    const ausencias = getRecentAbsences();
    const now = new Date();
    if (now.getHours() >= 23) {
      return [];
    }
    return ausencias;
  };

  // Inicializar ausencias mostradas al cargar
  useEffect(() => {
    setAusenciasMostradas(getRecentAbsencesFiltered());
  }, [reservations, slots]);
  
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
              getTodaySlots().map(item => {
                const isVirtual = 'isVirtual' in item && item.isVirtual === true;
                const slotReservations = todayReservations.filter(r => {
                  const resTime = r.time || r.slot?.time;
                  return resTime === item.time;
                });
                  
                return (
                  <div 
                    key={item.id} 
                    className={`bg-black/40 p-3 rounded transition ${
                      isVirtual 
                        ? 'border border-purple-500/40 border-dashed hover:border-purple-400/60' 
                        : 'border border-brand-gold/30 hover:border-brand-gold/60'
                    }`}
                  >
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <Clock size={14} className={isVirtual ? 'text-purple-400' : 'text-brand-gold'} />
                      {item.time} 
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        isVirtual 
                          ? 'bg-purple-700/30 border border-purple-500/40 text-purple-300'
                          : 'bg-gray-700/50'
                      }`}>
                        {slotReservations.length} {slotReservations.length === 1 ? 'persona' : 'personas'}
                      </span>
                      {isVirtual && (
                        <span className="text-[9px] text-purple-400 italic">horario habitual</span>
                      )}
                    </p>
                    {!isVirtual && 'target' in item && item.target && <p className="text-xs text-gray-400 mt-0.5">📌 {item.target}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slotReservations.map(r => (
                        <span
                          key={r.id}
                          className={`text-xs px-2 py-1 rounded truncate max-w-32 border font-bold
                            ${r.attended === true
                              ? 'bg-green-500/30 text-green-700 border-green-400'
                              : r.isVirtual
                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                                : 'bg-brand-gold/20 text-brand-gold border-brand-gold/40'}
                          `}
                        >
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
              {ausenciasMostradas.length}
            </span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {ausenciasMostradas.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin ausencias registradas</p>
            ) : (
              ausenciasMostradas.map(r => {
                // Para virtuales, usar el time directamente; para manuales, buscar el slot
                const timeStr = r.time || (r.slot ? r.slot.time : '??:??');
                const dateStr = r.isVirtual ? getLocalDateString() : (
                  r.slot ? new Date(r.slot.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'N/A'
                );
                const socio = r.member || members.find(m => m.id === r.memberId);
                const phone = socio?.phone || '';
                
                return (
                  <div key={r.id} className="bg-black/40 p-3 rounded border border-red-700/50 hover:border-red-600 transition flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate">{r.clientName}</p>
                      <p className="text-xs text-gray-400">
                        📅 {dateStr} {' '} ⏰ {timeStr}
                        {r.isVirtual && <span className="ml-2 text-purple-400 italic text-[10px]">(horario habitual)</span>}
                      </p>
                      {phone && <p className="text-xs text-gray-500 mt-0.5">📱 {phone}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      {phone && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 transition"
                          title="Enviar mensaje por WhatsApp y eliminar"
                          onClick={async () => {
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
                            const slotInfo = `${dateStr} a las ${timeStr}`;
                            const message = `Hola ${memberName}, notamos que no pudiste asistir a ${slotInfo}. ¿Todo bien? ¿Te gustaría reagendar?`;
                            window.open(`https://wa.me/${wpp}?text=${encodeURIComponent(message)}`, '_blank');
                            
                            // Solo eliminar si es una reserva manual (no virtual)
                            if (!r.isVirtual) {
                              try {
                                await ReservationsAPI.delete(r.id);
                                setAusenciasMostradas(prev => prev.filter(a => a.id !== r.id));
                                setToast({ message: 'Ausencia eliminada correctamente', type: 'success' });
                              } catch (error) {
                                setToast({ message: 'Error al eliminar la ausencia', type: 'error' });
                              }
                            }
                          }}
                        >
                          💬 WhatsApp{!r.isVirtual && ' y eliminar'}
                        </button>
                      )}
                      {!r.isVirtual && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 transition"
                          title="Eliminar de la lista"
                          onClick={async () => {
                            try {
                              await ReservationsAPI.delete(r.id);
                              setAusenciasMostradas(prev => prev.filter(a => a.id !== r.id));
                              setToast({ message: 'Ausencia eliminada correctamente', type: 'success' });
                            } catch (error) {
                              setToast({ message: 'Error al eliminar la ausencia', type: 'error' });
                            }
                          }}
                        >
                          🗑 Eliminar
                        </button>
                      )}
                    </div>
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