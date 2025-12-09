import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Scale, Ruler, Activity } from 'lucide-react';

const Biometrics: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [formData, setFormData] = useState({ weight: '', height: '', bodyFat: '' });

  useEffect(() => {
    const list = db.getMembers();
    setMembers(list);
    if(list.length > 0) setSelectedMemberId(list[0].id);
  }, []);

  const selectedMember = members.find(m => m.id === selectedMemberId);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    
    db.addBiometric(selectedMemberId, {
        weight: Number(formData.weight),
        height: Number(formData.height),
        bodyFat: Number(formData.bodyFat) || 0
    });
    
    // Refresh
    setMembers([...db.getMembers()]);
    setFormData({ weight: '', height: '', bodyFat: '' });
  };

  const chartData = selectedMember?.biometrics.map(b => ({
      fecha: new Date(b.date).toLocaleDateString(),
      peso: b.weight,
      grasa: b.bodyFat
  })) || [];

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold text-white">Seguimiento Biométrico</h2>
        <select 
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 text-white p-2 rounded-lg"
        >
            {members.map(m => (
                <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
            ))}
        </select>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 h-fit">
                <h3 className="text-lg font-bold text-white mb-4">Nuevo Control</h3>
                <form onSubmit={handleAddLog} className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm block mb-1">Peso (kg)</label>
                        <div className="relative">
                            <Scale className="absolute left-3 top-3 text-gray-500" size={18}/>
                            <input 
                                type="number" step="0.1" required
                                value={formData.weight}
                                onChange={e => setFormData({...formData, weight: e.target.value})}
                                className="w-full bg-black border border-gray-700 p-2 pl-10 rounded text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm block mb-1">Altura (cm)</label>
                        <div className="relative">
                            <Ruler className="absolute left-3 top-3 text-gray-500" size={18}/>
                            <input 
                                type="number" required
                                value={formData.height}
                                onChange={e => setFormData({...formData, height: e.target.value})}
                                className="w-full bg-black border border-gray-700 p-2 pl-10 rounded text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-gray-400 text-sm block mb-1">% Grasa Corporal</label>
                        <div className="relative">
                            <Activity className="absolute left-3 top-3 text-gray-500" size={18}/>
                            <input 
                                type="number" step="0.1"
                                value={formData.bodyFat}
                                onChange={e => setFormData({...formData, bodyFat: e.target.value})}
                                className="w-full bg-black border border-gray-700 p-2 pl-10 rounded text-white"
                            />
                        </div>
                    </div>
                    <button className="w-full bg-brand-gold text-black font-bold py-3 rounded hover:bg-yellow-500 transition">
                        Registrar Control
                    </button>
                </form>
            </div>

            {/* Charts */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-bold text-white mb-4">Evolución de Peso</h3>
                    <div className="h-64">
                         {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="fecha" stroke="#666" />
                                    <YAxis stroke="#666" domain={['dataMin - 5', 'dataMax + 5']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    <Line type="monotone" dataKey="peso" stroke="#D4AF37" strokeWidth={2} dot={{fill:'#D4AF37'}} activeDot={{r: 8}} />
                                </LineChart>
                            </ResponsiveContainer>
                         ) : (
                             <div className="h-full flex items-center justify-center text-gray-500">Sin datos registrados</div>
                         )}
                    </div>
                </div>

                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-bold text-white mb-4">Histórico</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead className="bg-black text-gray-500">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Peso</th>
                                    <th className="p-3">Altura</th>
                                    <th className="p-3">IMC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {selectedMember?.biometrics.slice().reverse().map(log => {
                                    const bmi = (log.weight / ((log.height/100) * (log.height/100))).toFixed(1);
                                    return (
                                        <tr key={log.id}>
                                            <td className="p-3">{new Date(log.date).toLocaleDateString()}</td>
                                            <td className="p-3">{log.weight} kg</td>
                                            <td className="p-3">{log.height} cm</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${Number(bmi) > 25 ? 'bg-orange-900 text-orange-200' : 'bg-green-900 text-green-200'}`}>
                                                    {bmi}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};

export default Biometrics;