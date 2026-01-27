import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member } from '../types';
import { Plus, Trash2, Edit2, X, Search, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import Toast from '../components/Toast';

const Biometrics: React.FC = () => {
    // ========== STATE DECLARATIONS ==========
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [searchMember, setSearchMember] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Form Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [formDate, setFormDate] = useState('');
    const [formData, setFormData] = useState({
        weight: '', chest: '', waist: '', abdomen: '', glutes: '',
        rightThigh: '', leftThigh: '',
        rightCalf: '', leftCalf: '',
        rightArm: '', leftArm: '',
        neck: ''
    });

    // Objective Edit State
    const [isEditingObjective, setIsEditingObjective] = useState(false);
    const [objectiveText, setObjectiveText] = useState('');

    const { setCanNavigate } = useNavigation();

    // ========== DERIVED STATES ==========
    const selectedMember = members.find(m => m.id === selectedMemberId);

    // Sort logs by date ascending (oldest first -> newest last)
    const sortedLogs = selectedMember?.biometrics 
        ? [...selectedMember.biometrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    // Filter logic for search (Name, Lastname, DNI)
    const filteredSearch = members.filter(m => {
        const term = searchMember.toLowerCase();
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        const dni = m.dni || '';
        return fullName.includes(term) || dni.includes(term);
    });

    // ========== EFFECTS ==========
    useEffect(() => {
        const list = db.getMembers();
        setMembers(list);
    }, []);

    useEffect(() => {
        if(selectedMember) {
            setObjectiveText(selectedMember.bioObjective || '');
        }
    }, [selectedMemberId, selectedMember]);

    // ========== HANDLERS ==========
    
    const handleOpenModal = (logId?: string) => {
        if (logId && selectedMember) {
            const log = selectedMember.biometrics.find(b => b.id === logId);
            if (log) {
                setEditingLogId(logId);
                setFormDate(log.date);
                setFormData({
                    weight: log.weight?.toString() || '',
                    chest: log.chest?.toString() || '',
                    waist: log.waist?.toString() || '',
                    abdomen: log.abdomen?.toString() || '',
                    glutes: log.glutes?.toString() || '',
                    rightThigh: log.rightThigh?.toString() || '',
                    leftThigh: log.leftThigh?.toString() || '',
                    rightCalf: log.rightCalf?.toString() || '',
                    leftCalf: log.leftCalf?.toString() || '',
                    rightArm: log.rightArm?.toString() || '',
                    leftArm: log.leftArm?.toString() || '',
                    neck: log.neck?.toString() || ''
                });
            }
        } else {
            // New Entry
            setEditingLogId(null);
            // Por defecto hoy, pero el usuario puede cambiarlo en el input
            setFormDate(new Date().toISOString().split('T')[0]); 
            setFormData({
                weight: '', chest: '', waist: '', abdomen: '', glutes: '',
                rightThigh: '', leftThigh: '', rightCalf: '', leftCalf: '',
                rightArm: '', leftArm: '', neck: ''
            });
        }
        setShowModal(true);
    };

    const handleSaveLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId) return;

        const dataToSave: any = {
            date: formDate,
            weight: Number(formData.weight) || 0,
            chest: Number(formData.chest) || 0,
            waist: Number(formData.waist) || 0,
            abdomen: Number(formData.abdomen) || 0,
            glutes: Number(formData.glutes) || 0,
            rightThigh: Number(formData.rightThigh) || 0,
            leftThigh: Number(formData.leftThigh) || 0,
            rightCalf: Number(formData.rightCalf) || 0,
            leftCalf: Number(formData.leftCalf) || 0,
            rightArm: Number(formData.rightArm) || 0,
            leftArm: Number(formData.leftArm) || 0,
            neck: Number(formData.neck) || 0,
        };

        if (editingLogId) {
            db.updateBiometric(selectedMemberId, { id: editingLogId, ...dataToSave });
            setToast({ message: 'Control actualizado.', type: 'success' });
        } else {
            db.addBiometric(selectedMemberId, dataToSave);
            setToast({ message: 'Nuevo control registrado.', type: 'success' });
        }

        setMembers([...db.getMembers()]);
        setShowModal(false);
    };

    const handleDeleteLog = (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
        if (selectedMemberId) {
            db.deleteBiometric(selectedMemberId, id);
            setMembers([...db.getMembers()]);
            setToast({ message: 'Registro eliminado.', type: 'info' });
        }
    };

    const handleSaveObjective = () => {
        if (selectedMemberId) {
            db.updateMember(selectedMemberId, { bioObjective: objectiveText });
            setToast({ message: 'Objetivo actualizado.', type: 'success' });
            setIsEditingObjective(false);
            setMembers([...db.getMembers()]);
        }
    };

    // Helper: Formato de fecha corto (ej: "27 ENE")
    const formatDateHeader = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        const day = d.toLocaleDateString('es-ES', { day: 'numeric' });
        const month = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
        return (
            <div className="flex flex-col leading-tight">
                <span className="text-xs text-gray-500 font-normal">{day}</span>
                <span className="text-sm font-bold text-brand-gold">{month}</span>
            </div>
        );
    };

    // ========== RENDER ==========
    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header / Member Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white">Seguimiento Biométrico</h2>
                    <p className="text-gray-400 text-sm">Control de medidas y evolución física</p>
                </div>
                
                <div className="relative w-full md:w-80">
                     <div className="flex items-center bg-black border border-gray-700 rounded-lg px-3 py-2 focus-within:border-brand-gold transition-colors">
                        <Search size={18} className="text-gray-500 mr-2" />
                        <input
                            type="text"
                            placeholder="Buscar socio por nombre o DNI..."
                            value={searchMember}
                            onChange={(e) => setSearchMember(e.target.value)}
                            className="bg-transparent text-white text-sm outline-none w-full"
                        />
                     </div>
                    
                    {searchMember && (
                        <div className="absolute top-full left-0 w-full bg-[#222] border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto z-50 shadow-xl">
                            {filteredSearch.length > 0 ? filteredSearch.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => { setSelectedMemberId(m.id); setSearchMember(''); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-800 text-gray-200 text-sm border-b border-gray-800 last:border-0 flex justify-between items-center"
                                >
                                    <span>{m.firstName} {m.lastName}</span>
                                    {m.dni && <span className="text-xs text-gray-500">{m.dni}</span>}
                                </button>
                            )) : (
                                <div className="p-4 text-gray-500 text-sm text-center">No se encontraron socios</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedMember ? (
                <div className="flex-1 bg-[#1a1a1a] p-1 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
                    {/* Member Info & Actions */}
                    <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                                {selectedMember.photoUrl ? (
                                    <img src={selectedMember.photoUrl} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-brand-gold uppercase">{selectedMember.firstName} {selectedMember.lastName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-gray-400 text-xs uppercase font-bold">Objetivo:</span>
                                    {isEditingObjective ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                value={objectiveText} 
                                                onChange={e => setObjectiveText(e.target.value)}
                                                className="bg-black border border-gray-600 text-white px-2 py-0.5 rounded text-xs focus:border-brand-gold outline-none"
                                                autoFocus
                                            />
                                            <button onClick={handleSaveObjective} className="text-green-500 hover:text-green-400"><Plus size={14}/></button>
                                        </div>
                                    ) : (
                                        <span 
                                            className="text-white text-xs cursor-pointer hover:text-brand-gold flex items-center gap-1 border-b border-dashed border-gray-600 hover:border-brand-gold pb-0.5"
                                            onClick={() => setIsEditingObjective(true)}
                                        >
                                            {selectedMember.bioObjective || "Definir objetivo..."} <Edit2 size={10} className="text-gray-500"/>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleOpenModal()} 
                            className="bg-brand-gold text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-500 flex items-center gap-2 shadow-lg shadow-yellow-900/10"
                        >
                            <Plus size={18} /> Nuevo Control
                        </button>
                    </div>

                    {/* THE GRID / TABLE (SCROLLABLE) */}
                    <div className="flex-1 overflow-hidden p-4 relative">
                        {/* Wrapper for scrolling */}
                        <div className="w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar border border-gray-700 rounded-lg bg-black">
                            <table className="w-full text-sm border-collapse min-w-max">
                                <thead className="bg-[#151515] sticky top-0 z-20 shadow-md">
                                    <tr>
                                        {/* Sticky First Column Header */}
                                        <th className="px-4 py-3 text-left text-gray-400 font-bold sticky left-0 z-30 bg-[#151515] border-r border-b border-gray-800 min-w-[150px] uppercase tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                                            Medida
                                        </th>
                                        {/* Date Columns */}
                                        {sortedLogs.map(log => (
                                            <th key={log.id} className="px-2 py-2 text-center border-r border-b border-gray-800 relative group min-w-[100px]">
                                                {formatDateHeader(log.date)}
                                                <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-black/90 rounded px-1 z-40 border border-gray-700">
                                                    <button onClick={() => handleOpenModal(log.id)} className="text-blue-400 hover:text-white p-1"><Edit2 size={10}/></button>
                                                    <button onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={10}/></button>
                                                </div>
                                            </th>
                                        ))}
                                        {/* Empty State placeholder in header */}
                                        {sortedLogs.length === 0 && <th className="px-6 py-4 text-gray-600 italic font-normal text-left">Sin registros aún</th>}
                                        
                                        {/* Spacer column */}
                                        <th className="w-full border-b border-gray-800 bg-[#111]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    <TableRow label="PESO" unit="kg" field="weight" logs={sortedLogs} highlight />
                                    <TableRow label="PECHO" unit="cm" field="chest" logs={sortedLogs} />
                                    <TableRow label="CINTURA" unit="cm" field="waist" logs={sortedLogs} />
                                    <TableRow label="ABD" unit="cm" field="abdomen" logs={sortedLogs} />
                                    <TableRow label="GLÚTEO" unit="cm" field="glutes" logs={sortedLogs} />
                                    <TableRow label="CD (Muslo Der)" unit="cm" field="rightThigh" logs={sortedLogs} />
                                    <TableRow label="Ci (Muslo Izq)" unit="cm" field="leftThigh" logs={sortedLogs} />
                                    <TableRow label="GD (Gemelo Der)" unit="cm" field="rightCalf" logs={sortedLogs} />
                                    <TableRow label="Gi (Gemelo Izq)" unit="cm" field="leftCalf" logs={sortedLogs} />
                                    <TableRow label="BD (Brazo Der)" unit="cm" field="rightArm" logs={sortedLogs} />
                                    <TableRow label="Bi (Brazo Izq)" unit="cm" field="leftArm" logs={sortedLogs} />
                                    <TableRow label="CUELLO" unit="cm" field="neck" logs={sortedLogs} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl bg-[#1a1a1a]/50">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg">Selecciona un socio para ver su planilla</p>
                    <p className="text-sm opacity-60">Utiliza el buscador superior</p>
                </div>
            )}

            {/* MODAL FORM */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#151515] p-6 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                            <h3 className="text-xl font-bold text-white">{editingLogId ? 'Editar Control' : 'Nuevo Control'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X/></button>
                        </div>

                        <form onSubmit={handleSaveLog} className="space-y-6">
                            {/* Date */}
                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs text-brand-gold mb-1 uppercase font-bold flex items-center gap-2">
                                        <Calendar size={12} /> Fecha del Control
                                    </label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
                                        // AQUI ESTÁ EL CAMBIO: [color-scheme:dark]
                                        className="w-full bg-black border border-gray-600 text-white px-3 py-2 rounded focus:border-brand-gold outline-none text-sm [color-scheme:dark]"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Puedes elegir fechas pasadas para cargar historial.</p>
                                </div>
                            </div>

                            {/* Grid of Inputs */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <InputGroup label="Peso (kg)" value={formData.weight} onChange={v => setFormData({...formData, weight: v})} required highlight />
                                <InputGroup label="Pecho (cm)" value={formData.chest} onChange={v => setFormData({...formData, chest: v})} />
                                <InputGroup label="Cintura (cm)" value={formData.waist} onChange={v => setFormData({...formData, waist: v})} />
                                <InputGroup label="Abdomen (cm)" value={formData.abdomen} onChange={v => setFormData({...formData, abdomen: v})} />
                                <InputGroup label="Glúteo (cm)" value={formData.glutes} onChange={v => setFormData({...formData, glutes: v})} />
                                <InputGroup label="Cuello (cm)" value={formData.neck} onChange={v => setFormData({...formData, neck: v})} />
                            </div>

                            <div className="border-t border-gray-800 pt-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest">Extremidades (cm)</h4>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <InputGroup label="Muslo Der (CD)" value={formData.rightThigh} onChange={v => setFormData({...formData, rightThigh: v})} />
                                    <InputGroup label="Muslo Izq (Ci)" value={formData.leftThigh} onChange={v => setFormData({...formData, leftThigh: v})} />
                                    
                                    <InputGroup label="Gemelo Der (GD)" value={formData.rightCalf} onChange={v => setFormData({...formData, rightCalf: v})} />
                                    <InputGroup label="Gemelo Izq (Gi)" value={formData.leftCalf} onChange={v => setFormData({...formData, leftCalf: v})} />
                                    
                                    <InputGroup label="Brazo Der (BD)" value={formData.rightArm} onChange={v => setFormData({...formData, rightArm: v})} />
                                    <InputGroup label="Brazo Izq (Bi)" value={formData.leftArm} onChange={v => setFormData({...formData, leftArm: v})} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-400 hover:text-white font-bold bg-gray-800 rounded-lg hover:bg-gray-700 transition">Cancelar</button>
                                <button type="submit" className="px-8 py-2 bg-brand-gold text-black rounded-lg font-bold hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/20">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

// Helper Components

const TableRow = ({ label, unit, field, logs, highlight }: { label: string, unit: string, field: keyof typeof logs[0], logs: any[], highlight?: boolean }) => (
    <tr className="hover:bg-gray-900/50 transition-colors group">
        {/* Sticky First Column */}
        <td className={`px-4 py-3 font-bold border-r border-gray-800 sticky left-0 z-10 bg-[#111] group-hover:bg-[#151515] shadow-[2px_0_5px_rgba(0,0,0,0.5)] ${highlight ? 'text-brand-gold' : 'text-gray-300'}`}>
            {label}
        </td>
        {/* Data Cells */}
        {logs.map(log => (
            <td key={log.id} className="px-2 py-3 text-center border-r border-gray-800 whitespace-nowrap min-w-[100px]">
                {log[field] && Number(log[field]) > 0 ? (
                    <div className="flex items-baseline justify-center gap-0.5">
                        <span className={`text-base font-medium ${highlight ? 'text-white' : 'text-gray-200'}`}>{log[field]}</span>
                        <span className="text-[10px] text-gray-600 font-normal">{unit}</span>
                    </div>
                ) : (
                    <span className="text-gray-800 text-xs">-</span>
                )}
            </td>
        ))}
        {/* Filler Cell */}
        <td className="w-full"></td>
    </tr>
);

const InputGroup = ({ label, value, onChange, required, highlight }: any) => (
    <div>
        <label className={`block text-[10px] mb-1 uppercase tracking-wider ${highlight ? 'text-brand-gold font-bold' : 'text-gray-500'}`}>{label}</label>
        <input 
            type="number"
            step="0.1"
            value={value}
            onChange={e => onChange(e.target.value)}
            className={`w-full bg-black border text-white px-3 py-2.5 rounded text-center focus:border-brand-gold outline-none transition ${highlight ? 'border-brand-gold/50 bg-brand-gold/5' : 'border-gray-700'}`}
            placeholder="-"
            required={required}
        />
    </div>
);

export default Biometrics;