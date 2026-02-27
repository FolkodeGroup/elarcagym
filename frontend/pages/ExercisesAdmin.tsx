import React, { useEffect, useState } from 'react';
import { ExercisesAPI, ExerciseCategoriesAPI, ExerciseCategory } from '../services/api';
import { ExerciseMaster } from '../types';
import { Plus, Edit2, Trash2, Save, X, FolderPlus, List } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

const ExercisesAdmin: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('exercises.create');
  const canEdit = hasPermission('exercises.edit');
  const canDelete = hasPermission('exercises.delete');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editExercise, setEditExercise] = useState<ExerciseMaster | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '' });
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Estados para gestión de categorías
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNewCategoryInline, setShowNewCategoryInline] = useState(false);
  const [editCategory, setEditCategory] = useState<ExerciseCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);
  const [confirmDeleteCategoryName, setConfirmDeleteCategoryName] = useState<string | null>(null);

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

  const loadCategories = async () => {
    try {
      const data = await ExerciseCategoriesAPI.list();
      setCategories(data);
    } catch (error) {
      setToast({ message: 'Error al cargar categorías', type: 'error' });
      setCategories([]);
    }
  };

  useEffect(() => {
    loadExercises();
    loadCategories();
  }, []);

  const handleOpenModal = (exercise?: ExerciseMaster) => {
    if (exercise) {
      setEditExercise(exercise);
      setForm({ name: exercise.name, categoryId: exercise.categoryId });
    } else {
      setEditExercise(null);
      setForm({ name: '', categoryId: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId.trim()) {
      setToast({ message: 'Completa todos los campos', type: 'error' });
      return;
    }
    try {
      if (editExercise) {
        await ExercisesAPI.update(editExercise.id, { name: form.name, categoryId: form.categoryId });
        setToast({ message: 'Ejercicio actualizado', type: 'success' });
      } else {
        await ExercisesAPI.create({ name: form.name, categoryId: form.categoryId });
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

  // ========== FUNCIONES PARA CATEGORÍAS ==========
  
  const handleOpenCategoryModal = (category?: ExerciseCategory) => {
    if (category) {
      setEditCategory(category);
      setCategoryForm({ name: category.name });
    } else {
      setEditCategory(null);
      setCategoryForm({ name: '' });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setToast({ message: 'El nombre es requerido', type: 'error' });
      return;
    }

    const normalizedName = categoryForm.name.trim().toUpperCase();
    
    try {
      if (editCategory) {
        await ExerciseCategoriesAPI.update(editCategory.id, { name: normalizedName });
        setToast({ message: 'Categoría actualizada', type: 'success' });
      } else {
        await ExerciseCategoriesAPI.create({ name: normalizedName });
        setToast({ message: 'Categoría creada', type: 'success' });
      }
      setShowCategoryModal(false);
      setShowNewCategoryInline(false);
      await loadCategories();
    } catch (error: any) {
      const message = error.message || 'Error al guardar';
      if (message.includes('ya existe') || error.status === 409) {
        setToast({ message: 'Esta categoría ya existe', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
    }
  };

  const handleCreateCategoryInline = async () => {
    if (!categoryForm.name.trim()) {
      setToast({ message: 'El nombre de la categoría es requerido', type: 'error' });
      return;
    }

    const normalizedName = categoryForm.name.trim().toUpperCase();
    
    try {
      const newCategory = await ExerciseCategoriesAPI.create({ name: normalizedName });
      setToast({ message: 'Categoría creada', type: 'success' });
      setShowNewCategoryInline(false);
      setCategoryForm({ name: '' });
      await loadCategories();
      // Auto-seleccionar la nueva categoría
      setForm(f => ({ ...f, categoryId: newCategory.id }));
    } catch (error: any) {
      const message = error.message || 'Error al guardar';
      if (message.includes('ya existe') || error.status === 409) {
        setToast({ message: 'Esta categoría ya existe', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setConfirmDeleteCategoryId(id);
    setConfirmDeleteCategoryName(name);
  };

  const confirmDeleteCategory = async () => {
    if (!confirmDeleteCategoryId) return;
    
    try {
      await ExerciseCategoriesAPI.delete(confirmDeleteCategoryId);
      setToast({ message: 'Categoría eliminada', type: 'success' });
      await loadCategories();
    } catch (error: any) {
      const message = error.message || 'Error al eliminar';
      if (message.includes('en uso')) {
        setToast({ message: 'No se puede eliminar: la categoría está en uso', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
    } finally {
      setConfirmDeleteCategoryId(null);
      setConfirmDeleteCategoryName(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Gestión de Ejercicios y Categorías</h2>
          <p className="text-sm text-gray-400">Administra ejercicios y sus grupos musculares</p>
        </div>
        <button 
          onClick={() => setShowCategoryPanel(!showCategoryPanel)}
          className={`px-4 py-2 rounded font-semibold flex items-center gap-2 transition ${
            showCategoryPanel 
              ? 'bg-gray-700 text-white' 
              : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
        >
          <List size={18} />
          {showCategoryPanel ? 'Ocultar Categorías' : 'Ver Categorías'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Ejercicios */}
        <div className={showCategoryPanel ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Ejercicios</h3>
              <button 
                onClick={() => handleOpenModal()} 
                className="bg-brand-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-yellow-500 transition"
                disabled={!canCreate}
                title={!canCreate ? 'No tienes permiso para crear ejercicios' : ''}
                style={!canCreate ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >
                <Plus size={18} /> Nuevo Ejercicio
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No hay ejercicios creados aún</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left bg-[#181818] rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-[#222] text-gray-400">
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercises.map(ex => (
                      <tr key={ex.id} className="border-b border-gray-700 hover:bg-[#222] transition">
                        <td className="p-3 text-white font-medium">{ex.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-sm">
                            {ex.category?.name ?? '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            {canEdit && (
                            <button 
                              onClick={() => handleOpenModal(ex)} 
                              className="p-2 text-blue-400 hover:text-blue-200 hover:bg-blue-400/10 rounded transition"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            )}
                            {canDelete && (
                            <button 
                              onClick={() => handleDelete(ex.id)} 
                              className="p-2 text-red-400 hover:text-red-200 hover:bg-red-400/10 rounded transition"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Categorías */}
        {showCategoryPanel && (
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a1a] rounded-lg p-6 sticky top-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Categorías</h3>
                <button 
                  onClick={() => handleOpenCategoryModal()} 
                  className="bg-purple-600 text-white px-3 py-2 rounded font-semibold flex items-center gap-2 hover:bg-purple-500 transition text-sm"
                  disabled={!canCreate}
                  title={!canCreate ? 'No tienes permiso para crear categorías' : ''}
                  style={!canCreate ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >
                  <Plus size={16} /> Nueva
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No hay categorías</p>
                ) : (
                  categories.map(cat => (
                    <div 
                      key={cat.id} 
                      className="flex items-center justify-between p-3 bg-[#222] rounded hover:bg-[#2a2a2a] transition"
                    >
                      <span className="text-white font-medium">{cat.name}</span>
                      <div className="flex gap-1">
                        {canEdit && (
                        <button
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="p-1.5 text-blue-400 hover:text-blue-200 hover:bg-blue-400/10 rounded transition"
                          title="Editar categoría"
                        >
                          <Edit2 size={14} />
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 text-red-400 hover:text-red-200 hover:bg-red-400/10 rounded transition"
                          title="Eliminar categoría"
                        >
                          <Trash2 size={14} />
                        </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Modal de Ejercicios */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <div 
            className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">
              {editExercise ? 'Editar' : 'Nuevo'} Ejercicio
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del Ejercicio *</label>
                <input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-brand-gold transition"
                  placeholder="Ej: Press de Banca"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">Categoría (Grupo Muscular) *</label>
                
                {showNewCategoryInline ? (
                  <div className="space-y-2">
                    <input 
                      value={categoryForm.name} 
                      onChange={e => setCategoryForm({ name: e.target.value.toUpperCase() })} 
                      className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-purple-500 transition uppercase"
                      placeholder="Ej: PECHO, PIERNAS..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateCategoryInline}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded font-semibold text-sm hover:bg-purple-500 transition"
                      >
                        Crear Categoría
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategoryInline(false);
                          setCategoryForm({ name: '' });
                        }}
                        className="px-3 py-2 text-gray-400 hover:text-white text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={form.categoryId}
                      onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                      className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-brand-gold transition"
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewCategoryInline(true)}
                      className="w-full px-3 py-2 bg-purple-600/20 text-purple-400 rounded font-semibold text-sm hover:bg-purple-600/30 transition flex items-center justify-center gap-2"
                    >
                      <FolderPlus size={16} />
                      Crear Nueva Categoría
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setShowNewCategoryInline(false);
                    setCategoryForm({ name: '' });
                  }} 
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm flex items-center gap-1 hover:bg-gray-800 rounded transition"
                >
                  <X size={16} /> Cancelar
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 bg-brand-gold text-black rounded font-bold text-sm flex items-center gap-1 hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={showNewCategoryInline || !form.categoryId.trim()}
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Categorías */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setShowCategoryModal(false)} />
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
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ name: e.target.value.toUpperCase() })}
                  placeholder="Ej: PECHO, PIERNAS, ESPALDA..."
                  className="w-full bg-black border border-gray-600 text-white p-3 rounded focus:outline-none focus:border-purple-500 transition uppercase"
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se convertirá automáticamente a mayúsculas
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm flex items-center gap-1 hover:bg-gray-800 rounded transition"
                >
                  <X size={16} /> Cancelar
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-4 py-2 bg-purple-600 text-white rounded font-bold text-sm flex items-center gap-1 hover:bg-purple-500 transition"
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmación - Eliminar Ejercicio */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">¿Eliminar ejercicio?</h3>
            <p className="text-gray-300 mb-4">
              ¿Seguro que quieres eliminar{' '}
              <span className="font-semibold text-brand-gold">{confirmDeleteName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setConfirmDeleteId(null)} 
                className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
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
                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación - Eliminar Categoría */}
      {confirmDeleteCategoryId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setConfirmDeleteCategoryId(null)} />
          <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">¿Eliminar categoría?</h3>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que quieres eliminar la categoría{' '}
              <span className="font-semibold text-purple-400">{confirmDeleteCategoryName}</span>?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              ⚠️ Solo se pueden eliminar categorías que no tengan ejercicios asociados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmDeleteCategoryId(null);
                  setConfirmDeleteCategoryName(null);
                }}
                className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteCategory}
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

export default ExercisesAdmin;
