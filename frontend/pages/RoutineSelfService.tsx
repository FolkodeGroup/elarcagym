import React, { useState } from 'react';
import { db } from '../services/db';
import { Member } from '../types';
import { Search, Dumbbell, ArrowLeft, CheckCircle } from 'lucide-react';

const RoutineSelfService: React.FC = () => {
  const [dni, setDni] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = db.getMemberByDNI(dni);
    if (found) {
      setMember(found);
      setError('');
    } else {
      setError('No se encontró ningún socio con ese DNI.');
      setMember(null);
    }
  };

  if (member) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6 animate-fadeIn min-h-screen bg-brand-dark text-white">
        <button onClick={() => setMember(null)} className="flex items-center gap-2 text-brand-gold py-6">
          <ArrowLeft size={20} /> <span className="font-bold uppercase tracking-widest text-xs">Volver a Buscar</span>
        </button>
        
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold"></div>
          <h2 className="text-3xl font-display font-bold text-white uppercase tracking-tighter">
            {member.firstName} {member.lastName}
          </h2>
          <p className="text-brand-gold text-xs font-black uppercase tracking-[0.3em] mt-2">Mi Plan de Entrenamiento</p>
        </div>

        <div className="space-y-6 pb-20">
          {member.routines && member.routines.length > 0 ? (
            member.routines.slice().reverse().map((routine) => (
              <div key={routine.id} className="bg-[#1a1a1a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="bg-brand-gold px-6 py-3">
                  <h3 className="text-black font-black text-sm uppercase tracking-tighter">{routine.name}</h3>
                </div>
                <div className="p-6 space-y-10">
                  {routine.days.map((day, idx) => (
                    <div key={idx} className="space-y-4">
                      <h4 className="text-brand-gold font-black border-b border-gray-800 pb-2 flex items-center gap-2 uppercase text-xs tracking-widest">
                        <CheckCircle size={16}/> {day.dayName}
                      </h4>
                      <div className="grid gap-4">
                        {day.exercises.map((ex) => (
                          <div key={ex.id} className="bg-black/40 p-5 rounded-2xl border border-gray-800 hover:border-brand-gold/30 transition-all shadow-inner">
                            <p className="text-white font-bold text-lg leading-tight">{ex.name}</p>
                            <div className="flex gap-4 text-[10px] mt-3 uppercase font-black tracking-widest">
                              <span className="text-gray-500">Sets: <b className="text-white text-base font-display">{ex.series}</b></span>
                              <span className="text-gray-500">Reps: <b className="text-white text-base font-display">{ex.reps}</b></span>
                              <span className="text-gray-500">Peso: <b className="text-brand-gold text-base font-display">{ex.weight}</b></span>
                            </div>
                            {ex.notes && (
                              <p className="text-xs text-gray-400 italic mt-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="font-bold text-brand-gold uppercase text-[9px] block mb-1">Indicación:</span>
                                {ex.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-16 bg-[#1a1a1a] rounded-[40px] border-2 border-dashed border-gray-800">
              <Dumbbell className="mx-auto text-gray-700 mb-4 opacity-20" size={64} />
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Sin rutinas asignadas</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-gray-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold"></div>
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display font-bold text-brand-gold tracking-tighter">EL ARCA</h1>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.5em] mt-2 font-black">Portal del Socio</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-8">
          <div>
            <label className="block text-gray-400 text-[10px] font-black uppercase mb-3 text-center tracking-widest opacity-70">
              Ingresa tu Identificación
            </label>
            <input
              type="number"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full bg-black border-2 border-gray-800 text-white rounded-3xl py-6 px-4 focus:border-brand-gold outline-none text-center text-3xl font-display font-bold tracking-tighter shadow-inner transition-all hover:border-gray-700"
              placeholder="DNI"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800/50 p-4 rounded-2xl text-red-400 text-[10px] text-center font-black uppercase tracking-widest animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-brand-gold hover:bg-yellow-500 text-black font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl shadow-brand-gold/10 active:scale-95"
          >
            <Search size={20} strokeWidth={4} /> Consultar Mi Rutina
          </button>
        </form>
        
        <div className="mt-12 text-center">
            <p className="text-gray-700 text-[9px] uppercase font-black tracking-[0.3em]">El Arca Gym & Fitness Manager</p>
        </div>
      </div>
    </div>
  );
};

export default RoutineSelfService;