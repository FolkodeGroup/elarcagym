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
    const allSlots = db.getSlots();
    setSlots(allSlots);
    const allReservations = db.getReservations();
    setReservations(allReservations);
  };

  const getDateSlots = () => {
    return slots.filter(s => s.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleReserveSlot = (slot: Slot) => {
    if (slot.status !== 'available') {
      setToast({ message: 'Este turno no está disponible.', type: 'error' });
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

  const getReservationForSlot = (slotId: string) => {
    return reservations.find(r => r.slotId === slotId);
  };

  const dateSlots = getDateSlots();
  const availableCount = dateSlots.filter(s => s.status === 'available').length;
  const reservedCount = dateSlots.filter(s => s.status === 'reserved').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-900/30 border-green-800 hover:bg-green-900/50 cursor-pointer';
      case 'reserved':
        return 'bg-blue-900/30 border-blue-800 cursor-default';
      case 'occupied':
        return 'bg-red-900/30 border-red-800 cursor-default';
      default:
        return 'bg-gray-800 border-gray-700';
    }
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Total Turnos</p>
          <p className="text-2xl font-bold text-white">{dateSlots.length}</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-green-800">
          <p className="text-gray-400 text-sm mb-1">Disponibles</p>
          <p className="text-2xl font-bold text-green-400">{availableCount}</p>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-blue-800">
          <p className="text-gray-400 text-sm mb-1">Reservados</p>
          <p className="text-2xl font-bold text-blue-400">{reservedCount}</p>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
        <h3 className="text-lg font-bold text-white mb-4">
          Turnos - {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dateSlots.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-8">No hay turnos para esta fecha</p>
          ) : (
            dateSlots.map(slot => {
              const reservation = getReservationForSlot(slot.id);
              return (
                <div
                  key={slot.id}
                  onClick={() => slot.status === 'available' && handleReserveSlot(slot)}
                  className={`p-4 rounded border transition-all ${getStatusColor(slot.status)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className={
                      slot.status === 'available' ? 'text-green-400' :
                      slot.status === 'reserved' ? 'text-blue-400' : 'text-red-400'
                    } />
                    <span className="font-bold text-white">{slot.time}</span>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-2">{slot.duration} min</p>
                  
                  {reservation ? (
                    <div className="bg-black/40 p-2 rounded text-sm">
                      <p className="text-white font-semibold truncate">{reservation.clientName}</p>
                      {reservation.clientPhone && <p className="text-gray-400 text-xs">{reservation.clientPhone}</p>}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReservation(reservation);
                          }}
                          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                        >
                          <Edit2 size={12} className="inline mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReservation(reservation);
                          }}
                          className="flex-1 px-2 py-1 bg-red-900/50 hover:bg-red-800/50 rounded text-xs"
                        >
                          <Trash2 size={12} className="inline mr-1" />
                          Borrar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      {getStatusLabel(slot.status)}
                    </p>
                  )}
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