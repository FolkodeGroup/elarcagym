import React, { useState, useEffect } from 'react';
import { MembersAPI } from '../services/api';
import { Member } from '../types';
import { Search, Save, Coffee, Sun, Utensils, Moon, Apple, Check, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import Toast from '../components/Toast';
import { useNavigation } from '../contexts/NavigationContext';

const Nutrition: React.FC = () => {
    // Estados de datos
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [searchMember, setSearchMember] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Estados de control de cambios
    const [isDirty, setIsDirty] = useState(false);
    const { setCanNavigate } = useNavigation();

    // Formulario de Nutrición (Arrays de strings)
    const [plan, setPlan] = useState({
        breakfast: [] as string[],
        morningSnack: [] as string[],
        lunch: [] as string[],
        afternoonSnack: [] as string[],
        dinner: [] as string[],
        supplements: [] as string[],
        notes: '',
        calories: ''
    });

    const loadMembers = async () => {
        try {
            setIsLoading(true);
            const data = await MembersAPI.list();
            setMembers(data);
        } catch (error) {
            console.error('Error loading members:', error);
            setToast({ message: 'Error al cargar socios', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, []);

    useEffect(() => {
        setCanNavigate(!isDirty);
    }, [isDirty, setCanNavigate]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Cargar datos
    useEffect(() => {
        if (selectedMemberId) {
            const member = members.find(m => m.id === selectedMemberId);
            if (member && member.nutritionPlan) {
                setPlan({
                    breakfast: member.nutritionPlan.breakfast || [],
                    morningSnack: member.nutritionPlan.morningSnack || [],
                    lunch: member.nutritionPlan.lunch || [],
                    afternoonSnack: member.nutritionPlan.afternoonSnack || [],
                    dinner: member.nutritionPlan.dinner || [],
                    supplements: member.nutritionPlan.supplements || [],
                    notes: member.nutritionPlan.notes || '',
                    calories: member.nutritionPlan.calories || ''
                });
            } else {
                setPlan({ breakfast: [], morningSnack: [], lunch: [], afternoonSnack: [], dinner: [], supplements: [], notes: '', calories: '' });
            }
            setIsDirty(false);
        }
    }, [selectedMemberId, members]);

    const handleMemberSelect = (memberId: string, memberName: string) => {
        if (isDirty) {
            const confirm = window.confirm("Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de socio?");
            if (!confirm) return;
        }
        setSelectedMemberId(memberId);
        setSearchMember(memberName);
        setShowSearchDropdown(false);
        setIsDirty(false);
    };

    const handleSave = async () => {
        if (!selectedMemberId) {
            setToast({ message: 'Por favor selecciona un socio primero.', type: 'error' });
            return;
        }
        try {
            await MembersAPI.updateNutritionPlan(selectedMemberId, plan);
            setToast({ message: 'Plan nutricional guardado exitosamente.', type: 'success' });
            await loadMembers();
            setIsDirty(false);
        } catch (error) {
            console.error('Error saving nutrition plan:', error);
            setToast({ message: 'Error al guardar.', type: 'error' });
        }
    };

    // Funciones para manipular los items de las listas
    const addItem = (meal: keyof typeof plan, item: string) => {
        if (!item.trim()) return;
        const currentList = plan[meal] as string[];
        setPlan(prev => ({ ...prev, [meal]: [...currentList, item] }));
        setIsDirty(true);
    };

    const removeItem = (meal: keyof typeof plan, index: number) => {
        const currentList = plan[meal] as string[];
        const newList = currentList.filter((_, i) => i !== index);
        setPlan(prev => ({ ...prev, [meal]: newList }));
        setIsDirty(true);
    };

    const filteredMembers = members.filter(m => 
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchMember.toLowerCase()) ||
        (m.dni && m.dni.includes(searchMember))
    );

    const selectedMember = members.find(m => m.id === selectedMemberId);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                    <Apple className="text-green-500" /> Gestión Nutricional
                </h2>
                {selectedMember && (
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Editando plan de:</p>
                        <p className="text-xl font-bold text-brand-gold">{selectedMember.firstName} {selectedMember.lastName}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="lg:col-span-3 space-y-4 h-full flex flex-col">
                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 relative z-20">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-gray-400 uppercase font-bold block">Seleccionar Socio</label>
                            {isDirty && <span className="text-[10px] text-amber-500 flex items-center gap-1"><AlertCircle size={10}/> Sin guardar</span>}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className="w-full bg-black border border-gray-700 rounded-lg py-2.5 pl-10 text-white focus:border-brand-gold focus:outline-none"
                                value={searchMember}
                                onChange={(e) => { setSearchMember(e.target.value); setShowSearchDropdown(true); }}
                                onFocus={() => setShowSearchDropdown(true)}
                            />
                            {showSearchDropdown && searchMember.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-[#222] border border-gray-700 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                                    {filteredMembers.map(m => (
                                        <button 
                                            key={m.id}
                                            onClick={() => handleMemberSelect(m.id, `${m.firstName} ${m.lastName}`)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-800 border-b border-gray-700 last:border-0 flex items-center gap-3"
                                        >
                                            <span className="inline-block w-8 h-8 rounded-full overflow-hidden bg-gray-700 border border-gray-600 flex-shrink-0">
                                                {m.photoUrl ? (
                                                    <img src={m.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="flex items-center justify-center w-full h-full text-2xl">🥗</span>
                                                )}
                                            </span>
                                            <span className="text-gray-200">{m.firstName} {m.lastName}</span>
                                            {selectedMemberId === m.id && <Check size={14} className="text-brand-gold ml-auto"/>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedMember && (
                        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 flex-1 flex flex-col">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-3 overflow-hidden border-2 border-brand-gold">
                                    {selectedMember.photoUrl ? (
                                        <img src={selectedMember.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">🥗</div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-white">{selectedMember.firstName}</h3>
                                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded mt-1 inline-block">
                                    {selectedMember.phase ? selectedMember.phase.toUpperCase() : 'GENERAL'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase block mb-1">Objetivo Calórico (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={plan.calories}
                                        onChange={(e) => { setPlan(prev => ({...prev, calories: e.target.value})); setIsDirty(true); }}
                                        placeholder="Ej: 2500 kcal"
                                        className="w-full bg-black border border-gray-700 rounded p-2 text-brand-gold font-mono text-center"
                                    />
                                </div>
                                
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 uppercase block mb-1">Notas</label>
                                    <textarea 
                                        value={plan.notes}
                                        onChange={(e) => { setPlan(prev => ({...prev, notes: e.target.value})); setIsDirty(true); }}
                                        placeholder="Notas generales..."
                                        className="w-full h-32 bg-black border border-gray-700 rounded p-3 text-sm text-gray-300 resize-none"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSave}
                                className={`w-full font-bold py-3 rounded-lg transition mt-auto flex items-center justify-center gap-2 ${
                                    isDirty 
                                    ? 'bg-brand-gold text-black hover:bg-yellow-500 shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <Save size={18} /> {isDirty ? 'GUARDAR CAMBIOS' : 'GUARDADO'}
                            </button>
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: Las 5 Comidas */}
                <div className="lg:col-span-9 h-full overflow-y-auto pr-2 custom-scrollbar">
                    {!selectedMember ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                            <Apple size={64} className="mb-4 opacity-20" />
                            <p>Selecciona un socio para comenzar a editar su nutrición.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 pb-10">
                            <MealListEditor 
                                title="Desayuno" 
                                icon={<Coffee className="text-orange-400" />} 
                                items={plan.breakfast}
                                onAdd={(item) => addItem('breakfast', item)}
                                onRemove={(idx) => removeItem('breakfast', idx)}
                                placeholder="Ej: 3 Huevos, Tostada..."
                            />

                            <MealListEditor 
                                title="Media Mañana" 
                                icon={<Sun className="text-yellow-400" />} 
                                items={plan.morningSnack}
                                onAdd={(item) => addItem('morningSnack', item)}
                                onRemove={(idx) => removeItem('morningSnack', idx)}
                                placeholder="Ej: Manzana, Frutos secos..."
                            />

                            <MealListEditor 
                                title="Almuerzo" 
                                icon={<Utensils className="text-red-400" />} 
                                items={plan.lunch}
                                onAdd={(item) => addItem('lunch', item)}
                                onRemove={(idx) => removeItem('lunch', idx)}
                                placeholder="Ej: Pollo, Arroz, Ensalada..."
                            />

                            <MealListEditor 
                                title="Merienda / Pre-Entreno" 
                                icon={<Coffee className="text-amber-600" />} 
                                items={plan.afternoonSnack}
                                onAdd={(item) => addItem('afternoonSnack', item)}
                                onRemove={(idx) => removeItem('afternoonSnack', idx)}
                                placeholder="Ej: Yogur, Banana..."
                            />

                            <MealListEditor 
                                title="Cena" 
                                icon={<Moon className="text-blue-400" />} 
                                items={plan.dinner}
                                onAdd={(item) => addItem('dinner', item)}
                                onRemove={(idx) => removeItem('dinner', idx)}
                                placeholder="Ej: Pescado, Vegetales..."
                            />

                            {/* Sección de Suplementación */}
                            <MealListEditor
                                title="Suplementación"
                                icon={<Apple className="text-green-500" />}
                                items={plan.supplements}
                                onAdd={(item) => addItem('supplements', item)}
                                onRemove={(idx) => removeItem('supplements', idx)}
                                placeholder="Ej: Creatina, Multivitamínico..."
                            />
                        </div>
                    )}
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

// Componente para editar listas de comida
const MealListEditor = ({ title, icon, items, onAdd, onRemove, placeholder }: { 
    title: string, icon: any, items: string[], onAdd: (val: string) => void, onRemove: (idx: number) => void, placeholder: string 
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        if(inputValue.trim()) {
            onAdd(inputValue);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition duration-300">
            <div className="bg-black/40 p-3 flex items-center gap-3 border-b border-gray-800">
                <div className="p-2 bg-gray-900 rounded-lg">
                    {icon}
                </div>
                <span className="font-bold text-white tracking-wide">{title}</span>
                <span className="ml-auto text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded-full">{items.length} items</span>
            </div>
            
            <div className="p-4">
                {items.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-800/30 px-3 py-2 rounded-lg group hover:bg-gray-800/60 transition">
                                <span className="text-gray-200 text-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-brand-gold rounded-full"></span>
                                    {item}
                                </span>
                                <button 
                                    onClick={() => onRemove(idx)}
                                    className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-600 text-sm italic mb-4">Sin alimentos asignados...</p>
                )}

                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-brand-gold focus:outline-none"
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!inputValue.trim()}
                        className="bg-gray-800 hover:bg-brand-gold hover:text-black text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Nutrition;