"use client";
import React, { useState } from 'react';

export default function ConsultaRutina() {
  const [dni, setDni] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConsultar = async () => {
    if (!dni) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`/api/socios/${dni}`);
      if (!res.ok) throw new Error('Socio no encontrado');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError('No se encontró información para el DNI ingresado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 mt-10">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">El Arca Gym</h1>
        <p className="text-gray-600 text-center mb-6">Ingresá tu DNI para ver tu rutina diaria</p>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Ej: 40123456"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button
            onClick={handleConsultar}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Buscando...' : 'Ver Mi Rutina'}
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}

        {data && (
          <div className="mt-8 border-t pt-6 animation-fade-in">
            <h2 className="text-xl font-bold text-gray-800">Hola, {data.nombre}!</h2>
            <div className="mt-4 space-y-4">
              {data.rutina ? (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 border-b border-blue-200 mb-2">Tu Rutina Actual:</h3>
                  {/* Aquí asumo que rutina es un string o un array de ejercicios */}
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {typeof data.rutina === 'string' ? data.rutina : JSON.stringify(data.rutina, null, 2)}
                  </div>
                </div>
              ) : (
                <p className="text-amber-600 italic">Aún no tienes una rutina asignada.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}