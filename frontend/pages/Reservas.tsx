import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../services/db';
import { Slot, Reservation, Member, UserStatus } from '../types';
import { Plus, Edit2, Trash2, Clock, Search, X, Users, UserPlus, ListOrdered, UserCheck } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Reservas: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  
  // Lista de espera
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
  
  // Estados para Modal de Lista de Espera
  const [showWaitingListModal, setShowWaitingListModal] = useState(false);
  const [searchWaitingMember, setSearchWaitingMember] = useState('');

  // Estados para Modal de Asignar Socio a Turno
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
    clientName: '', clientPhone: '', clientEmail: '', notes: ''
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

  // --- LÓGICA DE BÚSQUEDA (CORREGIDA) ---

  // 1. Buscador para la Lista de Espera (Ordenado Nombre - Apellido)
  const sortedMembersForWaiting = useMemo(() => {
    return allMembers
      .filter(m => m.status === UserStatus.ACTIVE)
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
  }, [allMembers, searchWaitingMember]);

  // 2. Buscador para Asignar Socio a Turno (EL QUE FALLABA)
  const filteredMembersForSlot = useMemo(() => {
    const query = searchMemberForSlot.toLowerCase().trim();
    if (!query) return []; // Si no hay texto, no mostrar nada o mostrar lista corta
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

  const addToWaitingList = (member: Member) => {
    if (waitingList.find(m => m.id === member.id)) {
      setToast({ message: `${member.firstName} ya está en la lista.`, type: 'error' });
      return;
    }
    const newList = [...waitingList, member];
    setWaitingList(newList);
    localStorage.setItem(`waiting_list_${selectedDate}`, JSON.stringify(newList));
    setToast({ message: `${member.firstName} agregado a espera.`, type: 'success' });
    setShowWaitingListModal(false);
    setSearchWaitingMember('');
  };

  const removeFromWaitingList = (memberId: string) => {
    const newList = waitingList.filter(m => m.id !== memberId);
    setWaitingList(newList);
    localStorage.setItem(`waiting_list_${selectedDate}`, JSON.stringify(newList));
  };

  const selectMemberForSlot = (member: Member) => {
    if (!slotToAssign) return;
    const slotRes = reservations.filter((r) => r.slotId === slotToAssign.id);
    if (slotRes.length >= 10) {
      setToast({ message: 'Turno lleno.', type: 'error' });
      return;
    }
    const result = db.addReservation({
      slotId: slotToAssign.id,
      memberId: member.id,
      clientName: member.firstName + ' ' + member.lastName,
      clientPhone: member.phone || undefined,
      clientEmail: member.email || undefined,
      notes: ''
    });
    if (result) {
      loadData();
      removeFromWaitingList(member.id);
      setToast({ message: `Asignado correctamente.`, type: 'success' });
      setShowAssignMemberModal(false);
      setSearchMemberForSlot('');
    }
  };

  const handleReserveSlot = (slot: Slot) => {
    setSlotToAssign(slot);
    setSearchMemberForSlot('');
    setShowAssignMemberModal(true);
  };

  const handleMarkAbsence = (reservation: Reservation) => {
    db.updateReservationAttendance(reservation.id, false);
    loadData();
    setToast({ message: `Marcado como ausente.`, type: 'info' });
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
      clientPhone: reservation.clientPhone || '',
      clientEmail: reservation.clientEmail || '',
      notes: reservation.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingReservation || !editFormData.clientName.trim()) return;
    db.updateReservation(editingReservation.id, {
      clientName: editFormData.clientName,
      notes: editFormData.notes || undefined
    });
    loadData();
    setShowEditModal(false);
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
          <h2 className="text-2xl font-bold text-white mb-2">Reserva de Turnos</h2>
          <p className="text-gray-400 text-sm">Gestión de asistencia diaria</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-black border border-gray-700 text-white rounded px-4 py-2 outline-none" />
          <button onClick={() => setShowNewSlotModal(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-gray-700 hover:bg-gray-700 transition"><Plus size={18} /> Franja</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest text-sm">
              <Clock size={18} className="text-brand-gold" /> Horarios Disponibles
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
                        <div onClick={() => handleReserveSlot(slot)} className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${slotRes.length >= 10 ? 'bg-red-900/10 border-red-900/50' : slotRes.length > 0 ? 'bg-blue-900/10 border-blue-900/50' : 'bg-green-900/10 border-green-900/30 hover:border-green-500'}`}>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-white">{slot.time}</span>
                            <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded text-gray-400 font-bold">{slotRes.length}/10 SOCIOS</span>
                            {slot.target && <span className="text-[10px] text-brand-gold font-bold">{slot.target}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {slotRes.map(r => (
                              <div key={r.id} className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded text-[10px] border border-gray-800">
                                <span className={r.attended === false ? 'text-red-500 line-through' : 'text-gray-200'}>{r.clientName}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleMarkAbsence(r); }} className="text-yellow-600 hover:text-yellow-400"><UserPlus size={10}/></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteReservation(r); }} className="text-red-800 hover:text-red-500"><X size={10}/></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <div className="h-10 flex items-center text-gray-800 italic text-xs">Sin turno configurado</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Lista de Espera */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><ListOrdered size={20} className="text-brand-gold" /> Lista de Espera</h3>
              <button onClick={() => setShowWaitingListModal(true)} className="p-2 bg-brand-gold text-black rounded-full hover:bg-yellow-500 transition"><Plus size={18} /></button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {waitingList.map(member => (
                <div key={member.id} className="bg-black/40 p-4 rounded-xl border border-gray-800 group hover:border-brand-gold/50 transition">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{member.firstName} {member.lastName}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{member.phone || 'Sin tel.'}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => { setSearchMemberForSlot(member.firstName); setToast({ message: "Elige un horario vacío para asignarlo.", type: "info" }); }} className="p-2 bg-gray-800 text-brand-gold rounded-lg hover:bg-brand-gold hover:text-black transition"><UserPlus size={16} /></button>
                      <button onClick={() => removeFromWaitingList(member.id)} className="p-2 bg-gray-800 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {waitingList.length === 0 && <p className="text-center text-gray-600 py-10 text-xs italic">Nadie en espera hoy.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ANOTAR EN ESPERA */}
      {showWaitingListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWaitingListModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold text-white">Anotar en Espera</h4>
              <button onClick={() => setShowWaitingListModal(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
            </div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 text-gray-500" size={20} />
              <input type="text" placeholder="Buscar por Nombre..." value={searchWaitingMember} onChange={e => setSearchWaitingMember(e.target.value)} autoFocus className="w-full bg-black border border-gray-700 p-3 pl-12 rounded-xl text-white outline-none focus:border-brand-gold" />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {sortedMembersForWaiting.map(m => (
                <button key={m.id} onClick={() => addToWaitingList(m)} className="w-full text-left p-4 rounded-xl border border-gray-800 bg-gray-900/30 hover:bg-brand-gold hover:text-black transition flex items-center justify-between group">
                  <p className="font-bold text-base">{m.firstName} {m.lastName}</p>
                  <UserCheck size={20} className="opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR SOCIO A TURNO (EL QUE TENÍA EL ERROR) */}
      {showAssignMemberModal && slotToAssign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAssignMemberModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-2xl border border-gray-800 z-10 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-white">Asignar al turno {slotToAssign.time}</h4>
              <button onClick={() => setShowAssignMemberModal(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Escribe el nombre del socio..." 
                value={searchMemberForSlot} 
                onChange={e => setSearchMemberForSlot(e.target.value)} 
                autoFocus
                className="w-full bg-black border border-gray-700 p-3 pl-10 rounded-xl text-white outline-none focus:border-brand-gold" 
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {filteredMembersForSlot.length > 0 ? (
                filteredMembersForSlot.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => selectMemberForSlot(m)} 
                    className="w-full text-left p-3 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-brand-gold hover:text-black transition flex justify-between items-center"
                  >
                    <span className="font-bold">{m.firstName} {m.lastName}</span>
                    <Plus size={16} />
                  </button>
                ))
              ) : searchMemberForSlot.trim() !== "" ? (
                <p className="text-center text-gray-600 py-4 text-sm italic">No se encontraron resultados para "{searchMemberForSlot}"</p>
              ) : (
                <p className="text-center text-gray-700 py-4 text-xs">Escribe el nombre arriba para ver socios activos.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Borrar */}
      {showDeleteConfirm && selectedReservation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-sm text-center">
            <h4 className="text-lg font-bold text-white mb-4">¿Eliminar Reserva?</h4>
            <p className="text-gray-400 mb-6 text-sm">Vas a quitar a {selectedReservation.clientName} de este turno.</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded bg-gray-700 text-white" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
              <button className="flex-1 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition" onClick={confirmDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* New Slot Modal */}
      {showNewSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNewSlotModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md text-white">
            <h4 className="text-lg font-bold mb-4">Nueva Franja Horaria</h4>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <input type="time" required value={newSlotForm.time} onChange={e => setNewSlotForm({...newSlotForm, time: e.target.value})} className="w-full bg-black border border-gray-700 p-2 rounded" />
              <input type="text" placeholder="Etiqueta (ej: Cardio, Musculación)" value={newSlotForm.target} onChange={e => setNewSlotForm({...newSlotForm, target: e.target.value})} className="w-full bg-black border border-gray-700 p-2 rounded" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewSlotModal(false)} className="px-4 py-2 bg-gray-700 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-gold text-black font-bold rounded">Crear</button>
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