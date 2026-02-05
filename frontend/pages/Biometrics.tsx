import React, { useState, useEffect } from 'react';
import { MembersAPI } from '../services/api';
import { Member, BiometricLog } from '../types';
import { Plus, Trash2, Edit2, X, Search } from 'lucide-react';
import Toast from '../components/Toast';

const Biometrics: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [searchMember, setSearchMember] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [formDate, setFormDate] = useState('');
    const [formData, setFormData] = useState({
        weight: '', height: '', chest: '', waist: '', abdomen: '', glutes: '',
        rightThigh: '', leftThigh: '', rightCalf: '', leftCalf: '',
        rightArm: '', leftArm: '', neck: ''
    });

    // ==========================================
    // LÓGICA DE CÁLCULO IMC Y CATEGORÍAS
    // ==========================================
    const calculateIMC = (weight: number, heightCm?: number) => {
        if (!weight || !heightCm || heightCm <= 0) return null;
        const heightM = heightCm / 100;
        const imc = weight / (heightM * heightM);
        return imc.toFixed(1);
    };

    const getIMCCategory = (imc: number) => {
        if (imc < 18.5) return { label: 'Bajo peso', color: 'text-blue-400' };
        if (imc < 25) return { label: 'Normal', color: 'text-green-400' };
        if (imc < 30) return { label: 'Sobrepeso', color: 'text-yellow-400' };
        return { label: 'Obesidad', color: 'text-red-400' };
    };

    const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return <span className="text-gray-500 text-xs">S/D</span>;

    const d = new Date(dateStr);

    if (isNaN(d.getTime())) {
        return (
            <div className="flex flex-col leading-tight text-center">
                <span className="text-xs text-red-500 font-normal">Error</span>
            </div>
        );
    }

    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());

    return (
        <div className="flex flex-col leading-tight text-center">
            <span className="text-xs text-gray-500 font-normal">{d.getDate()}</span>
            <span className="text-sm font-bold text-brand-gold">
                {d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '')}
            </span>
        </div>
    );
};

