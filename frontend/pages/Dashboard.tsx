import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Member, UserStatus } from '../types';
import { Users, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);

  useEffect(() => {
    const allMembers = db.getMembers();
    setMembers(allMembers);
    const total = db.getInventory().reduce((acc, curr) => acc, 0); // Simplified check
    // In real app, calculate real sales today
  }, []);

  const activeMembers = members.filter(m => m.status === UserStatus.ACTIVE).length;
  const debtors = members.filter(m => m.status === UserStatus.DEBTOR).length;

  const data = [
    { name: 'Activos', value: activeMembers, color: '#4ade80' },
    { name: 'Morosos', value: debtors, color: '#ef4444' },
    { name: 'Inactivos', value: members.length - activeMembers - debtors, color: '#9ca3af' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Socios Totales" 
          value={members.length} 
          icon={Users} 
          trend="+5% mes pasado" 
        />
        <StatCard 
          title="Activos" 
          value={activeMembers} 
          icon={TrendingUp} 
          color="text-green-500" 
        />
        <StatCard 
          title="Morosos" 
          value={debtors} 
          icon={AlertCircle} 
          color="text-red-500" 
          bg="bg-red-500/10"
        />
        <StatCard 
          title="Ingresos (Hoy)" 
          value={`$0`} 
          icon={DollarSign} 
          color="text-brand-gold" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-display font-bold text-white mb-6">Estado de la Membresía</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                  cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Recent */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <h3 className="text-lg font-display font-bold text-white mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
             <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition">
                Registrar Asistencia
             </button>
             <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition">
                Nueva Venta
             </button>
             <div className="pt-4 mt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">RECORDATORIOS</p>
                <div className="text-sm text-gray-300 bg-black/40 p-3 rounded border-l-2 border-brand-gold">
                   Revisar stock de proteínas.
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color = "text-white", bg, trend }: any) => (
  <div className={`bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 hover:border-brand-gold/50 transition-colors ${bg}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">{title}</p>
        <h3 className="text-3xl font-display font-bold text-white">{value}</h3>
        {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg bg-black ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default Dashboard;