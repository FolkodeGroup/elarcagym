import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { Slot, Reservation, Member, UserStatus } from '../types';
import { 
  Plus, Edit2, Trash2, Clock, Search, X, Users, 
  UserPlus, ListOrdered, UserCheck, StickyNote, FileText, UserX 
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Reservas: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [waitingList, setWaitingList] = useState<Member[]>([]);

  const getLocalDateString = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [isDirty, setIsDirty] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [showWaitingListModal, setShowWaitingListModal] = useState(false);
  const [searchWaitingMember, setSearchWaitingMember] = useState('');
  const [showAssignMemberModal, setShowAssignMemberModal] = useState(false);
  const [searchMemberForSlot, setSearchMemberForSlot] = useState('');
  const [slotToAssign, setSlotToAssign] = useState<Slot | null>(null);

  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { setCanNavigate } = useNavigation();

  const [newSlotForm, setNewSlotForm] = useState({
    date: selectedDate, time: '08:00', duration: 60, color: '#D4AF37', target: ''
  });

  const [editFormData, setEditFormData] = useState({
    clientName: '', notes: ''
  });

  useEffect(() => {
    loadData();
    const savedWaiting = localStorage.getItem(`waiting_list_${selectedDate}`);
    if (savedWaiting) {
      setWaitingList(JSON.parse(savedWaiting));
    } else {
      setWaitingList([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    setCanNavigate(!isDirty);
  }, [isDirty, setCanNavigate]);

  const loadData = () => {
    setSlots(db.getSlots());
    setReservations(db.getReservations());
    setAllMembers(db.getMembers());
  };

  // --- LÓGICA DE FILTRADO Y BÚSQUEDA (MEJORADA) ---

  // 1. Buscador para la Lista de Espera (Excluye a los que ya tienen turno hoy)
  const sortedMembersForWaiting = useMemo(() => {
    // Obtenemos los IDs de los socios que ya tienen un lugar en la grilla para la fecha seleccionada
    const bookedMemberIds = reservations
      .filter(r => {
        const slot = slots.find(s => s.id === r.slotId);
        return slot?.date === selectedDate;
      })
      .map(r => r.memberId);

    return allMembers
      .filter(m => m.status === UserStatus.ACTIVE)
      .filter(m => !bookedMemberIds.includes(m.id)) // <--- FILTRO: Si ya tiene turno, no aparece aquí
      .filter(m => {
        const query = searchWaitingMember.toLowerCase().trim();
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        return fullName.includes(query) || (m.dni && m.dni.includes(query));
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [allMembers, searchWaitingMember, reservations, slots, selectedDate]);

  // 2. Buscador para asignar directamente a un turno
  const filteredMembersForSlot = useMemo(() => {
    const query = searchMemberForSlot.toLowerCase().trim();
    if (!query) return [];
    return allMembers
      .filter(m => m.status === UserStatus.ACTIVE)
      .filter(m => {
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        return fullName.includes(query) || (m.dni && m.dni.includes(query));
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [allMembers, searchMemberForSlot]);

  // --- FUNCIONES ---

  const saveWaitingList = (newList: Member[]) => {
    setWaitingList(newList);
    localStorage.setItem(`waiting_list_${selectedDate}`, JSON.stringify(newList));
  };

  const addToWaitingList = (member: Member) => {
    if (waitingList.find(m => m.id === member.id)) {
      setToast({ message: `${member.firstName} ya está en la lista.`, type: 'error' });
      return;
    }
    const newList = [...waitingList, member];
    saveWaitingList(newList);
    setToast({ message: `${member.firstName} agregado a la espera.`, type: 'success' });
    setShowWaitingListModal(false);
    setSearchWaitingMember('');
  };

  const removeFromWaitingList = (memberId: string) => {
    const newList = waitingList.filter(m => m.id !== memberId);
    saveWaitingList(newList);
  };

  const selectMemberForSlot = (member: Member) => {
    if (!slotToAssign) return;
    const result = db.addReservation({
      slotId: slotToAssign.id,
      memberId: member.id,
      clientName: member.firstName + ' ' + member.lastName,
      notes: ''
    });
    if (result) {
      loadData();
      removeFromWaitingList(member.id); // Lo quita de espera si estaba ahí
      setToast({ message: `Socio asignado correctamente.`, type: 'success' });
      setShowAssignMemberModal(false);
      setSearchMemberForSlot('');
    }
  };

  const handleMarkAbsence = (reservation: Reservation) => {
    const newState = reservation.attended === false ? true : false;
    db.updateReservationAttendance(reservation.id, newState);
    loadData();
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedReservation) {
      db.deleteReservation(selectedReservation.id);
      loadData();
      setShowDeleteConfirm(false);
      setSelectedReservation(null);
    }
  };

  const handleEditReservation = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setEditFormData({
      clientName: reservation.clientName,
      notes: reservation.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingReservation) return;
    db.updateReservation(editingReservation.id, {
      clientName: editFormData.clientName,
      notes: editFormData.notes
    });
    loadData();
    setShowEditModal(false);
    setIsDirty(false);
  };

  const handleReserveSlot = (slot: Slot) => {
    setSlotToAssign(slot);
    setSearchMemberForSlot('');
    setShowAssignMemberModal(true);
  };

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    db.addSlot({ ...newSlotForm, status: 'available' });
    loadData();
    setShowNewSlotModal(false);
  };

  const dateSlots = slots.filter((s) => s.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 text-brand-gold uppercase tracking-tighter">Reservas</h2>
          <p className="text-gray-400 text-sm">Control de asistencia y seguimiento diario</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-black border border-gray-700 text-white rounded px-4 py-2 outline-none focus:border-brand-gold" />
          <button onClick={() => setShowNewSlotModal(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-gray-700 hover:bg-gray-700 transition"><Plus size={18} /> Franja</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: Grilla Horaria */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-widest text-sm border-b border-gray-800 pb-4">
              <Clock size={18} className="text-brand-gold" /> Cronograma de Hoy
            </h3>
            <div className="space-y-2">
              {Array.from({ length: 15 }, (_, i) => 7 + i).map((hour) => {
                const hourStr = hour.toString().padStart(2, '0') + ':00';
                const slot = dateSlots.find((s) => s.time === hourStr);
                const slotRes = slot ? reservations.filter(r => r.slotId === slot.id) : [];

                return (
                  <div key={hourStr} className="grid grid-cols-12 items-start border-b border-gray-800/50 py-2">
                    <div className="col-span-2 font-mono text-gray-500 text-sm pt-2">{hourStr}</div>
                    <div className="col-span-10">
                      {slot ? (
                        <div onClick={() => handleReserveSlot(slot)} className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${slotRes.length >= 10 ? 'bg-red-900/10 border-red-900/40' : slotRes.length > 0 ? 'bg-blue-900/10 border-blue-900/40' : 'bg-green-900/5 border-green-900/20 hover:border-green-500'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-white text-lg">{slot.time}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${slotRes.length >= 10 ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                              {slotRes.length}/10 SOCIOS
                            </span>
                            {slot.target && <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">| {slot.target}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {slotRes.map(r => (
                              <div key={r.id} className="flex flex-col bg-black/40 p-2 rounded-lg border border-gray-800 min-w-[150px]">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className={`font-bold text-[11px] truncate ${r.attended === false ? 'text-red-500 line-through opacity-50' : 'text-white'}`}>
                                    {r.clientName}
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditReservation(r); }} title="Seguimiento" className="text-brand-gold hover:text-white"><Edit2 size={12}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleMarkAbsence(r); }} title="Asistencia" className={`p-0.5 rounded ${r.attended === false ? 'text-green-500' : 'text-yellow-500'}`}><UserX size={12}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteReservation(r); }} className="text-red-500"><X size={12}/></button>
                                  </div>
                                </div>
                                {r.notes && (
                                  <div className="flex items-start gap-1 mt-1 pt-1 border-t border-gray-800">
                                    <StickyNote size={10} className="text-brand-gold mt-0.5 flex-shrink-0" />
                                    <p className="text-[9px] text-gray-500 italic leading-tight line-clamp-1">{r.notes}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <div className="h-10 flex items-center text-gray-800 italic text-xs">Turno no habilitado</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Lista de Espera */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 sticky top-24 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-tighter">
                <ListOrdered size={20} className="text-brand-gold" /> Lista de Espera
              </h3>
              <button onClick={() => setShowWaitingListModal(true)} className="p-2 bg-brand-gold text-black rounded-full hover:bg-yellow-500 transition shadow-lg shadow-brand-gold/20"><Plus size={18} /></button>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
              {waitingList.map(member => (
                <div key={member.id} className="bg-black/40 p-4 rounded-xl border border-gray-800 group hover:border-brand-gold/30 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{member.firstName} {member.lastName}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{member.phone || 'Sin contacto'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSearchMemberForSlot(member.firstName); setToast({ message: "Asigna un horario disponible.", type: "info" }); }} className="p-2 bg-gray-800 text-brand-gold rounded-lg hover:bg-brand-gold hover:text-black transition" title="Mover a Turno"><UserPlus size={16} /></button>
                      <button onClick={() => removeFromWaitingList(member.id)} className="p-2 bg-gray-800 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {waitingList.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl">
                  <Users size={30} className="mx-auto text-gray-800 mb-2 opacity-50" />
                  <p className="text-gray-600 text-xs italic font-medium">Nadie en espera para hoy.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: SEGUIMIENTO / NOTAS */}
      {showEditModal && editingReservation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-brand-gold" /> Control de Sesión</h4>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <div className="bg-black/50 p-3 rounded-xl border border-gray-800 text-white font-bold">{editFormData.clientName}</div>
              <textarea placeholder="Descripción del entrenamiento o progresos..." className="w-full bg-black border border-gray-700 p-4 rounded-xl text-white outline-none focus:border-brand-gold custom-scrollbar" rows={5} value={editFormData.notes} onChange={e => {setEditFormData({...editFormData, notes: e.target.value}); setIsDirty(true);}} />
              <div className="flex gap-3">
                <button className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button className="flex-1 py-3 rounded-xl bg-brand-gold text-black font-bold hover:bg-yellow-500" onClick={handleSaveEdit}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANOTAR EN ESPERA (CON FILTRO DE EXCLUSIÓN) */}
      {showWaitingListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWaitingListModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold text-white">Anotar en Espera</h4>
              <button onClick={() => setShowWaitingListModal(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 text-gray-500" size={20} />
              <input type="text" placeholder="Buscar socio activo sin turno..." value={searchWaitingMember} onChange={e => setSearchWaitingMember(e.target.value)} autoFocus className="w-full bg-black border border-gray-700 p-3 pl-12 rounded-xl text-white focus:border-brand-gold outline-none" />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar text-white">
              {sortedMembersForWaiting.length > 0 ? (
                sortedMembersForWaiting.map(m => (
                  <button key={m.id} onClick={() => addToWaitingList(m)} className="w-full text-left p-4 rounded-xl border border-gray-800 bg-gray-900/30 hover:bg-brand-gold hover:text-black transition flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-base">{m.firstName} {m.lastName}</p>
                      <p className="text-xs opacity-50 uppercase font-bold tracking-widest mt-0.5">DNI: {m.dni || 'S/D'}</p>
                    </div>
                    <UserCheck size={20} className="opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-600 py-4 italic text-sm">No hay socios disponibles para agregar (todos tienen turno o no coinciden).</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR SOCIO A TURNO */}
      {showAssignMemberModal && slotToAssign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAssignMemberModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md shadow-2xl text-white">
            <h4 className="text-lg font-bold mb-4">Asignar al turno {slotToAssign.time}</h4>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="text" placeholder="Nombre del socio..." value={searchMemberForSlot} onChange={e => setSearchMemberForSlot(e.target.value)} autoFocus className="w-full bg-black border border-gray-700 p-3 pl-10 rounded-xl text-white focus:border-brand-gold outline-none" />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {filteredMembersForSlot.map(m => (
                <button key={m.id} onClick={() => selectMemberForSlot(m)} className="w-full text-left p-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:bg-brand-gold hover:text-black transition flex justify-between items-center group">
                  <span className="font-bold text-sm">{m.firstName} {m.lastName}</span>
                  <Plus size={16} className="opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR BORRADO */}
      {showDeleteConfirm && selectedReservation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-sm text-center">
            <h4 className="text-lg font-bold text-white mb-4">¿Eliminar Reserva?</h4>
            <p className="text-gray-400 mb-6 text-sm italic">Se quitará a {selectedReservation.clientName} del cronograma.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-xl bg-gray-700 text-white font-bold" onClick={() => setShowDeleteConfirm(false)}>No</button>
              <button className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold" onClick={confirmDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA FRANJA */}
      {showNewSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNewSlotModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md text-white shadow-2xl">
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock className="text-brand-gold" /> Nueva Franja Horaria</h4>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Hora de Inicio</label>
                <input type="time" required value={newSlotForm.time} onChange={e => setNewSlotForm({...newSlotForm, time: e.target.value})} className="w-full bg-black border border-gray-700 p-3 rounded-xl outline-none focus:border-brand-gold" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Etiqueta opcional</label>
                <input type="text" placeholder="Ej: Cardio, Musculación, Personalizado" value={newSlotForm.target} onChange={e => setNewSlotForm({...newSlotForm, target: e.target.value})} className="w-full bg-black border border-gray-700 p-3 rounded-xl outline-none focus:border-brand-gold" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewSlotModal(false)} className="px-6 py-3 bg-gray-800 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-brand-gold text-black rounded-xl font-bold hover:bg-yellow-500 transition">Crear Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Reservas;