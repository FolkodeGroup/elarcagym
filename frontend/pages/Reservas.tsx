import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Slot, Reservation, Member } from '../types';
import { Plus, Edit2, Trash2, Clock, Calendar, Search, X } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Reservas: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDirty, setIsDirty] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { setCanNavigate } = useNavigation();

  // Modal para asignar socio a franja
  const [showAssignMemberModal, setShowAssignMemberModal] = useState(false);
  const [searchMemberForSlot, setSearchMemberForSlot] = useState('');
  const [memberResultsForSlot, setMemberResultsForSlot] = useState<Member[]>([]);
  const [slotToAssign, setSlotToAssign] = useState<Slot | null>(null);

  // Nueva franja
  const [newSlotForm, setNewSlotForm] = useState({
    date: selectedDate,
    time: '08:00',
    duration: 60,
    color: '#D4AF37',
    target: ''
  });

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCanNavigate(!isDirty);
  }, [isDirty, setCanNavigate]);

  // Buscar socios cuando el usuario escribe
  useEffect(() => {
    const s = searchMemberForSlot.trim().toLowerCase();
    if (!s) {
      setMemberResultsForSlot([]);
      return;
    }
    const allMembers = db.getMembers();
    const results = allMembers.filter(m => {
      const fullInfo = (m.firstName + ' ' + m.lastName + ' ' + (m.dni || '') + ' ' + m.email).toLowerCase();
      return fullInfo.includes(s);
    });
    setMemberResultsForSlot(results);
  }, [searchMemberForSlot]);

  const loadData = () => {
    const allSlots = db.getSlots();
    setSlots(allSlots);
    const allReservations = db.getReservations();
    setReservations(allReservations);
  };

  const getDateSlots = () => {
    return slots.filter(s => s.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotForm.time || !newSlotForm.duration) {
      setToast({ message: 'Por favor completa hora y duración.', type: 'error' });
      return;
    }
    db.addSlot({
      date: newSlotForm.date,
      time: newSlotForm.time,
      duration: newSlotForm.duration,
      status: 'available',
      color: newSlotForm.color,
      target: newSlotForm.target
    });
    loadData();
    setToast({ message: 'Franja creada exitosamente.', type: 'success' });
    setShowNewSlotModal(false);
    setNewSlotForm({ date: selectedDate, time: '08:00', duration: 60, color: '#D4AF37', target: '' });
  };

  const selectMemberForSlot = (member: Member) => {
    if (!slotToAssign) return;

    // Count existing reservations for this slot
    const slotReservations = reservations.filter(r => r.slotId === slotToAssign.id);
    if (slotReservations.length >= 10) {
      setToast({ message: 'Este horario ya tiene el máximo de 10 socios asignados.', type: 'error' });
      return;
    }

    // Check if this member is already assigned to this slot
    const alreadyAssigned = slotReservations.some(r => r.memberId === member.id);
    if (alreadyAssigned) {
      setToast({ message: `${member.firstName} ${member.lastName} ya está asignado a este horario.`, type: 'error' });
      return;
    }

    // Create a reservation with the selected member
    const result = db.addReservation({
      slotId: slotToAssign.id,
      memberId: member.id,
      clientName: member.firstName + ' ' + member.lastName,
      clientPhone: member.phone || undefined,
      clientEmail: member.email || undefined,
      notes: ''
    });

    if (result === null) {
      setToast({ message: `${member.firstName} ${member.lastName} ya está asignado a este horario.`, type: 'error' });
      return;
    }

    loadData();
    
    // Re-update slotToAssign with fresh data to keep modal accurate
    if (slotToAssign) {
      const updatedSlot = db.getSlots().find(s => s.id === slotToAssign.id);
      if (updatedSlot) {
        setSlotToAssign(updatedSlot);
      }
    }
    
    setToast({ message: `✓ Socio ${member.firstName} ${member.lastName} asignado al horario ${slotToAssign.time}`, type: 'success' });
    
    // Clear search to add another member
    setSearchMemberForSlot('');
    setMemberResultsForSlot([]);
    // Keep the modal open to allow adding more members!
    setIsDirty(false);
  };

  const handleReserveSlot = (slot: Slot) => {
    // Check if slot is full
    const slotReservations = reservations.filter(r => r.slotId === slot.id);
    if (slotReservations.length >= 10) {
      setToast({ message: 'Este turno está lleno. No se pueden agregar más clientes.', type: 'error' });
      return;
    }
    
    setSlotToAssign(slot);
    setSearchMemberForSlot('');
    setMemberResultsForSlot([]);
    setShowAssignMemberModal(true);
  };

  const handleConfirmReservation = () => {
    // This function is no longer used with new flow
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
    if (!editingReservation || !editFormData.clientName.trim()) {
      setToast({ message: 'Por favor completa el nombre del cliente.', type: 'error' });
      return;
    }
    db.updateReservation(editingReservation.id, {
      clientName: editFormData.clientName,
      clientPhone: editFormData.clientPhone || undefined,
      clientEmail: editFormData.clientEmail || undefined,
      notes: editFormData.notes || undefined
    });
    loadData();
    setToast({ message: 'Reserva actualizada.', type: 'success' });
    setShowEditModal(false);
    setEditingReservation(null);
    setIsDirty(false);
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedReservation) {
      db.deleteReservation(selectedReservation.id);
      loadData();
      setToast({ message: 'Reserva eliminada.', type: 'info' });
      setShowDeleteConfirm(false);
      setSelectedReservation(null);
      setIsDirty(false);
    }
  };

  const dateSlots = getDateSlots();
  const availableCount = dateSlots.filter(s => {
    const hasReservations = reservations.some(r => r.slotId === s.id);
    return !hasReservations;
  }).length;
  const reservedCount = dateSlots.filter(s => {
    const hasReservations = reservations.some(r => r.slotId === s.id);
    return hasReservations;
  }).length;

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'reserved':
        return 'Reservado';
      case 'occupied':
        return 'Ocupado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with date selector y búsqueda */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Reserva de Turnos</h2>
            <p className="text-gray-400 text-sm">Gestiona turnos y reservas de clientes</p>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black border border-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:border-brand-gold"
            />
            <button
              onClick={() => { setNewSlotForm({ ...newSlotForm, date: selectedDate }); setShowNewSlotModal(true); }}
              className="bg-brand-gold text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition flex items-center gap-2"
            >
              <Plus size={18} /> Nueva Franja
            </button>
          </div>
        </div>

        {/* Instrucción */}
        <div className="bg-brand-gold/10 border border-brand-gold/30 p-3 rounded-lg text-center text-sm text-brand-gold">
          💡 Haz click en cualquier horario disponible para asignar un socio
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

      {/* Grilla tipo Google Calendar */}
      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-gray-800">
        <h3 className="text-lg font-bold text-white mb-4">
          {(() => {
            const dateObj = new Date(selectedDate + 'T00:00:00');
            return `Turnos - ${dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
          })()}
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="grid grid-cols-12 border-b border-gray-700 text-gray-400 text-xs">
              <div className="col-span-2 py-2 px-2">Hora</div>
              <div className="col-span-10 py-2 px-2">Franja / Reservas</div>
            </div>
            {Array.from({ length: 16 }, (_, i) => 6 + i).map(hour => {
              const hourStr = hour.toString().padStart(2, '0') + ':00';
              const slot = dateSlots.find(s => s.time === hourStr);
              return (
                <div key={hourStr} className="grid grid-cols-12 border-b border-gray-800 hover:bg-gray-900 transition">
                  <div className="col-span-2 py-3 px-2 font-mono text-gray-400 text-sm flex items-center">{hourStr}</div>
                  <div className="col-span-10 py-2 px-2">
                    {slot ? (
                      <button
                        className={`w-full text-left rounded-lg p-3 flex flex-col gap-1 shadow-md border-2 transition-all
                          ${reservations.filter(r => r.slotId === slot.id).length >= 10 ? 'bg-red-900/40 border-red-700 text-red-200' :
                            reservations.filter(r => r.slotId === slot.id).length > 0 ? 'bg-blue-900/30 border-blue-700 text-blue-200' : 'bg-green-900/30 border-green-700 text-green-200 hover:bg-green-900/50'}
                        `}
                        onClick={() => handleReserveSlot(slot)}
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span className="font-bold text-lg">{slot.time}</span>
                          <span className="text-xs bg-gray-700/70 px-2 py-1 rounded font-bold">
                            {reservations.filter(r => r.slotId === slot.id).length}/10
                          </span>
                          <span className="ml-2 text-xs text-gray-400">Duración: {slot.duration} min</span>
                          {slot.target && <span className="ml-2 text-xs text-brand-gold font-semibold">{slot.target}</span>}
                        </div>
                        {reservations.filter(r => r.slotId === slot.id).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {reservations.filter(r => r.slotId === slot.id).slice(0, 3).map(r => (
                              <span key={r.id} className="bg-black/40 px-2 py-1 rounded text-xs text-white truncate max-w-[120px]">{r.clientName}</span>
                            ))}
                            {reservations.filter(r => r.slotId === slot.id).length > 3 && (
                              <span className="text-xs text-gray-400">+{reservations.filter(r => r.slotId === slot.id).length - 3} más</span>
                            )}
                          </div>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-700 italic">Sin franja</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Slot Modal */}
      {showNewSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowNewSlotModal(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-white">Nueva Franja Horaria</h4>
              <button onClick={() => setShowNewSlotModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSlot} className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={newSlotForm.date}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, date: e.target.value })}
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Hora</label>
                <input
                  type="time"
                  required
                  value={newSlotForm.time}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, time: e.target.value })}
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Duración (minutos)</label>
                <input
                  type="number"
                  required
                  min="15"
                  step="15"
                  value={newSlotForm.duration}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, duration: Number(e.target.value) })}
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Color</label>
                <input
                  type="color"
                  value={newSlotForm.color}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, color: e.target.value })}
                  className="w-full bg-black border border-gray-700 p-2 rounded cursor-pointer"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Destinado a (ej: Clases, Trainer X)</label>
                <input
                  type="text"
                  value={newSlotForm.target}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, target: e.target.value })}
                  placeholder="Deja vacío si es de uso libre"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                  onClick={() => setShowNewSlotModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold hover:bg-yellow-500"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Member to Slot Modal */}
      {showAssignMemberModal && slotToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            setShowAssignMemberModal(false);
            setSlotToAssign(null);
            setSearchMemberForSlot('');
            setMemberResultsForSlot([]);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-white">Asignar Socio</h4>
              <button
                onClick={() => {
                  setShowAssignMemberModal(false);
                  setSlotToAssign(null);
                  setSearchMemberForSlot('');
                  setMemberResultsForSlot([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-2">
              Turno: <span className="text-brand-gold font-bold">{slotToAssign.time}</span> - {new Date(slotToAssign.date).toLocaleDateString('es-ES')}
            </p>

            {(() => {
              const slotReservations = reservations.filter(r => r.slotId === slotToAssign.id);
              const isFull = slotReservations.length >= 10;
              return (
                <>
                  <p className={`text-sm mb-2 ${isFull ? 'text-red-400' : 'text-gray-400'}`}>
                    Socios asignados: <span className={isFull ? 'font-bold' : ''}>{slotReservations.length}/10</span>
                  </p>
                  
                  {slotReservations.length > 0 && (
                    <div className="bg-gray-900/40 p-3 rounded-lg mb-3 border border-gray-700 max-h-28 overflow-y-auto">
                      <p className="text-xs text-gray-400 mb-2">Socios ya asignados:</p>
                      <div className="space-y-1">
                        {slotReservations.map(r => (
                          <div key={r.id} className="text-xs text-gray-300 bg-black/30 px-2 py-1 rounded flex justify-between items-center">
                            <span>✓ {r.clientName}</span>
                            {r.clientPhone && <span className="text-gray-500 text-xs">{r.clientPhone}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {reservations.filter(r => r.slotId === slotToAssign.id).length >= 10 && (
              <div className="bg-red-900/30 border border-red-800 p-3 rounded-lg mb-4 text-red-200 text-sm">
                ❌ Este horario ya tiene el máximo de socios (10)
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Busca un socio:</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Nombre, apellido, DNI o correo..."
                    value={searchMemberForSlot}
                    onChange={(e) => setSearchMemberForSlot(e.target.value)}
                    autoFocus
                    className="w-full bg-black border border-gray-700 p-2 pl-10 rounded text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              {memberResultsForSlot.length > 0 ? (
                <div className="bg-black/40 p-3 rounded border border-gray-700 space-y-2 max-h-48 overflow-y-auto">
                  {memberResultsForSlot.map(m => {
                    const alreadyAssigned = reservations.filter(r => r.slotId === slotToAssign.id).some(r => r.memberId === m.id);
                    const slotFull = reservations.filter(r => r.slotId === slotToAssign.id).length >= 10;
                    return (
                      <button
                        key={m.id}
                        onClick={() => !alreadyAssigned && selectMemberForSlot(m)}
                        disabled={slotFull || alreadyAssigned}
                        className={`w-full text-left p-3 rounded border transition text-white ${
                          alreadyAssigned
                            ? 'bg-gray-700/30 border-gray-600/30 cursor-not-allowed opacity-60'
                            : slotFull
                            ? 'bg-gray-800/30 border-gray-700/30 cursor-not-allowed opacity-50'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-600 cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {m.firstName} {m.lastName}
                              {alreadyAssigned && <span className="text-xs bg-green-900/50 px-2 py-1 rounded text-green-300">✓ Ya asignado</span>}
                            </div>
                            <div className="text-xs text-gray-400">{m.phone} • {m.email}</div>
                            {m.dni && <div className="text-xs text-gray-500">DNI: {m.dni}</div>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchMemberForSlot.trim() ? (
                <p className="text-center text-gray-500 text-sm py-4">No se encontraron socios</p>
              ) : (
                <p className="text-center text-gray-600 text-sm py-4">Escribe para buscar un socio</p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
                  onClick={() => {
                    setShowAssignMemberModal(false);
                    setSlotToAssign(null);
                    setSearchMemberForSlot('');
                    setMemberResultsForSlot([]);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reservation Modal */}
      {showEditModal && editingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
            setShowEditModal(false);
            setIsDirty(false);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
            <h4 className="text-lg font-bold text-white mb-4">Editar Reserva</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  value={editFormData.clientName}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, clientName: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Teléfono</label>
                <input
                  type="tel"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  value={editFormData.clientPhone}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, clientPhone: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  value={editFormData.clientEmail}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, clientEmail: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Notas</label>
                <textarea
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, notes: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                  onClick={() => {
                    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
                    setShowEditModal(false);
                    setIsDirty(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold hover:bg-yellow-500"
                  onClick={() => {
                    handleSaveEdit();
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
      {showDeleteConfirm && selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-sm">
            <h4 className="text-lg font-bold text-white mb-4">Confirmar borrado</h4>
            <p className="text-gray-400 mb-4">
              ¿Deseas borrar la reserva de <strong>{selectedReservation.clientName}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-800"
                onClick={confirmDelete}
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

export default Reservas;
