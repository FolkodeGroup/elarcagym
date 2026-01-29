import React, { useEffect, useState } from 'react';
import { MembersAPI, RemindersAPI, SlotsAPI, ReservationsAPI, SalesAPI } from '../services/api';
import { Member, UserStatus, Reminder, Slot, Reservation, Sale } from '../types';
import { isCurrentOnPayment, isDebtorByPayment } from '../services/membershipUtils';
import { Users, AlertCircle, TrendingUp, DollarSign, Plus, Edit2, Trash2, CreditCard, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

interface DashboardProps {
  onNavigate: (page: string, filter?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showEditReminderModal, setShowEditReminderModal] = useState(false);
  const [showDeleteReminderConfirm, setShowDeleteReminderConfirm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderToDeleteId, setReminderToDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newReminderForm, setNewReminderForm] = useState({ text: '', date: '', priority: 'medium' as const });
  const [editReminderForm, setEditReminderForm] = useState({ text: '', date: '', priority: 'medium' as const });
  const { setCanNavigate } = useNavigation();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersData, remindersData, slotsData, reservationsData, salesData] = await Promise.all([
        MembersAPI.list(),
        RemindersAPI.list(),
        SlotsAPI.list(),
        ReservationsAPI.list(),
        SalesAPI.list()
      ]);
      setMembers(membersData);
      setReminders(remindersData);
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

  // Block navigation when there are unsaved changes
  useEffect(() => {
    setCanNavigate(!isDirty);
  }, [isDirty, setCanNavigate]);


  // Usar lógica consistente con Members.tsx
  const activeMembers = members.filter(m => m.status === UserStatus.ACTIVE).length;
  const debtors = members.filter(m => isDebtorByPayment(m)).length;
  const currentMembers = members.filter(m => isCurrentOnPayment(m)).length;

  // Obtener turnos de hoy con reservaciones
  const getTodaySlots = () => {
    const now = new Date();
    const todayLocal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    return slots
      .filter(s => {
        const slotDate = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
        return slotDate === todayLocal;
      })
      .filter(s => reservations.some(r => r.slotId === s.id))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  // Calcular ingresos de hoy
  const getTodayIncome = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const ventasHoy = sales.filter(venta => {
      const fechaVenta = new Date(venta.date).toISOString().split('T')[0];
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

  const handleAddReminder = async () => {
    if (!newReminderForm.text.trim() || !newReminderForm.date) {
      setToast({ message: 'Por favor completa todos los campos.', type: 'error' });
      return;
    }
    try {
      await RemindersAPI.create({
        text: newReminderForm.text,
        date: newReminderForm.date,
        priority: newReminderForm.priority
      });
      await loadData();
      setToast({ message: 'Recordatorio agregado.', type: 'success' });
      setShowAddReminderModal(false);
      setNewReminderForm({ text: '', date: '', priority: 'medium' });
      setIsDirty(false);
    } catch (error) {
      setToast({ message: 'Error al agregar recordatorio', type: 'error' });
    }
  };

  const handleEditReminder = async () => {
    if (!editingReminder || !editReminderForm.text.trim() || !editReminderForm.date) {
      setToast({ message: 'Por favor completa todos los campos.', type: 'error' });
      return;
    }
    try {
      await RemindersAPI.update(editingReminder.id, {
        text: editReminderForm.text,
        date: editReminderForm.date,
        priority: editReminderForm.priority
      });
      await loadData();
      setToast({ message: 'Recordatorio actualizado.', type: 'success' });
      setShowEditReminderModal(false);
      setEditingReminder(null);
      setIsDirty(false);
    } catch (error) {
      setToast({ message: 'Error al actualizar recordatorio', type: 'error' });
    }
  };

  const handleDeleteReminder = async () => {
    if (!reminderToDeleteId) return;
    try {
      await RemindersAPI.delete(reminderToDeleteId);
      await loadData();
      setToast({ message: 'Recordatorio eliminado.', type: 'info' });
      setShowDeleteReminderConfirm(false);
      setReminderToDeleteId(null);
      setIsDirty(false);
    } catch (error) {
      setToast({ message: 'Error al eliminar recordatorio', type: 'error' });
    }
  };

  const openEditReminderModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditReminderForm({ text: reminder.text, date: reminder.date, priority: reminder.priority });
    setShowEditReminderModal(true);
  };

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleNavigateToIngresos = () => {
    onNavigate('Ingresos');
  };

  const ausenciasRecientes = reservations.filter(r => r.attended === false && r.slotId && slots.find(s => s.id === r.slotId && new Date(s.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
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
                {/* Tarjeta de Ausencias Recientes */}
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-red-800">
                  <h3 className="text-lg font-display font-bold text-red-400 mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-400" /> Ausencias recientes
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {ausenciasRecientes.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">Sin ausencias registradas</p>
                    ) : (
                      ausenciasRecientes.map(r => {
                        const slot = slots.find(s => s.id === r.slotId);
                        // Buscar el número actualizado del socio
                        const socio = members.find(m => m.id === r.memberId);
                        const phone = socio?.phone || r.clientPhone || '';
                        return (
                          <div key={r.id} className="bg-black/40 p-2 rounded border border-red-700 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs text-white font-bold">{r.clientName}</p>
                              <p className="text-xs text-gray-400">{slot ? `${slot.date} ${slot.time}` : ''}</p>
                              {phone && <p className="text-xs text-gray-500">{phone}</p>}
                            </div>
                            <button
                              className="p-1 rounded bg-brand-gold text-black hover:bg-yellow-500 text-xs font-bold"
                              title="Notificar socio"
                              onClick={() => {
                                // Normalizar número para WhatsApp
                                let wpp = phone.replace(/\D/g, '');
                                if (wpp.startsWith('549')) {
                                  // OK
                                } else if (wpp.startsWith('54')) {
                                  wpp = '549' + wpp.substring(2);
                                } else if (wpp.startsWith('0')) {
                                  wpp = '549' + wpp.substring(1);
                                } else {
                                  wpp = '549' + wpp;
                                }
                                window.open(`https://wa.me/${wpp}`, '_blank');
                              }}
                            >
                              Notificar
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
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
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {getTodaySlots().length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin turnos hoy</p>
            ) : (
              getTodaySlots().map(slot => {
                const slotReservations = reservations.filter(r => r.slotId === slot.id);
                return (
                  <div key={slot.id} className="bg-black/40 p-2 rounded border border-brand-gold/30 hover:border-brand-gold/60 transition">
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <Clock size={14} className="text-brand-gold" />
                      {slot.time} 
                      <span className="text-xs bg-gray-700/50 px-2 py-0.5 rounded">
                        {slotReservations.length}
                      </span>
                    </p>
                    {slot.target && <p className="text-xs text-gray-400 mt-0.5">📌 {slot.target}</p>}
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {slotReservations.slice(0, 2).map(r => (
                        <span key={r.id} className="text-xs bg-brand-gold/20 border border-brand-gold/40 px-1.5 py-0.5 rounded text-brand-gold truncate max-w-24">
                          {r.clientName}
                        </span>
                      ))}
                      {slotReservations.length > 2 && (
                        <span className="text-xs bg-gray-700/40 px-1.5 py-0.5 rounded text-gray-400">
                          +{slotReservations.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions / Reminders */}
        <div className="lg:col-span-2 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-display font-bold text-white">Recordatorios</h3>
            <button 
              onClick={() => {
                setShowAddReminderModal(true);
                setNewReminderForm({ text: '', date: '', priority: 'medium' });
                setIsDirty(false);
              }}
              className="p-1 rounded bg-brand-gold text-black hover:bg-yellow-500"
              title="Agregar recordatorio"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Sin recordatorios</p>
            ) : (
              reminders.map(reminder => (
                <div key={reminder.id} className="bg-black/40 p-2 rounded border border-gray-700 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-1 items-start">
                      <span>{priorityIcon(reminder.priority)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{reminder.text}</p>
                        <p className="text-gray-500 text-xs">{new Date(reminder.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditReminderModal(reminder)}
                      className="p-1 rounded bg-gray-700 hover:bg-gray-600"
                      title="Editar"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setReminderToDeleteId(reminder.id);
                        setShowDeleteReminderConfirm(true);
                      }}
                      className="p-1 rounded bg-gray-700 hover:bg-gray-600"
                      title="Borrar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
            setShowAddReminderModal(false);
            setIsDirty(false);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
            <h4 className="text-lg font-bold text-white mb-4">Nuevo Recordatorio</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Texto</label>
                <textarea
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white text-sm"
                  placeholder="Descripción del recordatorio"
                  value={newReminderForm.text}
                  onChange={e => {
                    setNewReminderForm({ ...newReminderForm, text: e.target.value });
                    setIsDirty(true);
                  }}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white text-sm"
                  value={newReminderForm.date}
                  onChange={e => {
                    setNewReminderForm({ ...newReminderForm, date: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Prioridad</label>
                <select
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white text-sm"
                  value={newReminderForm.priority}
                  onChange={e => {
                    setNewReminderForm({ ...newReminderForm, priority: e.target.value as any });
                    setIsDirty(true);
                  }}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-700 text-sm"
                  onClick={() => {
                    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
                    setShowAddReminderModal(false);
                    setIsDirty(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold text-sm"
                  onClick={() => {
                    handleAddReminder();
                    setIsDirty(false);
                  }}
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {showEditReminderModal && editingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
            setShowEditReminderModal(false);
            setIsDirty(false);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
            <h4 className="text-lg font-bold text-white mb-4">Editar Recordatorio</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Texto</label>
                <textarea
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white text-sm"
                  placeholder="Descripción del recordatorio"
                  value={editReminderForm.text}
                  onChange={e => {
                    setEditReminderForm({ ...editReminderForm, text: e.target.value });
                    setIsDirty(true);
                  }}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white text-sm"
                  value={editReminderForm.date}
                  onChange={e => {
                    setEditReminderForm({ ...editReminderForm, date: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Prioridad</label>
                <select
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white text-sm"
                  value={editReminderForm.priority}
                  onChange={e => {
                    setEditReminderForm({ ...editReminderForm, priority: e.target.value as any });
                    setIsDirty(true);
                  }}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-700 text-sm"
                  onClick={() => {
                    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
                    setShowEditReminderModal(false);
                    setIsDirty(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold text-sm"
                  onClick={() => {
                    handleEditReminder();
                    setIsDirty(false);
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteReminderConfirm && reminderToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteReminderConfirm(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-sm">
            <h4 className="text-lg font-bold text-white mb-4">Confirmar borrado</h4>
            <p className="text-gray-400 mb-4">¿Deseas borrar este recordatorio?</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-700 text-sm"
                onClick={() => setShowDeleteReminderConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded bg-red-700 text-white font-bold text-sm"
                onClick={handleDeleteReminder}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

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