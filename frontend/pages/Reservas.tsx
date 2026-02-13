import React, { useEffect, useState, useMemo } from 'react';
import { SlotsAPI, ReservationsAPI, MembersAPI } from '../services/api';
import { Slot, Reservation, Member, UserStatus, ReservationsWithHabitualResponse } from '../types';
import { 
  Plus, Edit2, Trash2, Clock, Search, X, Users, 
  UserPlus, UserCheck, StickyNote, FileText, UserX, ChevronLeft, ChevronRight, AlignLeft, Timer, Info
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Reservas: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getLocalDateString = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  
  // Modales
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estado del Formulario Unificado
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({
    time: '',
    duration: 60,
    notes: '',
    selectedMembers: [] as Member[]
  });

  const [searchMember, setSearchMember] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editFormData, setEditFormData] = useState({ clientName: '', notes: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const { setCanNavigate } = useNavigation();
  // Mostrar desde las 07:00 hasta las 23:00 inclusive
  const hours = Array.from({ length: 17 }, (_, i) => i + 7);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [slotsData, membersData] = await Promise.all([
        SlotsAPI.list(),
        MembersAPI.list()
      ]);
      setSlots(slotsData);
      setAllMembers(membersData);
      
      // Cargar las reservas con horarios habituales para la fecha seleccionada
      await loadReservationsForDate(selectedDate);
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Error al cargar datos', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Función separada para cargar reservas de una fecha específica
  const loadReservationsForDate = async (date: string) => {
    try {
      const response = await ReservationsAPI.getWithHabitual(date);
      setReservations(response.reservations);
    } catch (error) {
      console.error('Error loading reservations for date:', error);
      setToast({ message: 'Error al cargar reservas', type: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recargar reservas cuando cambia la fecha
  useEffect(() => {
    if (!isLoading) {
      loadReservationsForDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    setCanNavigate(!showQuickAdd);
  }, [showQuickAdd, setCanNavigate]);

  // --- LÓGICA DE TURNOS Y CUPOS ---

  const handleSlotClick = (hour: number, existingSlot?: Slot) => {
    const timeLabel = existingSlot ? existingSlot.time : `${hour.toString().padStart(2, '0')}:00`;
    
    let currentMembers: Member[] = [];
    if (existingSlot) {
        const resIds = reservations.filter(r => r.slotId === existingSlot.id).map(r => r.memberId);
        currentMembers = allMembers.filter(m => resIds.includes(m.id));
    }

    setActiveSlotId(existingSlot ? existingSlot.id : null);
    setQuickAddForm({
      time: timeLabel,
      duration: existingSlot ? existingSlot.duration : 60,
      notes: '',
      selectedMembers: currentMembers
    });
    setSearchMember('');
    setShowQuickAdd(true);
  };

  const handleSaveQuickAdd = async () => {
    if (quickAddForm.selectedMembers.length === 0) {
        setToast({ message: "No hay socios seleccionados", type: 'error' });
        return;
    }

    try {
      let targetSlotId = activeSlotId;

      if (!targetSlotId) {
          const newSlot = await SlotsAPI.create({
              date: selectedDate,
              time: quickAddForm.time,
              duration: quickAddForm.duration,
              status: 'available'
          });
          targetSlotId = newSlot.id;
      }

    const currentRes = reservations.filter(r => r.slotId === targetSlotId);
    const currentMemberIds = currentRes.map(r => r.memberId);

    // IDs de los socios que vamos a procesar
    const selectedIds = quickAddForm.selectedMembers.map(m => m.id);

    // Crear reservaciones para cada miembro
    let newReservationsCount = 0;
    for (const member of quickAddForm.selectedMembers) {
      if (!currentMemberIds.includes(member.id)) {
          await ReservationsAPI.create({
            slotId: targetSlotId!,
            memberId: member.id,
            clientName: `${member.firstName} ${member.lastName}`,
            notes: quickAddForm.notes
          });
          newReservationsCount++;
      }
    }

    await SlotsAPI.update(targetSlotId!, { status: 'reserved' });

    // Recargar datos para actualizar la grilla
    await loadData();
    
    // Cerrar modal y mostrar notificación de éxito
    setShowQuickAdd(false);
    
    const memberNames = quickAddForm.selectedMembers.map(m => m.firstName).join(', ');
    const successMessage = newReservationsCount === 1 
      ? `Reserva creada exitosamente para ${memberNames}` 
      : `${newReservationsCount} reservas creadas exitosamente`;
    
    setToast({ message: successMessage, type: 'success' });
    } catch (error) {
      console.error('Error saving reservation:', error);
      setToast({ message: "Error al guardar reservación", type: 'error' });
    }
  };

  const handleDeleteFullSlot = async () => {
      if (activeSlotId) {
        try {
          await SlotsAPI.delete(activeSlotId);
          await loadData();
          setShowQuickAdd(false);
          setToast({ message: "Franja eliminada", type: 'info' });
        } catch (error) {
          setToast({ message: "Error al eliminar franja", type: 'error' });
        }
      }
  };

  const confirmDeleteReservation = async () => {
    if (selectedReservation) {
      try {
        await ReservationsAPI.delete(selectedReservation.id);
        await loadData();
        setShowDeleteConfirm(false);
        setSelectedReservation(null);
        setToast({ message: "Socio quitado del turno", type: 'info' });
      } catch (error) {
        setToast({ message: "Error al eliminar reservación", type: 'error' });
      }
    }
  };

  const toggleMemberSelection = (member: Member) => {
    const exists = quickAddForm.selectedMembers.find(m => m.id === member.id);
    if (exists) {
      setQuickAddForm({
        ...quickAddForm,
        selectedMembers: quickAddForm.selectedMembers.filter(m => m.id !== member.id)
      });
    } else {
      setQuickAddForm({
        ...quickAddForm,
        selectedMembers: [...quickAddForm.selectedMembers, member]
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingReservation) return;
    try {
      await ReservationsAPI.update(editingReservation.id, {
        clientName: editFormData.clientName,
        notes: editFormData.notes
      });
      await loadData();
      setShowEditModal(false);
    } catch (error) {
      setToast({ message: "Error al guardar cambios", type: 'error' });
    }
  };

  // --- FILTROS ---
  const filteredSearchMembers = useMemo(() => {
    if (!searchMember.trim()) return [];
    const selectedIds = quickAddForm.selectedMembers.map(m => m.id);
    
    // Obtener IDs de socios que ya tienen reserva para el día seleccionado
    const todaySlotsIds = slots
      .filter(s => {
        const slotDate = typeof s.date === 'string' ? s.date.split('T')[0] : getLocalDateString(new Date(s.date));
        return slotDate === selectedDate;
      })
      .map(s => s.id);
    
    const reservedMemberIds = reservations
      .filter(r => todaySlotsIds.includes(r.slotId))
      .map(r => r.memberId);
    
    return allMembers
      .filter(m => 
        m.status === UserStatus.ACTIVE && 
        !selectedIds.includes(m.id) && 
        !reservedMemberIds.includes(m.id) && 
        (`${m.firstName ?? ''} ${m.lastName ?? ''}`.toLowerCase().includes(searchMember?.toLowerCase() ?? ''))
      )
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
      .slice(0, 8);
  }, [allMembers, searchMember, quickAddForm.selectedMembers, slots, reservations, selectedDate]);

  const dateSlots = slots.filter(s => {
    const slotDate = typeof s.date === 'string' ? s.date.split('T')[0] : getLocalDateString(new Date(s.date));
    return slotDate === selectedDate;
  });

  // Agrupar reservas por hora considerando tanto slots como reservas virtuales
  const getReservationsForHour = (hour: number): Reservation[] => {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    
    // Reservas manuales (con slot)
    const slot = dateSlots.find(s => s.time === timeLabel);
    const slotReservations = slot ? reservations.filter(r => r.slotId === slot.id && !r.isVirtual) : [];
    
    // Reservas virtuales (horarios habituales)
    const virtualReservations = reservations.filter(r => r.isVirtual && r.time === timeLabel);
    
    return [...slotReservations, ...virtualReservations];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-[#1a1a1a] p-4 border border-gray-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-display font-bold text-white">Agenda Personalizada</h2>
          <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-lg p-1">
            <button onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() - 1);
                setSelectedDate(getLocalDateString(d));
            }} className="p-1 hover:text-brand-gold"><ChevronLeft/></button>
            <span className="text-sm font-bold w-24 text-center text-gray-300 uppercase">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </span>
            <button onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() + 1);
                setSelectedDate(getLocalDateString(d));
            }} className="p-1 hover:text-brand-gold"><ChevronRight/></button>
          </div>
        </div>
        
        {/* Tooltip explicativo */}
        <div className="flex items-center gap-2 bg-black/50 border border-gray-700 rounded-lg px-4 py-2">
          <Info size={16} className="text-brand-gold" />
          <span className="text-xs text-gray-400">
            <span className="text-brand-gold font-bold">Borde sólido:</span> Reserva manual • 
            <span className="text-purple-400 font-bold ml-2">Borde punteado:</span> Horario habitual
          </span>
        </div>
      </div>

      {/* GRILLA */}
      <div className="flex-1 overflow-y-auto bg-[#111] border border-gray-800 rounded-xl custom-scrollbar relative">
        {hours.map(hour => {
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            const slot = dateSlots.find(s => s.time === timeLabel);
            const allReservationsForHour = getReservationsForHour(hour);

            return (
                <div key={hour} className="flex border-b border-gray-800/50 min-h-[120px] group relative">
                    <div className="w-20 flex justify-center py-4 text-xs font-mono text-gray-600 bg-[#151515] border-r border-gray-800">
                        {timeLabel}
                    </div>
                    <div 
                        className="flex-1 p-2 cursor-pointer hover:bg-white/[0.01] transition-colors"
                        onClick={() => handleSlotClick(hour, slot)}
                    >
                        {allReservationsForHour.length > 0 ? (
                          <div className="h-full relative">
                            
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSlotClick(hour, slot); }}
                                className="p-1.5 bg-brand-gold text-black rounded-md hover:scale-110 transition shadow-lg shadow-brand-gold/20"
                              >
                                <UserPlus size={14}/>
                              </button>
                            </div>
                                <div className="flex flex-wrap gap-2">
                                    {allReservationsForHour.map(res => {
                                        // Determinar si es virtual o manual
                                        const isVirtual = res.isVirtual === true;
                                        
                                        // Calcular el estado del turno y si se puede cambiar asistencia
                                        const slotInfo = isVirtual 
                                          ? { date: selectedDate, time: res.time || timeLabel }
                                          : (slot || { date: selectedDate, time: timeLabel });
                                        const slotDateStr = typeof slotInfo.date === 'string' 
                                          ? slotInfo.date.split('T')[0] 
                                          : getLocalDateString(new Date(slotInfo.date));
                                        const slotDateTime = new Date(`${slotDateStr}T${slotInfo.time}`);
                                        const now = new Date();
                                        const diffMs = now.getTime() - slotDateTime.getTime();
                                        const diffHrs = diffMs / (1000 * 60 * 60);
                                        
                                        // Estados posibles
                                        const isExpired = diffHrs > 2; // Más de 2 horas desde el turno
                                        const hasStarted = diffMs >= 0; // El turno ya empezó
                                        const canChangeAttendance = hasStarted && !isExpired && !isVirtual; // Virtual no se puede marcar
                                        
                                        // Determinar color y tooltip
                                        let containerClass = isVirtual 
                                          ? 'bg-purple-900/30 border-purple-500 border-dashed' 
                                          : 'bg-black/60 border-gray-800';
                                        let nameClass = 'text-gray-200';
                                        let tooltip = isVirtual ? 'Horario habitual' : 'Turno pendiente';
                                        
                                        if (res.attended === true) {
                                          // Asistió - verde
                                          containerClass = 'bg-green-900/40 border-green-700';
                                          nameClass = 'text-green-400 font-bold';
                                          tooltip = 'Asistencia registrada ✓';
                                        } else if (res.attended === false) {
                                          // Marcado como no asistió
                                          containerClass = 'bg-red-900/40 border-red-700';
                                          nameClass = 'text-red-400 line-through opacity-60';
                                          tooltip = 'No asistió';
                                        } else if (isExpired && !isVirtual) {
                                          // Expiró sin registrar asistencia (solo para manuales)
                                          containerClass = 'bg-red-900/20 border-red-800/50';
                                          nameClass = 'text-red-500 font-bold';
                                          tooltip = 'Ausente: no registró asistencia en las 2 horas';
                                        }
                                        
                                        return (
                                        <div key={res.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg group/item border ${containerClass}`}>
                                          <span
                                            className={`text-xs px-2 py-1 rounded-full ${nameClass}`}
                                            title={tooltip}
                                          >
                                            {res.clientName}
                                            {isVirtual && <span className="ml-1 text-[9px] opacity-60">⚡</span>}
                                          </span>
                                            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                {!isVirtual && (
                                                  <>
                                                    <button 
                                                      title="Editar notas/seguimiento"
                                                      onClick={(e) => { e.stopPropagation(); setEditingReservation(res); setEditFormData({clientName: res.clientName, notes: res.notes || ''}); setShowEditModal(true); }} 
                                                      className="text-gray-500 hover:text-brand-gold">
                                                      <StickyNote size={12}/>
                                                    </button>
                                                    {(canChangeAttendance && res.attended !== true) ? (
                                                      <button 
                                                        title={res.attended === true ? 'Marcar como no asistió' : 'Marcar como asistió'}
                                                        onClick={async (e) => { 
                                                          e.stopPropagation(); 
                                                          try {
                                                            await ReservationsAPI.update(res.id, { attended: res.attended === true ? false : true }); 
                                                            await loadReservationsForDate(selectedDate); 
                                                          } catch (err: any) {
                                                            setToast({ message: err.message || 'Error al cambiar asistencia', type: 'error' });
                                                          }
                                                        }} 
                                                        className={res.attended === true ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'}>
                                                        {res.attended === true ? <UserX size={12}/> : <UserCheck size={12}/>} 
                                                      </button>
                                                    ) : (
                                                      <button 
                                                        title={
                                                          res.attended === true
                                                            ? 'Ya asistió, no se puede marcar como ausente'
                                                            : (isExpired ? 'No se puede cambiar (más de 2 horas)' : 'El turno aún no comenzó')
                                                        }
                                                        className="text-gray-600 cursor-not-allowed opacity-50"
                                                        disabled>
                                                        <UserX size={12}/>
                                                      </button>
                                                    )}
                                                    <button 
                                                      title="Quitar socio del turno"
                                                      onClick={(e) => { e.stopPropagation(); setSelectedReservation(res); setShowDeleteConfirm(true); }} 
                                                      className="text-red-500">
                                                      <X size={12}/>
                                                    </button>
                                                  </>
                                                )}
                                                {isVirtual && (
                                                  <span className="text-[9px] text-purple-400 italic">
                                                    horario habitual
                                                  </span>
                                                )}
                                            </div>
                                        </div>
                                      );
                                    })}
                                </div>
                            </div>
                        ) : (
                          <div className="h-full relative">
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <button onClick={(e) => { e.stopPropagation(); handleSlotClick(hour, undefined); }} className="p-1.5 bg-brand-gold text-black rounded-md hover:scale-110 transition shadow-lg shadow-brand-gold/20">
                                <UserPlus size={14}/>
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      {/* MODAL: ADMINISTRAR CUPO */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          {/* Overlay detrás del modal */}
          <div className="absolute inset-0 z-0" onClick={() => setShowQuickAdd(false)} />
          {/* Modal principal delante */}
          <div className="bg-[#0f0f0f] w-full max-w-lg rounded-2xl border border-gray-800 shadow-2xl overflow-hidden z-10" onClick={e => e.stopPropagation()}>
            <div className="h-1.5 bg-brand-gold w-full"></div>
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 relative text-white">
                        <div className="flex items-center gap-3 border-b border-gray-800 focus-within:border-brand-gold pb-2 transition-all">
                            <Search className="text-gray-500" size={24}/>
                            <input 
                                type="text" 
                                placeholder="Buscar socio..." 
                                className="bg-transparent text-xl font-bold text-white outline-none w-full"
                                value={searchMember}
                                onChange={(e) => setSearchMember(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {filteredSearchMembers.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-[#1a1a1a] border border-gray-800 rounded-xl mt-2 z-50 shadow-2xl overflow-hidden">
                                {filteredSearchMembers.map(m => (
                                    <button key={m.id} onClick={() => { toggleMemberSelection(m); setSearchMember(''); }} className="w-full text-left p-4 hover:bg-brand-gold hover:text-black transition text-sm font-bold flex justify-between items-center border-b border-gray-800 last:border-0">
                                        <span>{m.firstName} {m.lastName}</span>
                                        <Plus size={16}/>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setShowQuickAdd(false)} className="text-gray-500 hover:text-white ml-4"><X/></button>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                        {quickAddForm.selectedMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-2 bg-brand-gold text-black px-4 py-1.5 rounded-full text-xs font-black shadow-lg">
                                {m.firstName} {m.lastName}
                                <button onClick={() => toggleMemberSelection(m)} className="hover:scale-125 transition"><X size={14}/></button>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Horario</span>
                            <div className="flex items-center gap-2 text-white">
                                <Clock size={16} className="text-brand-gold"/>
                                <span className="font-bold">{quickAddForm.time}</span>
                            </div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Duración</span>
                            <div className="flex items-center gap-2 text-white">
                                <Timer size={16} className="text-brand-gold"/>
                                <select className="bg-transparent font-bold outline-none text-sm cursor-pointer text-white w-full" value={quickAddForm.duration} onChange={(e) => setQuickAddForm({...quickAddForm, duration: Number(e.target.value)})}>
                                    <option value={30} className="bg-gray-900">30 min</option>
                                    <option value={45} className="bg-gray-900">45 min</option>
                                    <option value={60} className="bg-gray-900">1 hora</option>
                                    <option value={90} className="bg-gray-900">1.5 h</option>
                                    <option value={120} className="bg-gray-900">2 horas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4">
                        <textarea placeholder="Notas generales de la clase (opcional)..." className="bg-transparent w-full text-sm text-white outline-none resize-none" rows={3} value={quickAddForm.notes} onChange={(e) => setQuickAddForm({...quickAddForm, notes: e.target.value})} />
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                    {activeSlotId ? (
                        <button onClick={handleDeleteFullSlot} className="flex items-center gap-2 text-red-500 text-xs font-bold hover:underline"><Trash2 size={14}/> Eliminar turno completo</button>
                    ) : <div></div>}
                    <div className="flex gap-3">
                        <button onClick={() => setShowQuickAdd(false)} className="px-6 py-2 text-sm font-bold text-gray-500">Cancelar</button>
                        <button onClick={handleSaveQuickAdd} className="px-10 py-3 bg-brand-gold text-black rounded-xl text-sm font-black hover:bg-yellow-500 transition">GUARDAR</button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALES DE SOPORTE */}
      {showEditModal && editingReservation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-white">
          <div className="absolute inset-0" onClick={() => setShowEditModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-bold mb-6">Seguimiento de {editFormData.clientName}</h4>
            <textarea className="w-full bg-black border border-gray-700 p-4 rounded-xl text-white outline-none focus:border-brand-gold mb-4" rows={5} value={editFormData.notes} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} />
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl bg-gray-800" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="flex-1 py-3 rounded-xl bg-brand-gold text-black font-bold" onClick={handleSaveEdit}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
          <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)} />
            <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 text-white max-w-xs text-center z-10" onClick={e => e.stopPropagation()}>
            <p className="mb-6 font-bold text-sm">¿Quitar a {selectedReservation?.clientName} de este turno?</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 rounded-xl bg-gray-800 text-xs font-bold cursor-pointer" onClick={() => setShowDeleteConfirm(false)}>No</button>
              <button className="flex-1 py-2 rounded-xl bg-red-600 text-xs font-bold cursor-pointer" onClick={confirmDeleteReservation}>Sí, quitar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Reservas;