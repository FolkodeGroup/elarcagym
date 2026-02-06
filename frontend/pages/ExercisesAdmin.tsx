import React, { useEffect, useState } from 'react';
// ...existing code...
import { ExercisesAPI } from '../services/api';
import { ExerciseMaster } from '../types';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import Toast from '../components/Toast';

const ExercisesAdmin: React.FC = () => {
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExercise, setEditExercise] = useState<ExerciseMaster | null>(null);
  const [form, setForm] = useState({ name: '', category: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const data = await ExercisesAPI.list();
      setExercises(data);
    } catch (error) {
      setToast({ message: 'Error al cargar ejercicios', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const handleOpenModal = (exercise?: ExerciseMaster) => {
    if (exercise) {
      setEditExercise(exercise);
      setForm({ name: exercise.name, category: exercise.category });
    } else {
      setEditExercise(null);
      setForm({ name: '', category: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      setToast({ message: 'Completa todos los campos', type: 'error' });
      return;
    }
    try {
      if (editExercise) {
        await ExercisesAPI.update(editExercise.id, form);
        setToast({ message: 'Ejercicio actualizado', type: 'success' });
      } else {
        await ExercisesAPI.create(form);
        setToast({ message: 'Ejercicio creado', type: 'success' });
      }
      setShowModal(false);
      loadExercises();
    } catch (error) {
      setToast({ message: 'Error al guardar', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const exercise = exercises.find(e => e.id === id);
    if (!exercise) return;
    try {
      const usage = await ExercisesAPI.inUse(exercise.name);
      if (usage.inUse) {
        setToast({ message: `No se puede eliminar: el ejercicio está en uso en ${usage.count} rutina(s).`, type: 'error' });
        return;
      }
      setConfirmDeleteId(id);
      setConfirmDeleteName(exercise.name);
    } catch (error) {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Gestión de Ejercicios</h2>
      <button onClick={() => handleOpenModal()} className="mb-4 bg-brand-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-yellow-500">
        <Plus size={18} /> Nuevo Ejercicio
      </button>
      {isLoading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <table className="w-full text-left bg-[#181818] rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#222] text-gray-400">
              <th className="p-2">Nombre</th>
              <th className="p-2">Categoría</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map(ex => (
              <tr key={ex.id} className="border-b border-gray-700 hover:bg-[#222]">
                <td className="p-2 text-white">{ex.name}</td>
                <td className="p-2 text-gray-300">{ex.category}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => handleOpenModal(ex)} className="text-blue-400 hover:text-blue-200"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(ex.id)} className="text-red-400 hover:text-red-200"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          {/* Fondo que cierra el modal */}
          <div className="absolute inset-0" style={{ zIndex: 1 }} onClick={() => setShowModal(false)} />
          {/* Contenido del modal, con zIndex mayor y deteniendo propagación */}
          <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{editExercise ? 'Editar' : 'Nuevo'} Ejercicio</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-black border border-gray-600 text-white p-2 rounded" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Categoría</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-black border border-gray-600 text-white p-2 rounded" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowModal(false)} className="px-3 py-2 text-gray-400 text-sm flex items-center gap-1"><X size={16} /> Cancelar</button>
                <button onClick={handleSave} className="px-4 py-2 bg-brand-gold text-black rounded font-bold text-sm flex items-center gap-1"><Save size={16} /> Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />}
          {confirmDeleteId && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeleteId(null)} />
              <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
                <h3 className="text-lg font-bold text-white mb-4">¿Eliminar ejercicio?</h3>
                <p className="text-gray-300 mb-4">¿Seguro que quieres eliminar <span className="font-semibold text-brand-gold">{confirmDeleteName}</span>?</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800">Cancelar</button>
                  <button
                    onClick={async () => {
                      try {
                        await ExercisesAPI.delete(confirmDeleteId);
                        setToast({ message: 'Ejercicio eliminado', type: 'success' });
                        loadExercises();
                      } catch {
                        setToast({ message: 'Error al eliminar', type: 'error' });
                      }
                      setConfirmDeleteId(null);
                      setConfirmDeleteName(null);
                    }}
                    className="px-4 py-2 bg-brand-gold text-black rounded font-bold hover:bg-yellow-500"
                  >Aceptar</button>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default ExercisesAdmin;
