import React, { useState, useEffect } from 'react';
import { RemindersAPI } from '../services/api';
import { Reminder } from '../types';
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useLanguage } from '../contexts/LanguageContext';
import Toast from '../components/Toast';

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { setCanNavigate } = useNavigation();
  const { t } = useLanguage();

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderToDeleteId, setReminderToDeleteId] = useState<string | null>(null);
  const [newReminderForm, setNewReminderForm] = useState<{ text: string; date: string; priority: 'low' | 'medium' | 'high' }>({ text: '', date: '', priority: 'medium' });
  const [editReminderForm, setEditReminderForm] = useState<{ text: string; date: string; priority: 'low' | 'medium' | 'high' }>({ text: '', date: '', priority: 'medium' });

  const loadReminders = async () => {
    setIsLoading(true);
    try {
      const list = await RemindersAPI.list();
      setReminders(list);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setToast({ message: 'Error al cargar recordatorios', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // Block navigation when there are unsaved changes
  useEffect(() => {
    setCanNavigate(!isDirty);
  }, [isDirty, setCanNavigate]);

  const handleAddReminder = async () => {
    if (!newReminderForm.text.trim() || !newReminderForm.date) {
      setToast({ message: t('completaCampos'), type: 'error' });
      return;
    }
    try {
      await RemindersAPI.create({
        text: newReminderForm.text,
        date: newReminderForm.date,
        priority: newReminderForm.priority
      });
      await loadReminders();
      setToast({ message: t('recordatorioAgregado'), type: 'success' });
      setShowAddModal(false);
      setNewReminderForm({ text: '', date: '', priority: 'medium' });
      setIsDirty(false);
    } catch (error) {
      setToast({ message: 'Error al agregar recordatorio', type: 'error' });
    }
  };

  const handleEditReminder = async () => {
    if (!editingReminder || !editReminderForm.text.trim() || !editReminderForm.date) {
      setToast({ message: t('completaCampos'), type: 'error' });
      return;
    }
    try {
      await RemindersAPI.update(editingReminder.id, {
        text: editReminderForm.text,
        date: editReminderForm.date,
        priority: editReminderForm.priority
      });
      await loadReminders();
      setToast({ message: t('recordatorioActualizado'), type: 'success' });
      setShowEditModal(false);
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
      await loadReminders();
      setToast({ message: t('recordatorioEliminado'), type: 'info' });
      setShowDeleteConfirm(false);
      setReminderToDeleteId(null);
      setIsDirty(false);
    } catch (error) {
      setToast({ message: 'Error al eliminar recordatorio', type: 'error' });
    }
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditReminderForm({ text: reminder.text, date: typeof reminder.date === 'string' ? reminder.date.split('T')[0] : reminder.date, priority: reminder.priority });
    setShowEditModal(true);
  };

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'medium':
        return <Info className="text-yellow-500" size={20} />;
      case 'low':
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold text-white">{t('recordatorios')}</h2>
        <button
          onClick={() => {
            setShowAddModal(true);
            setNewReminderForm({ text: '', date: '', priority: 'medium' });
            setIsDirty(false);
          }}
          className="bg-brand-gold text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition flex items-center gap-2"
        >
          <Plus size={20} /> {t('nuevoRecordatorio')}
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-lg">{t('noHayRecordatorios')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map(reminder => (
            <div key={reminder.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">{priorityIcon(reminder.priority)}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(reminder)}
                    className="p-2 rounded bg-gray-800 hover:bg-gray-700"
                    title={t('editar')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setReminderToDeleteId(reminder.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 rounded bg-gray-800 hover:bg-gray-700"
                    title={t('borrar')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-white font-bold mb-2">{reminder.text}</p>
              <p className="text-gray-400 text-sm">{new Date(reminder.date).toLocaleDateString()}</p>
              <span className={`text-xs font-bold mt-2 px-2 py-1 rounded w-fit ${
                reminder.priority === 'high'
                  ? 'bg-red-900/30 text-red-300'
                  : reminder.priority === 'medium'
                  ? 'bg-yellow-900/30 text-yellow-300'
                  : 'bg-green-900/30 text-green-300'
              }`}>
                {reminder.priority === 'high' ? 'ALTA' : reminder.priority === 'medium' ? 'MEDIA' : 'BAJA'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            if (isDirty) {
              if (!window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
            }
            setShowAddModal(false);
            setIsDirty(false);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-white mb-4">Nuevo Recordatorio</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Texto</label>
                <textarea
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="Descripción del recordatorio"
                  value={newReminderForm.text}
                  onChange={e => {
                    setNewReminderForm({ ...newReminderForm, text: e.target.value });
                    setIsDirty(true);
                  }}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
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
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
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
                  className="px-4 py-2 rounded bg-gray-700"
                  onClick={() => {
                    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
                    setShowAddModal(false);
                    setIsDirty(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold"
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
      {showEditModal && editingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
            setShowEditModal(false);
            setIsDirty(false);
          }} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-white mb-4">Editar Recordatorio</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Texto</label>
                <textarea
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
                  placeholder="Descripción del recordatorio"
                  value={editReminderForm.text}
                  onChange={e => {
                    setEditReminderForm({ ...editReminderForm, text: e.target.value });
                    setIsDirty(true);
                  }}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
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
                  className="w-full bg-black border border-gray-700 p-2 rounded text-white"
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
                  className="px-4 py-2 rounded bg-gray-700"
                  onClick={() => {
                    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar?')) return;
                    setShowEditModal(false);
                    setIsDirty(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-black font-bold"
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
      {showDeleteConfirm && reminderToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="bg-[#0b0b0b] p-6 rounded-lg border border-gray-800 z-10 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-white mb-4">Confirmar borrado</h4>
            <p className="text-gray-400 mb-4">¿Deseas borrar este recordatorio? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-700"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('cancelar')}
              </button>
              <button
                className="px-4 py-2 rounded bg-red-700 text-white font-bold"
                onClick={handleDeleteReminder}
              >
                {t('borrar')}
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

export default Reminders;
