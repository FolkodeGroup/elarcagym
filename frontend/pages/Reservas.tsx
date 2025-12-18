import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Slot, Reservation } from '../types';
import { Plus, Edit2, Trash2, Clock, Calendar } from 'lucide-react';
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
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { setCanNavigate } = useNavigation();

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
    // Allow multiple reservations per slot. Only block if explicitly occupied.
    if (slot.status === 'occupied') {
      setToast({ message: 'Este turno está ocupado y no acepta más reservas.', type: 'error' });
      return;
    }
    setSelectedSlot(slot);
    setFormData({ clientName: '', clientPhone: '', clientEmail: '', notes: '' });
    setShowReservationModal(true);
  };

  const handleConfirmReservation = () => {
    if (!selectedSlot || !formData.clientName.trim()) {
      setToast({ message: 'Por favor completa el nombre del cliente.', type: 'error' });
      return;
    }
    const reservation = db.addReservation({
      slotId: selectedSlot.id,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone || undefined,
      clientEmail: formData.clientEmail || undefined,
      notes: formData.notes || undefined
    });
    loadData();
    setToast({ message: 'Reserva creada exitosamente.', type: 'success' });
    setShowReservationModal(false);
    setSelectedSlot(null);
    setIsDirty(false);
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

  const getReservationsForSlot = (slotId: string) => {
    return reservations.filter(r => r.slotId === slotId);
  };

  const dateSlots = getDateSlots();
  // Derive status from reservations: if slot.status === 'occupied' -> occupied
  // else if any reservations exist for that slot -> reserved, else available
  const slotComputedStatus = (slot: Slot) => {
    if (slot.status === 'occupied') return 'occupied';
    const res = reservations.filter(r => r.slotId === slot.id);
    return res.length > 0 ? 'reserved' : 'available';
  };

  const availableCount = dateSlots.filter(s => slotComputedStatus(s) === 'available').length;
  const reservedCount = dateSlots.filter(s => slotComputedStatus(s) === 'reserved').length;

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
      {/* Header with date selector */}
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
              const slotReservations = getReservationsForSlot(slot.id);
              return (
                <div
                  key={slot.id}
                  onClick={() => slotComputedStatus(slot) !== 'occupied' && handleReserveSlot(slot)}
                  className={`p-4 rounded border transition-all ${getStatusColor(slotComputedStatus(slot))}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className={
                      slotComputedStatus(slot) === 'available' ? 'text-green-400' :
                      slotComputedStatus(slot) === 'reserved' ? 'text-blue-400' : 'text-red-400'
                    } />
                    <span className="font-bold text-white">{slot.time}</span>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-2">{slot.duration} min</p>
                  
                  {slotReservations.length > 0 ? (
                    <div className="bg-black/40 p-2 rounded text-sm space-y-2">
                      {slotReservations.map(res => (
                        <div key={res.id} className="border-b border-gray-800 pb-2">
                          <p className="text-white font-semibold truncate">{res.clientName}</p>
                          {res.clientPhone && <p className="text-gray-400 text-xs">{res.clientPhone}</p>}
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditReservation(res); }}
                              className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                            >
                              <Edit2 size={12} className="inline mr-1" />Editar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteReservation(res); }}
                              className="flex-1 px-2 py-1 bg-red-900/50 hover:bg-red-800/50 rounded text-xs"
                            >
                              <Trash2 size={12} className="inline mr-1" />Borrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    ) : (
                    <p className="text-xs text-gray-500 italic">
                      {getStatusLabel(slotComputedStatus(slot))}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reserve Slot Modal */}
      {showReservationModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
            setShowReservationModal(false);
            setIsDirty(false);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md">
            <h4 className="text-lg font-bold text-white mb-4">Nueva Reserva</h4>
            <p className="text-gray-400 text-sm mb-4">
              Turno: <span className="text-brand-gold font-bold">{selectedSlot.time}</span> - {new Date(selectedSlot.date).toLocaleDateString('es-ES')}
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="Ej: Juan Pérez"
                  value={formData.clientName}
                  onChange={(e) => {
                    setFormData({ ...formData, clientName: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Teléfono</label>
                <input
                  type="tel"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="Ej: +54 9 11 1234-5678"
                  value={formData.clientPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, clientPhone: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="Ej: juan@example.com"
                  value={formData.clientEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, clientEmail: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Notas</label>
                <textarea
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="Observaciones adicionales"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => {
                    setFormData({ ...formData, notes: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                  onClick={() => {
                    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
                    setShowReservationModal(false);
                    setIsDirty(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold hover:bg-yellow-500"
                  onClick={() => {
                    handleConfirmReservation();
                    setIsDirty(false);
                  }}
                >
                  Reservar
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
