import React, { useEffect, useState } from 'react';
import { ExerciseCategoriesAPI, ExerciseCategory } from '../services/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const ExerciseCategoriesAdmin: React.FC = () => {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState<ExerciseCategory | null>(null);
  const [form, setForm] = useState({ name: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await ExerciseCategoriesAPI.list();
      setCategories(data);
    } catch (error) {
      setToast({ message: 'Error al cargar categorías', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenModal = (category?: ExerciseCategory) => {
    if (category) {
      setEditCategory(category);
      setForm({ name: category.name });
    } else {
      setEditCategory(null);
      setForm({ name: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setToast({ message: 'El nombre es requerido', type: 'error' });
      return;
    }

    // Normalizar a mayúsculas (el backend también lo hace pero lo hacemos acá para UX)
    const normalizedName = form.name.trim().toUpperCase();

    try {
      if (editCategory) {
        await ExerciseCategoriesAPI.update(editCategory.id, { name: normalizedName });
        setToast({ message: 'Categoría actualizada', type: 'success' });
      } else {
        await ExerciseCategoriesAPI.create({ name: normalizedName });
        setToast({ message: 'Categoría creada', type: 'success' });
      }
      setShowModal(false);
      loadCategories();
    } catch (error: any) {
      const message = error.message || 'Error al guardar';
      if (message.includes('ya existe') || error.status === 409) {
        setToast({ message: 'Esta categoría ya existe', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteName(name);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    
    try {
      await ExerciseCategoriesAPI.delete(confirmDeleteId);
      setToast({ message: 'Categoría eliminada', type: 'success' });
      loadCategories();
    } catch (error: any) {
      const message = error.message || 'Error al eliminar';
      if (message.includes('en uso')) {
        setToast({ message: 'No se puede eliminar: la categoría está en uso', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">⚠️ No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Gestión de Categorías</h2>
        <p className="text-gray-400 text-sm">Administra las categorías de ejercicios disponibles en el sistema</p>
      </div>

      <button 
        onClick={() => handleOpenModal()} 
        className="mb-4 bg-brand-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-yellow-500 transition"
      >
        <Plus size={18} /> Nueva Categoría
      </button>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No hay categorías creadas aún</p>
        </div>
      ) : (
        <div className="bg-[#181818] rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#222] text-gray-400 border-b border-gray-700">
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr 
                  key={cat.id} 
                  className={`border-b border-gray-700 hover:bg-[#222] transition ${
                    index % 2 === 0 ? 'bg-[#181818]' : 'bg-[#1a1a1a]'
                  }`}
                >
                  <td className="p-4">
                    <span className="text-white font-medium text-lg">{cat.name}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenModal(cat)}
                        className="p-2 text-blue-400 hover:text-blue-200 hover:bg-blue-400/10 rounded transition"
                        title="Editar categoría"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-2 text-red-400 hover:text-red-200 hover:bg-red-400/10 rounded transition"
                        title="Eliminar categoría"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <div 
            className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">
              {editCategory ? 'Editar' : 'Nueva'} Categoría
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ name: e.target.value.toUpperCase() })}
                  placeholder="Ej: PECHO, PIERNAS, ESPALDA..."
                  className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-brand-gold transition uppercase"
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se convertirá automáticamente a mayúsculas
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm flex items-center gap-1 hover:bg-gray-800 rounded transition"
                >
                  <X size={16} /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-brand-gold text-black rounded font-bold text-sm flex items-center gap-1 hover:bg-yellow-500 transition"
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">¿Eliminar categoría?</h3>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que quieres eliminar la categoría{' '}
              <span className="font-semibold text-brand-gold">{confirmDeleteName}</span>?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              ⚠️ Solo se pueden eliminar categorías que no tengan ejercicios asociados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeleteName(null);
                }}
                className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificaciones */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ExerciseCategoriesAdmin;
