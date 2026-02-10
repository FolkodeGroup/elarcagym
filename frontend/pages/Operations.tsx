import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MembersAPI, ExercisesAPI } from '../services/api';
import { Member, ExerciseMaster, RoutineDay, ExerciseDetail, Routine } from '../types';
import { Dumbbell, Plus, Save, Trash2, ClipboardList, Edit2, RotateCcw, Search, ChevronDown, Check } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Operations: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [exercisesMaster, setExercisesMaster] = useState<ExerciseMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setCanNavigate } = useNavigation();
  
  // Selection State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearchText, setMemberSearchText] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberSearchRef = useRef<HTMLDivElement>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  
  // Routine Builder State
  const [routineName, setRoutineName] = useState('');
  const [routineGoal, setRoutineGoal] = useState('Hipertrofia');
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>([
    { dayName: 'Día 1', exercises: [] }
  ]);
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | { type: 'switchDay' | 'loadRoutine' | 'reset', payload?: any }>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState<{ id: string; name: string } | null>(null);  // Add Exercise Form State
  const [series, setSeries] = useState('4');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  // --- SEARCHABLE COMBOBOX STATE ---
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // New Master Exercise Modal State
  const [showNewExModal, setShowNewExModal] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [membersData, exercisesData] = await Promise.all([
        MembersAPI.list(),
        ExercisesAPI.list()
      ]);
      setMembers(membersData);
      setExercisesMaster(exercisesData);
      if (membersData.length > 0) setSelectedMemberId(membersData[0].id);
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Error al cargar datos', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Click outside listener for dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (memberSearchRef.current && !memberSearchRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when member changes to avoid editing a routine for the wrong member
  useEffect(() => {
    resetForm();
  }, [selectedMemberId]);

  // Protect against leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar. Si sales sin guardar, perderás los cambios.';
        return 'Hay cambios sin guardar. Si sales sin guardar, perderás los cambios.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Control navigation blocking based on isDirty state
  useEffect(() => {
    setCanNavigate(!isDirty);
  }, [isDirty, setCanNavigate]);

  // --- Logic for Searchable Dropdown ---
  const filteredExercises = useMemo(() => {
    if (!exerciseSearch) return exercisesMaster;
    return exercisesMaster.filter(ex => 
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) || 
      ex.category.toLowerCase().includes(exerciseSearch.toLowerCase())
    );
  }, [exercisesMaster, exerciseSearch]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, ExerciseMaster[]> = {};
    filteredExercises.forEach(ex => {
      if (!groups[ex.category]) groups[ex.category] = [];
      groups[ex.category].push(ex);
    });
    return groups;
  }, [filteredExercises]);

  const selectExercise = (ex: ExerciseMaster) => {
      setSelectedExerciseId(ex.id);
      setExerciseSearch(ex.name);
      setIsDropdownOpen(false);
  };

  // Get sorted and filtered members for member search
  const filteredMembers = useMemo(() => {
    const search = memberSearchText.toLowerCase().trim();
    let result = members.filter(m => {
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      const searchName = `${m.lastName} ${m.firstName}`.toLowerCase();
      return fullName.includes(search) || searchName.includes(search) || m.email.toLowerCase().includes(search);
    });
    // Sort by firstName, then lastName
    return result.sort((a, b) => {
      const aFirstName = a.firstName.toLowerCase();
      const bFirstName = b.firstName.toLowerCase();
      if (aFirstName !== bFirstName) {
        return aFirstName.localeCompare(bFirstName);
      }
      return a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase());
    });
  }, [members, memberSearchText]);

  // Eliminado: función para abrir modal de creación rápida de ejercicio

  // --- Handlers ---

  const resetForm = () => {
    setEditingRoutineId(null);
    setRoutineName('');
    setRoutineGoal('Hipertrofia');
    setRoutineDays([{ dayName: 'Día 1', exercises: [] }]);
    setActiveDayIndex(0);
    resetExerciseInput();
  };

    // Reset form with optional confirmation if there are unsaved changes
    const resetFormWithConfirm = (askConfirm = false) => {
        if (askConfirm && isDirty) {
            const ok = window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos y continuar?');
            if (!ok) return;
        }
        resetForm();
        setIsDirty(false);
    };

  const resetExerciseInput = () => {
      setExerciseSearch('');
      setSelectedExerciseId('');
      setWeight('');
      setNotes('');
  };

        const loadRoutineForEditing = (routine: Routine) => {
                if (isDirty) {
                        setPendingAction({ type: 'loadRoutine', payload: routine });
                        setShowUnsavedModal(true);
                        return;
                }
                setEditingRoutineId(routine.id);
                setRoutineName(routine.name);
                setRoutineGoal(routine.goal);
                // Deep copy to avoid mutating state directly from initial selection
                setRoutineDays(JSON.parse(JSON.stringify(routine.days)));
                setActiveDayIndex(0);
                setIsDirty(false);
        };

        const attemptChangeDay = (idx: number) => {
            setActiveDayIndex(idx);
        };

        const attemptResetForm = () => {
            if (isDirty) {
                setPendingAction({ type: 'reset' });
                setShowUnsavedModal(true);
                return;
            }
            resetForm();
        };

        const executePendingAction = () => {
            if (!pendingAction) return;
            const { type, payload } = pendingAction;
            if (type === 'switchDay') {
                setActiveDayIndex(payload as number);
            } else if (type === 'reset') {
                resetForm();
                setIsDirty(false);
            } else if (type === 'loadRoutine') {
                const routine: Routine = payload as Routine;
                setEditingRoutineId(routine.id);
                setRoutineName(routine.name);
                setRoutineGoal(routine.goal);
                setRoutineDays(JSON.parse(JSON.stringify(routine.days)));
                setActiveDayIndex(0);
                setIsDirty(false);
            }
            setPendingAction(null);
            setShowUnsavedModal(false);
        };

  const handleAddDay = () => {
        setRoutineDays([...routineDays, { dayName: `Día ${routineDays.length + 1}`, exercises: [] }]);
        setActiveDayIndex(routineDays.length);
        setIsDirty(true);
  };

  const handleAddExerciseToDay = (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedExerciseId) {
      setToast({ message: 'Por favor selecciona un ejercicio válido de la lista.', type: 'error' });
      return;
    }

    // Validar duplicado
    const dayExercises = routineDays[activeDayIndex].exercises;
    const masterEx = exercisesMaster.find(ex => ex.id === selectedExerciseId);
    if(!masterEx) return;
    const alreadyExists = dayExercises.some(ex => ex.name === masterEx.name);
    if (alreadyExists) {
      setToast({ message: 'Este ejercicio ya fue agregado a este día.', type: 'error' });
      return;
    }

    const newDetail: ExerciseDetail = {
        id: Math.random().toString(36).substr(2, 9),
        name: masterEx.name,
        series,
        reps,
        weight: weight || 'N/A',
        notes
    };

    const updatedDays = [...routineDays];
    updatedDays[activeDayIndex].exercises.push(newDetail);
    setRoutineDays(updatedDays);
    setIsDirty(true);
    resetExerciseInput();
  };

  const handleRemoveExercise = (dayIndex: number, exId: string) => {
    const updatedDays = [...routineDays];
    updatedDays[dayIndex].exercises = updatedDays[dayIndex].exercises.filter(e => e.id !== exId);
    setRoutineDays(updatedDays);
        setIsDirty(true);
  };

  const handleCreateMasterExercise = async () => {
    if(!newExName) return;
    try {
      const newEx = await ExercisesAPI.create({ name: newExName, category: newExCategory || 'General' });
      setExercisesMaster([...exercisesMaster, newEx]);
      
      // Auto select the new exercise
      selectExercise(newEx);
      
      setShowNewExModal(false);
      setNewExName('');
      setNewExCategory('');
      setIsDirty(true);
    } catch (error) {
      console.error('Error creating exercise:', error);
      setToast({ message: 'Error al crear ejercicio', type: 'error' });
    }
  };

  // Limpia los campos no válidos de los días y ejercicios antes de enviar al backend
  function cleanRoutineDays(days) {
    return days.map(day => ({
      dayName: day.dayName,
      exercises: day.exercises.map(ex => ({
        name: ex.name,
        series: ex.series,
        reps: ex.reps,
        weight: ex.weight,
        notes: ex.notes || ''
      }))
    }));
  }

  const handleSaveRoutine = async () => {
    if(!routineName || !selectedMemberId) {
        setToast({ message: 'Por favor ingresa un nombre para la rutina y selecciona un socio.', type: 'error' });
        return;
    }
    // Filter out empty days
    const finalDays = routineDays.filter(d => d.exercises.length > 0);
    if(finalDays.length === 0) {
        setToast({ message: 'La rutina debe tener al menos un ejercicio.', type: 'error' });
        return;
    }
    // Limpiar los días y ejercicios antes de enviar
    const cleanedDays = cleanRoutineDays(routineDays);
    const payload = {
        name: routineName,
        goal: routineGoal,
        days: cleanedDays,
        assignedBy: 'El Arca' // TODO: obtener del contexto de autenticación
    };
    try {
      if (editingRoutineId) {
          await MembersAPI.updateRoutine(selectedMemberId, editingRoutineId, payload);
          setToast({ message: `¡Rutina "${payload.name}" actualizada correctamente!`, type: 'success' });
      } else {
          await MembersAPI.addRoutine(selectedMemberId, payload);
          setToast({ message: `¡Rutina "${payload.name}" asignada correctamente!`, type: 'success' });
      }
      // Refresh member list to show updated routines and reset
      await loadData();
      resetForm();
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving routine:', error);
      setToast({ message: 'Error al guardar rutina', type: 'error' });
    }
  };

  const handleDeleteRoutine = (routineId: string, routineName: string) => {
    setRoutineToDelete({ id: routineId, name: routineName });
    setShowDeleteModal(true);
  };

  const confirmDeleteRoutine = async () => {
    if (!routineToDelete || !selectedMemberId) return;
    
    try {
      await MembersAPI.deleteRoutine(selectedMemberId, routineToDelete.id);
      await loadData();
      setToast({ message: `¡Rutina "${routineToDelete.name}" eliminada correctamente!`, type: 'success' });
      
      // If we were editing this routine, reset the form
      if (editingRoutineId === routineToDelete.id) {
        resetForm();
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Error deleting routine:', error);
      setToast({ message: 'Error al eliminar rutina', type: 'error' });
    }
    
    setShowDeleteModal(false);
    setRoutineToDelete(null);
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-brand-gold" />
                Gestor de Rutinas
            </h2>
            <p className="text-gray-400 text-sm">
                {editingRoutineId ? 'Editando rutina existente...' : 'Asignación manual de ejercicios y planes de entrenamiento.'}
            </p>
        </div>
        <div className="flex gap-2">
            {editingRoutineId && (
                 <button 
                 onClick={attemptResetForm}
                 className="bg-gray-700 text-white px-4 py-2 rounded font-bold hover:bg-gray-600 flex items-center gap-2"
             >
                 <RotateCcw size={18} /> Cancelar / Nueva
             </button>
            )}
            <button 
                onClick={handleSaveRoutine}
                className="bg-brand-gold text-black px-6 py-2 rounded font-bold hover:bg-yellow-500 flex items-center gap-2"
            >
                <Save size={20} /> {editingRoutineId ? 'Actualizar Rutina' : 'Guardar Rutina'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        
        {/* LEFT COLUMN: Config & Day Selector */}
        <div className="lg:col-span-3 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 overflow-y-auto flex flex-col gap-6">
            
            {/* Socio & Config */}
            <div>
                <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs border-b border-gray-700 pb-2">Configuración</h3>
                <div className="space-y-4">
                    <div className="relative" ref={memberSearchRef}>
                        <label className="text-gray-400 text-xs block mb-1">Socio</label>
                        <input
                          type="text"
                          placeholder="Buscar socio..."
                          value={memberSearchText}
                          onChange={(e) => {
                            setMemberSearchText(e.target.value);
                            setShowMemberDropdown(true);
                          }}
                          onFocus={() => setShowMemberDropdown(true)}
                          disabled={!!editingRoutineId}
                          className="w-full bg-black border border-gray-700 text-white p-2 rounded text-sm focus:border-brand-gold focus:outline-none disabled:opacity-50"
                        />
                        {showMemberDropdown && filteredMembers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-700 rounded z-40 max-h-48 overflow-y-auto">
                            {filteredMembers.map(member => (
                              <button
                                key={member.id}
                                onClick={() => {
                                  setSelectedMemberId(member.id);
                                  setMemberSearchText(`${member.firstName} ${member.lastName}`);
                                  setShowMemberDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-white text-sm border-b border-gray-800 last:border-0 transition flex justify-between items-center"
                              >
                                <span>{member.firstName} {member.lastName}</span>
                                {selectedMemberId === member.id && (
                                  <Check size={16} className="text-brand-gold" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        {showMemberDropdown && memberSearchText.trim() && filteredMembers.length === 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-700 rounded p-2 text-center text-gray-400 text-sm">
                            No se encontraron socios
                          </div>
                        )}
                    </div>
                    <div>
                        <label className="text-gray-400 text-xs block mb-1">Nombre Rutina</label>
                        <input 
                            type="text" placeholder="Ej: Hipertrofia Fase 1"
                            value={routineName}
                            onChange={e => { setRoutineName(e.target.value); setIsDirty(true); }}
                            className="w-full bg-black border border-gray-700 text-white p-2 rounded text-sm focus:border-brand-gold focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 text-xs block mb-1">Objetivo</label>
                        <select 
                            value={routineGoal}
                            onChange={e => { setRoutineGoal(e.target.value); setIsDirty(true); }}
                            className="w-full bg-black border border-gray-700 text-white p-2 rounded text-sm focus:border-brand-gold focus:outline-none"
                        >
                            <option>Hipertrofia</option>
                            <option>Fuerza</option>
                            <option>Pérdida de Peso</option>
                            <option>Resistencia</option>
                            <option>Adaptación</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Existing Routines List */}
            {selectedMember && selectedMember.routines.length > 0 && (
                <div className="flex-1 overflow-y-auto min-h-[150px]">
                    <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-xs border-b border-gray-700 pb-2">
                        Rutinas de {selectedMember.firstName}
                    </h3>
                    <div className="space-y-2">
                        {selectedMember.routines.slice().reverse().map(routine => (
                            <div 
                                key={routine.id} 
                                className={`p-3 rounded border flex justify-between items-center transition-all cursor-pointer
                                    ${editingRoutineId === routine.id 
                                        ? 'bg-brand-gold/10 border-brand-gold' 
                                        : 'bg-black border-gray-800 hover:border-gray-600'}`}
                            >
                                <div className="overflow-hidden flex-1">
                                    <p className={`text-sm font-bold truncate ${editingRoutineId === routine.id ? 'text-brand-gold' : 'text-gray-300'}`}>
                                        {routine.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{new Date(routine.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => loadRoutineForEditing(routine)}
                                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                                        title="Editar Rutina"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-700"
                                        title="Eliminar Rutina"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Days Config */}
            <div>
                <div className="flex justify-between items-center mb-2 border-t border-gray-700 pt-4">
                    <h3 className="font-bold text-white uppercase tracking-wider text-xs">Días de Entrenamiento</h3>
                    <button onClick={handleAddDay} className="text-brand-gold hover:text-white">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {routineDays.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => attemptChangeDay(idx)}
                            className={`w-full text-left p-3 rounded flex justify-between items-center transition-colors
                                ${activeDayIndex === idx ? 'bg-brand-gold text-black font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <span>{day.dayName}</span>
                            <span className="text-xs opacity-70">{day.exercises.length} Ej.</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* MIDDLE COLUMN: Exercise Builder */}
        <div className="lg:col-span-5 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 flex flex-col max-h-[calc(100vh-140px)] overflow-y-auto">
            <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">
                Editando: <span className="text-brand-gold">{routineDays[activeDayIndex].dayName}</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                {routineDays[activeDayIndex].exercises.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-lg p-6">
                        <Dumbbell size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">No hay ejercicios en este día.</p>
                    </div>
                ) : (
                    routineDays[activeDayIndex].exercises.map((ex) => (
                        <div key={ex.id} className="bg-black/50 p-3 rounded border border-gray-800 flex justify-between items-start group">
                            <div>
                                <h4 className="font-bold text-gray-200">{ex.name}</h4>
                                <div className="text-xs text-gray-400 mt-1 flex gap-3">
                                    <span><span className="text-brand-gold">{ex.series}</span> Series</span>
                                    <span><span className="text-brand-gold">{ex.reps}</span> Reps</span>
                                    <span><span className="text-brand-gold">{ex.weight}</span> Carga</span>
                                </div>
                                {ex.notes && <p className="text-xs text-gray-500 italic mt-1">{ex.notes}</p>}
                            </div>
                            <button 
                                onClick={() => handleRemoveExercise(activeDayIndex, ex.id)}
                                className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Exercise Form */}
            <div className="bg-black/40 p-4 rounded-lg border border-gray-700 mt-auto relative z-10">
                <form onSubmit={handleAddExerciseToDay}>
                    <div className="mb-3" ref={dropdownRef}>
                        <label className="text-gray-400 text-xs block mb-1">Buscar Ejercicio</label>
                        <div className="relative">
                            <input 
                                type="text"
                                value={exerciseSearch}
                                onFocus={() => setIsDropdownOpen(true)}
                                onChange={(e) => {
                                    setExerciseSearch(e.target.value);
                                    setIsDropdownOpen(true);
                                    if(selectedExerciseId) setSelectedExerciseId(''); // Clear selection if user types
                                }}
                                placeholder="Escribe para buscar..."
                                className="w-full bg-[#111] border border-gray-600 text-white p-2 pl-9 rounded text-sm focus:border-brand-gold focus:outline-none"
                            />
                            <Search className="absolute left-2.5 top-2.5 text-gray-500" size={16} />
                            
                            {/* Autocomplete Dropdown */}
                            {isDropdownOpen && (
                              <div className="absolute bottom-full mb-1 left-0 w-full bg-[#222] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                {Object.keys(groupedExercises).length > 0 ? (
                                  Object.entries(groupedExercises).map(([category, exercises]) => (
                                    <div key={category}>
                                      <div className="bg-[#111] px-3 py-1 text-[10px] text-gray-500 uppercase font-bold tracking-wider sticky top-0">
                                        {category}
                                      </div>
                                      {(exercises as ExerciseMaster[]).map(ex => {
                                        // Deshabilitar si ya está en el día activo
                                        const isAdded = routineDays[activeDayIndex].exercises.some(e => e.name === ex.name);
                                        return (
                                          <button
                                            key={ex.id}
                                            type="button"
                                            onClick={() => !isAdded && selectExercise(ex)}
                                            className={`w-full text-left px-3 py-2 hover:bg-brand-gold hover:text-black text-sm transition-colors flex justify-between items-center ${isAdded ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-gray-200'}`}
                                            disabled={isAdded}
                                          >
                                            <span>{ex.name}</span>
                                            {selectedExerciseId === ex.id && <Check size={14} />}
                                            {isAdded && <span className="ml-2 text-xs text-brand-gold">Agregado</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-2 flex flex-col gap-2">
                                    <p className="text-xs text-gray-500 px-2 py-1">No se encontraron resultados.</p>
                                    <a
                                      href="/ExercisesAdmin"
                                      className="w-full text-left px-2 py-2 text-brand-gold hover:bg-[#333] rounded text-sm font-bold flex items-center gap-2 border border-brand-gold justify-center"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Gestionar ejercicios
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                            <label className="text-gray-400 text-xs block mb-1">Series</label>
                            <input 
                                required type="number" 
                                value={series} onChange={e => setSeries(e.target.value)}
                                className="w-full bg-[#111] border border-gray-600 text-white p-2 rounded text-sm text-center"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs block mb-1">Reps</label>
                            <input 
                                required type="text" 
                                value={reps} onChange={e => setReps(e.target.value)}
                                className="w-full bg-[#111] border border-gray-600 text-white p-2 rounded text-sm text-center"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs block mb-1">Peso/Nota</label>
                            <input 
                                type="text" placeholder="Ej: 20kg"
                                value={weight} onChange={e => setWeight(e.target.value)}
                                className="w-full bg-[#111] border border-gray-600 text-white p-2 rounded text-sm text-center"
                            />
                        </div>
                    </div>
                    <input 
                        type="text" placeholder="Observaciones técnicas (opcional)"
                        value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full bg-[#111] border border-gray-600 text-white p-2 rounded text-sm mb-3"
                    />

                    <button 
                        type="submit" 
                        disabled={!selectedExerciseId}
                        className="w-full bg-gray-700 hover:bg-white hover:text-black text-white font-bold py-2 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Agregar a la Rutina
                    </button>
                </form>
            </div>
        </div>

        {/* RIGHT COLUMN: Summary */}
        <div className="lg:col-span-4 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 overflow-y-auto">
             <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs border-b border-gray-700 pb-2">
                Resumen General
             </h3>
             <div className="space-y-6">
                {routineDays.map((day, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-gray-700">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${day.exercises.length > 0 ? 'bg-brand-gold' : 'bg-gray-600'}`}></div>
                        <h4 className="text-sm font-bold text-white mb-2">{day.dayName}</h4>
                        {day.exercises.length === 0 ? (
                            <p className="text-xs text-gray-500">Día de descanso o vacío.</p>
                        ) : (
                            <ul className="space-y-1">
                                {day.exercises.map(ex => (
                                    <li key={ex.id} className="text-xs text-gray-400 flex justify-between">
                                        <span>{ex.name}</span>
                                        <span>{ex.series}x{ex.reps}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Modal: New Master Exercise */}
        {/* Eliminado: Modal de creación rápida de ejercicio */}

      {/* Delete Routine Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => { setShowDeleteModal(false); setRoutineToDelete(null); }} />
          <div className="bg-[#111] max-w-md w-full rounded-lg border border-gray-700 p-6 z-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar rutina?</h3>
            <p className="text-sm text-gray-300 mb-4">
              ¿Estás seguro de que deseas eliminar la rutina "{routineToDelete?.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setRoutineToDelete(null); }} 
                className="px-4 py-2 text-sm text-gray-300 rounded border border-gray-700 hover:bg-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteRoutine} 
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
            {/* Unsaved changes modal */}
            {showUnsavedModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] max-w-md w-full rounded-lg border border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Tienes cambios sin guardar</h3>
                        <p className="text-sm text-gray-300 mb-4">Hay modificaciones en la rutina que no han sido guardadas. ¿Deseas descartarlas y continuar?</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setShowUnsavedModal(false); setPendingAction(null); }} className="px-4 py-2 text-sm text-gray-300 rounded border border-gray-700 cursor-pointer">Volver</button>
                            <button onClick={executePendingAction} className="px-4 py-2 bg-red-600 text-white rounded text-sm cursor-pointer">Descartar y continuar</button>
                        </div>
                    </div>
                </div>
            )}
      
      {/* Toast Notification */}
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

export default Operations;