// Convierte una fecha (string) a formato YYYY-MM-DD adecuado para inputs type=date
// Evita el "desplazamiento" por zona horaria: si la fecha ya viene como YYYY-MM-DD la devuelve tal cual;
// si viene como datetime ISO usa la parte UTC (toISOString().split('T')[0]) para asegurar el día correcto.
const dateToInput = (dateStr: string) => {
    if (!dateStr) return '';
    // Si ya está en formato YYYY-MM-DD, devolver directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';

    // Usar la representación ISO (UTC) evita que el timezone local desplace el día hacia atrás
    return d.toISOString().split('T')[0];
};

    // ========== DERIVADOS ==========
    const selectedMember = members.find(m => m.id === selectedMemberId);
    const sortedLogs = selectedMember?.biometrics 
        ? [...selectedMember.biometrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    const filteredSearch = members.filter(m => {
        const term = searchMember.toLowerCase();
        return `${m.firstName} ${m.lastName}`.toLowerCase().includes(term) || (m.dni && m.dni?.includes(term));
    });

    const loadMembers = async () => {
        try {
            setIsLoading(true);
            const membersData = await MembersAPI.list();
            setMembers(membersData);
        } catch (error) {
            console.error('Error loading members:', error);
            setToast({ message: 'Error al cargar socios', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadMembers(); }, []);

    // ========== HANDLERS ==========
    const handleOpenModal = (logId?: string) => {
        if (logId && selectedMember) {
            const log = selectedMember.biometrics.find(b => b.id === logId);
            if (log) {
                setEditingLogId(logId);
                setFormDate(dateToInput(log.date));
                setFormData({
                    weight: log.weight?.toString() || '',
                    height: log.height?.toString() || '',
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
            setEditingLogId(null);
            setFormDate(new Date().toISOString().split('T')[0]); 
            setFormData({ weight: '', height: '', chest: '', waist: '', abdomen: '', glutes: '', rightThigh: '', leftThigh: '', rightCalf: '', leftCalf: '', rightArm: '', leftArm: '', neck: '' });
        }
        setShowModal(true);
    };

    const handleSaveLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberId) return;

        const dataToSave: any = {
            date: formDate,
            weight: Math.round(Number(formData.weight) || 0),
            height: Math.round(Number(formData.height) || 0),
            chest: Math.round(Number(formData.chest) || 0),
            waist: Math.round(Number(formData.waist) || 0),
            abdomen: Math.round(Number(formData.abdomen) || 0),
            glutes: Math.round(Number(formData.glutes) || 0),
            rightThigh: Math.round(Number(formData.rightThigh) || 0),
            leftThigh: Math.round(Number(formData.leftThigh) || 0),
            rightCalf: Math.round(Number(formData.rightCalf) || 0),
            leftCalf: Math.round(Number(formData.leftCalf) || 0),
            rightArm: Math.round(Number(formData.rightArm) || 0),
            leftArm: Math.round(Number(formData.leftArm) || 0),
            neck: Math.round(Number(formData.neck) || 0),
        };

        try {
            if (editingLogId) {
                await MembersAPI.updateBiometric(selectedMemberId, editingLogId, dataToSave);
            } else {
                await MembersAPI.addBiometric(selectedMemberId, dataToSave);
            }

            await loadMembers();
            setShowModal(false);
            setToast({ message: 'Registro guardado.', type: 'success' });
        } catch (error) {
            console.error('Error saving biometric:', error);
            setToast({ message: 'Error al guardar registro biométrico', type: 'error' });
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm("¿Eliminar registro?")) return;
        try {
            await MembersAPI.deleteBiometric(selectedMemberId, logId);
            await loadMembers();
            setToast({ message: 'Registro eliminado.', type: 'success' });
        } catch (error) {
            console.error('Error deleting biometric:', error);
            setToast({ message: 'Error al eliminar registro', type: 'error' });
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col p-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tighter">Seguimiento Biométrico</h2>
                <div className="relative w-full md:w-80">
                     <div className="flex items-center bg-black border border-gray-700 rounded-lg px-3 py-2 focus-within:border-brand-gold transition-all">
                        <Search size={18} className="text-gray-500 mr-2" />
                        <input type="text" placeholder="Buscar socio..." value={searchMember} onChange={(e) => setSearchMember(e.target.value)} className="bg-transparent text-white text-sm outline-none w-full" />
                     </div>
                    {searchMember && (
                        <div className="absolute top-full left-0 w-full bg-[#222] border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto z-50 shadow-2xl">
                            {filteredSearch.map(m => (
                                                                <button key={m.id} onClick={() => { setSelectedMemberId(m.id); setSearchMember(''); }} className="w-full text-left px-4 py-3 hover:bg-gray-800 text-gray-200 border-b border-gray-800 last:border-0 flex items-center gap-3">
                                                                    <span className="inline-block w-8 h-8 rounded-full overflow-hidden bg-gray-700 border border-gray-600 flex-shrink-0">
                                                                        {m.photoUrl ? (
                                                                            <img src={m.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="flex items-center justify-center w-full h-full text-2xl">🦁</span>
                                                                        )}
                                                                    </span>
                                                                    <span>{m.firstName} {m.lastName}</span>
                                                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedMember ? (
                <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
                        <h3 className="text-xl font-bold text-brand-gold uppercase tracking-widest">{selectedMember.firstName} {selectedMember.lastName}</h3>
                        <button onClick={() => handleOpenModal()} className="bg-brand-gold text-black px-6 py-2 rounded-lg font-black hover:bg-yellow-500 shadow-lg shadow-brand-gold/20 transition-all active:scale-95">Cargar Datos</button>
                    </div>

                    <div className="flex-1 overflow-hidden p-4">
                        <div className="w-full h-full overflow-x-auto overflow-y-auto custom-scrollbar border border-gray-700 rounded-lg bg-black">
                            <table className="w-full text-sm border-collapse min-w-max">
                                <thead className="bg-[#151515] sticky top-0 z-20 shadow-md">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-400 font-bold sticky left-0 z-30 bg-[#151515] border-r border-b border-gray-800 min-w-[150px] uppercase shadow-[2px_0_5px_rgba(0,0,0,0.5)]">Fecha</th>
                                        {sortedLogs.map(log => (
                                            <th key={log.id} className="px-2 py-2 text-center border-r border-b border-gray-800 relative group min-w-[100px]">
                                                {formatDateHeader(log.date)}
                                                <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-black/90 rounded px-1 z-40 border border-gray-700">
                                                    <button onClick={() => handleOpenModal(log.id)} className="text-blue-400 hover:text-white p-1"><Edit2 size={10}/></button>
                                                    <button onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={10}/></button>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="w-full border-b border-gray-800 bg-[#111]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {/* --- FILAS SEGÚN PLANILLA --- */}
                                    <TableRow label="PESO" unit="kg" field="weight" logs={sortedLogs} highlight />
                                    <TableRow label="ESTATURA" unit="cm" field="height" logs={sortedLogs} />
                                    
                                    {/* FILA ESPECIAL IMC */}
                                    <tr className="bg-brand-gold/10 hover:bg-brand-gold/20 transition-colors group">
                                        <td className="px-4 py-3 font-bold border-r border-gray-800 sticky left-0 z-10 bg-[#151515] text-brand-gold shadow-[2px_0_5px_rgba(0,0,0,0.5)] uppercase tracking-tighter">IMC (CÁLCULO)</td>
                                        {sortedLogs.map(log => {
                                            const imc = calculateIMC(log.weight, log.height);
                                            const cat = imc ? getIMCCategory(Number(imc)) : null;
                                            return (
                                                <td key={log.id} className="px-2 py-3 text-center border-r border-gray-800 whitespace-nowrap min-w-[100px]">
                                                    {imc ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-base font-bold text-white">{imc}</span>
                                                            <span className={`text-[8px] font-black uppercase ${cat?.color}`}>
                                                                {cat?.label}
                                                            </span>
                                                        </div>
                                                    ) : ( <span className="text-gray-800 text-xs">-</span> )}
                                                </td>
                                            );
                                        })}
                                        <td className="w-full"></td>
                                    </tr>

                                    <TableRow label="PECHO" unit="cm" field="chest" logs={sortedLogs} />
                                    <TableRow label="CINTURA" unit="cm" field="waist" logs={sortedLogs} />
                                    <TableRow label="ABD" unit="cm" field="abdomen" logs={sortedLogs} />
                                    <TableRow label="GLÚTEO" unit="cm" field="glutes" logs={sortedLogs} />
                                    <TableRow label="CD (Cuádriceps D)" unit="cm" field="rightThigh" logs={sortedLogs} />
                                    <TableRow label="Ci (Cuádriceps I)" unit="cm" field="leftThigh" logs={sortedLogs} />
                                    <TableRow label="GD (Gemelo D)" unit="cm" field="rightCalf" logs={sortedLogs} />
                                    <TableRow label="Gi (Gemelo I)" unit="cm" field="leftCalf" logs={sortedLogs} />
                                    <TableRow label="BD (Bíceps D)" unit="cm" field="rightArm" logs={sortedLogs} />
                                    <TableRow label="Bi (Bíceps I)" unit="cm" field="leftArm" logs={sortedLogs} />
                                    <TableRow label="CUELLO" unit="cm" field="neck" logs={sortedLogs} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl bg-[#1a1a1a]/50">
                    <p className="text-lg font-bold">Seleccioná un socio para ver su evolución</p>
                </div>
            )}

            {/* MODAL FORMULARIO */}
            {showModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="absolute inset-0 z-0" onClick={() => setShowModal(false)} />
                    <div className="relative z-10 bg-[#111] p-8 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Cargar Control Biométrico</h3>
                            <button onClick={() => setShowModal(false)} className="hover:text-red-500 transition-colors"><X size={32}/></button>
                        </div>
                        <form onSubmit={handleSaveLog} className="space-y-8">
                            {/* Fecha y Datos Clave */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/40 p-4 rounded-xl border border-gray-800">
                                <InputGroup label="Fecha Control" value={formDate} onChange={(v:any) => setFormDate(v)} type="date" />
                                <InputGroup label="Peso (kg)" value={formData.weight} onChange={(v:any) => setFormData({...formData, weight: v})} required highlight />
                                <InputGroup label="Estatura (cm)" value={formData.height} onChange={(v:any) => setFormData({...formData, height: v})} required highlight />
                            </div>

                            {/* Torso */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <InputGroup label="Pecho" value={formData.chest} onChange={(v:any) => setFormData({...formData, chest: v})} />
                                <InputGroup label="Cintura" value={formData.waist} onChange={(v:any) => setFormData({...formData, waist: v})} />
                                <InputGroup label="Abd" value={formData.abdomen} onChange={(v:any) => setFormData({...formData, abdomen: v})} />
                                <InputGroup label="Glúteo" value={formData.glutes} onChange={(v:any) => setFormData({...formData, glutes: v})} />
                                <InputGroup label="Cuello" value={formData.neck} onChange={(v:any) => setFormData({...formData, neck: v})} />
                            </div>

                            {/* Extremidades */}
                            <div className="border-t border-gray-800 pt-6">
                                <h4 className="text-xs font-black text-gray-500 uppercase mb-4 tracking-widest">Extremidades (cm)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <InputGroup label="CD (Muslo D)" value={formData.rightThigh} onChange={(v:any) => setFormData({...formData, rightThigh: v})} />
                                    <InputGroup label="Ci (Muslo I)" value={formData.leftThigh} onChange={(v:any) => setFormData({...formData, leftThigh: v})} />
                                    <InputGroup label="GD (Gemelo D)" value={formData.rightCalf} onChange={(v:any) => setFormData({...formData, rightCalf: v})} />
                                    <InputGroup label="Gi (Gemelo I)" value={formData.leftCalf} onChange={(v:any) => setFormData({...formData, leftCalf: v})} />
                                    <InputGroup label="BD (Brazo D)" value={formData.rightArm} onChange={(v:any) => setFormData({...formData, rightArm: v})} />
                                    <InputGroup label="Bi (Brazo I)" value={formData.leftArm} onChange={(v:any) => setFormData({...formData, leftArm: v})} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-8 border-t border-gray-800">
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 text-sm font-bold text-gray-400 bg-gray-900 rounded-xl hover:bg-gray-800 transition">CANCELAR</button>
                                <button type="submit" className="px-12 py-3 bg-brand-gold text-black rounded-xl text-sm font-black hover:bg-yellow-500 shadow-xl shadow-brand-gold/10 transition">GUARDAR CONTROL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

const TableRow = ({ label, unit, field, logs, highlight }: { label: string, unit: string, field: keyof BiometricLog, logs: any[], highlight?: boolean }) => (
    <tr className="hover:bg-gray-900/50 group transition-colors">
        <td className={`px-4 py-3 font-bold border-r border-gray-800 sticky left-0 z-10 bg-[#111] shadow-[2px_0_5px_rgba(0,0,0,0.5)] ${highlight ? 'text-brand-gold' : 'text-gray-400'}`}>{label}</td>
        {logs.map(log => (
            <td key={log.id} className="px-2 py-3 text-center border-r border-gray-800 whitespace-nowrap min-w-[100px]">
                {log[field] ? <div className="flex items-baseline justify-center gap-0.5"><span className="text-base font-medium text-white">{log[field]}</span><span className="text-[10px] text-gray-600 font-bold">{unit}</span></div> : "-"}
            </td>
        ))}
        <td className="w-full bg-[#111]"></td>
    </tr>
);

const InputGroup = ({ label, value, onChange, required, highlight, type = "number", integerOnly }: any) => {
    const isInteger = typeof integerOnly === 'boolean' ? integerOnly : (type === 'number');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value;
        if (isInteger) {
            // Remove any non-digit characters
            v = v.replace(/\D/g, '');
        }
        onChange(v);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isInteger) return;
        const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete', 'Home', 'End'];
        if (allowedKeys.includes(e.key)) return;
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (!isInteger) return;
        const text = (e.clipboardData || (window as any).clipboardData).getData('text');
        if (/\D/.test(text)) {
            e.preventDefault();
        }
    };

    return (
        <div>
            <label className={`block text-[10px] mb-1.5 uppercase font-black tracking-wider ${highlight ? 'text-brand-gold' : 'text-gray-500'}`}>{label}</label>
            <input
                type={type}
                step={isInteger ? "1" : "0.1"}
                inputMode={isInteger ? "numeric" : undefined}
                pattern={isInteger ? "\\d*" : undefined}
                min="0"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                required={required}
                className={`w-full bg-black border text-white px-3 py-3 rounded-xl text-sm font-bold focus:border-brand-gold outline-none transition-all ${highlight ? 'border-brand-gold/50 bg-brand-gold/5' : 'border-gray-800'}`}
                placeholder="-"
            />
        </div>
    );
};

export default Biometrics;