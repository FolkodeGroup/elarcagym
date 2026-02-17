import React, { useState, useEffect } from 'react';
import { MembersAPI, NutritionTemplatesAPI } from '../services/api';
import { Member } from '../types';
import { Search, Save, Coffee, Sun, Utensils, Moon, Apple, Check, AlertCircle, Plus, Trash2, X, Settings } from 'lucide-react';
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

    // Estados para la gestión de recomendaciones
    const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
    const [recommendationsTitle, setRecommendationsTitle] = useState('AYUDA E INDICACIONES GENERALES PARA LLEVAR TU DIETA CORRECTAMENTE');
    const [recommendationsContent, setRecommendationsContent] = useState('');
    const [recommendationsId, setRecommendationsId] = useState<string | null>(null);

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

    const loadRecommendations = async () => {
        try {
            const template = await NutritionTemplatesAPI.getActive();
            if (template) {
                setRecommendationsId(template.id);
                setRecommendationsTitle(template.title);
                setRecommendationsContent(template.content);
            } else {
                // Plantilla por defecto
                setRecommendationsContent(`OPCIONES DE INFUSIONES (no cuenta como ingesta de agua)
•CAFÉ TOSTADO (no torrado)
•TÉ (cualquier opción)
•MATE COCIDO
•MATE
•TERERÉ (puede ser con jugo clight)
•JUGO DE LIMÓN, MENTA Y GENGIBRE (Edulcorante, 200ml de agua, medio limón grande ó uno mediano. Menta y gengibre a gusto)

OPCIONES DE...
•VERDURAS MIXTAS
Zuccini, Morrón rojo, Zapallito, Calabaza, Zapallo, Hongos, chaucha, Hinojo, Espárrago, Col de Bruselas, Acelga, Espinaca, Morrón verde, Hoja de nabo, Col verde, Zuccini, lechuga, rúcula, pepino, apio, acelga, cebolla

•ENSALADA MIXTA
Repollo, Repollo colorado, coliflor, berenjena, tomate, cebolla, zanahoria, lechuga

CONDIMENTOS
•PARA LAS ENSALADAS: vinagre, pimienta, ajo molido,pimentón, pimentón dulce, orégano, romero, albahaca, comino y aceto balsámico
•PARA LAS CARNES: Ajo molido, pimienta, pimentón dulce, comino, provenzal, orégano
•TORTA DE AVENA DULCE: Opcionales... Edulcorante, stevia, escencia de vainilla, 20grs de cacao amargo, 20grs de coco rallado, canela, rayadura de naranja, limón, etc. Cocinar a fuego lento en un horno o sartén que no se pegue (se puede agregar fritolin)
•TORTA DE AVENA SALADA: opcionales... 10grs de chía, sal rosa, 10grs de queso rallado, orégano. Cocinar a fuego lento en un horno o en una sartén.

IMPORTANTE
•La dieta es de lunes a lunes
•Los alimentos se pesan en crudo
•3 litros de agua por dia como mínimo
•Gelatina light a gusto (usálo siempre en caso de ansiedad)
•Jugos sin azúcar lo mínimo posible
•Gaseosas light lo mínimo posible
•Nada de alcohol
•El modo de cocción de la comidas es indistinto, puede ser a la plancha, al horno o hervido

HORARIOS
•Empezás siempre con la comida 1 y comés cada 3.30/4hs.
•Si te pasas de horario o te desacomodás en algún momento, no hay mayor problema, lo mas importante es que comas TODAS las comidas.`);
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    };

    const handleSaveRecommendations = async () => {
        try {
            if (recommendationsId) {
                await NutritionTemplatesAPI.update(recommendationsId, {
                    title: recommendationsTitle,
                    content: recommendationsContent,
                    isActive: true
                });
            } else {
                const newTemplate = await NutritionTemplatesAPI.create({
                    title: recommendationsTitle,
                    content: recommendationsContent,
                    isActive: true
                });
                setRecommendationsId(newTemplate.id);
            }
            setToast({ message: 'Recomendaciones guardadas exitosamente', type: 'success' });
            setShowRecommendationsModal(false);
        } catch (error) {
            console.error('Error saving recommendations:', error);
            setToast({ message: 'Error al guardar recomendaciones', type: 'error' });
        }
    };

    useEffect(() => {
        loadMembers();
        loadRecommendations();
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

    const filteredMembers = members.filter(m => {
        const term = searchMember?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
        const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const alternativeName = `${m.lastName ?? ''} ${m.firstName ?? ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return fullName.includes(term) || alternativeName.includes(term) || (m.dni && m.dni.includes(term));
    });

    const selectedMember = members.find(m => m.id === selectedMemberId);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                    <Apple className="text-green-500" /> Gestión Nutricional
                </h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowRecommendationsModal(true)}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
                    >
                        <Settings size={18} />
                        Configurar Recomendaciones
                    </button>
                    {selectedMember && (
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-400">Editando plan de:</p>
                            <p className="text-xl font-bold text-brand-gold">{selectedMember.firstName} {selectedMember.lastName}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Recomendaciones */}
            {showRecommendationsModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Settings className="text-brand-gold" />
                                Configurar Recomendaciones para PDF
                            </h3>
                            <button
                                onClick={() => setShowRecommendationsModal(false)}
                                className="text-gray-400 hover:text-white transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Título de la Sección</label>
                                    <input
                                        type="text"
                                        value={recommendationsTitle}
                                        onChange={(e) => setRecommendationsTitle(e.target.value)}
                                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-brand-gold focus:outline-none"
                                        placeholder="Título de las recomendaciones"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-sm text-gray-400 block mb-2">Contenido de las Recomendaciones</label>
                                    <p className="text-xs text-gray-500 mb-2">Estas recomendaciones se agregarán automáticamente al final de todos los PDFs de nutrición.</p>
                                    <textarea
                                        value={recommendationsContent}
                                        onChange={(e) => setRecommendationsContent(e.target.value)}
                                        className="w-full h-96 bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:border-brand-gold focus:outline-none font-mono"
                                        placeholder="Escribe aquí las recomendaciones..."
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowRecommendationsModal(false)}
                                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveRecommendations}
                                className="px-6 py-2 bg-brand-gold hover:bg-yellow-500 text-black font-bold rounded-lg transition"
                            >
                                Guardar Recomendaciones
                            </button>
                        </div>
                    </div>
                </div>
            )}

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