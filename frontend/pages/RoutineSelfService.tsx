import React, { useState } from 'react';
import { RoutineAccessAPI } from '../services/api';
import { Member } from '../types';
import { Search, Dumbbell, ArrowLeft, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';


const RoutineSelfService: React.FC = () => {
  const [dni, setDni] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tu navegador no soporta geolocalización'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'No se pudo obtener tu ubicación';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Debes permitir el acceso a tu ubicación para ver tu rutina';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Tu ubicación no está disponible en este momento';
              break;
            case error.TIMEOUT:
              errorMessage = 'Se agotó el tiempo esperando tu ubicación';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsRequestingLocation(true);
    setError('');
    setExpired(false);
    try {
      // Solicitar ubicación
      const location = await getLocation();
      setIsRequestingLocation(false);
      
      // Nueva API: DNI + ubicación
      const result = await RoutineAccessAPI.validateRoutineAccessByDni(
        dni,
        location.latitude,
        location.longitude
      );
      setMember(result.member);
    } catch (err: any) {
      setIsRequestingLocation(false);
      if (err.message && (err.message.toLowerCase().includes('expirado') || err.message.toLowerCase().includes('token')) ) {
        setExpired(true);
        setError('El acceso ha expirado o no tienes turno activo.');
      } else if (err.message && err.message.toLowerCase().includes('ubicación')) {
        setError(err.message);
      } else if (err.message && err.message.toLowerCase().includes('gimnasio')) {
        setError(err.message);
      } else {
        setError(err.message || 'Error desconocido');
      }
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (member) {
    return (
      <div
        className="max-w-md mx-auto p-4 space-y-6 animate-fadeIn min-h-screen bg-black/60 text-white backdrop-blur-sm"
        style={{
          backgroundImage: 'url(/images/arca-logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          backgroundAttachment: 'fixed',
          opacity: 1
        }}
      >
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
              <div key={routine.id} className="bg-black/60 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
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
    <div
      className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6"
      style={{
        backgroundImage: 'url(/images/arca-logo.png)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundAttachment: 'fixed',
        opacity: 1
      }}
    >
      <div className="w-full max-w-[90vw] sm:max-w-sm bg-black/60 border border-gray-800 rounded-[48px] p-4 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-sm mt-12 mb-4 sm:mt-8 sm:mb-8">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-gold"></div>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display font-bold text-brand-gold tracking-tighter">EL ARCA</h1>
          <p className="text-gray-200 text-[10px] uppercase tracking-[0.5em] mt-2 font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">Portal del Socio</p>
        </div>
        <form onSubmit={handleSearch} className="space-y-8">
          <div>
            <label className="block text-gray-200 text-[10px] font-black uppercase mb-3 text-center tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              Ingresa tu Identificación
            </label>
            <input
              type="number"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full bg-black border-2 border-gray-800 text-white rounded-3xl py-6 px-4 focus:border-brand-gold outline-none text-center text-3xl font-display font-bold tracking-tighter shadow-inner transition-all hover:border-gray-700 placeholder:text-gray-300 placeholder:font-bold placeholder:opacity-90"
              placeholder="DNI"
              required
              disabled={isLoading || expired}
            />
          </div>
          {error && (
            <div className={`bg-red-600/20 border-2 border-red-500 p-6 rounded-[32px] text-red-100 text-xs sm:text-sm text-center font-black uppercase tracking-[0.15em] animate-shake shadow-lg shadow-red-900/40 flex flex-col items-center gap-3 backdrop-blur-md`}>
              <AlertTriangle size={32} className="text-brand-gold animate-pulse" />
              <span className="leading-relaxed drop-shadow-md">{error}</span>
              {expired && (
                <p className="text-[10px] text-red-300/80 font-bold mt-1">
                  Verificá tu reserva o hablá con administración
                </p>
              )}
            </div>
          )}
          {isRequestingLocation && (
            <div className="bg-blue-900/30 border border-blue-800/50 p-4 rounded-2xl text-blue-400 text-[10px] text-center font-black uppercase tracking-widest flex flex-col items-center gap-2">
              <MapPin size={24} className="text-blue-400 mb-1 animate-pulse" />
              Solicitando tu ubicación...
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-brand-gold hover:bg-yellow-500 text-black font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl shadow-brand-gold/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || expired}
          >
            <Search size={20} strokeWidth={4} /> Consultar Mi Rutina
          </button>
        </form>
        <div className="mt-12 text-center">
            <p className="text-gray-200 text-[9px] uppercase font-black tracking-[0.3em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">El Arca Gym & Fitness Manager</p>
        </div>
      </div>
    </div>
  );
};

export default RoutineSelfService;