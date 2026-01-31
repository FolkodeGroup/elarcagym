import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Smartphone, Info, Copy } from 'lucide-react';
import { RoutineAccessAPI } from '../services/api';

const QRManager: React.FC = () => {
  // Simulación: datos de socio y slot para demo QR (en producción, estos vendrían de la UI o selección)
  const qrUrl = `${window.location.origin}/rutina`;
  const loading = false;
  const error = '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrUrl);
    alert("Enlace copiado: " + qrUrl);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Lado Izquierdo: QR */}
          <div className="bg-white p-6 rounded-[40px] shadow-2xl border-[12px] border-gray-100 flex-shrink-0 min-h-[260px] min-w-[260px] flex flex-col items-center justify-center">
            {loading ? (
              <span className="text-gray-500 text-xs">Generando QR...</span>
            ) : error ? (
              <span className="text-red-500 text-xs">{error}</span>
            ) : qrUrl ? (
              <>
                <QRCodeSVG value={qrUrl} size={220} level="H" includeMargin={true} />
                <p className="text-black font-black text-[10px] mt-2 text-center uppercase tracking-widest">Escaneame</p>
              </>
            ) : null}
          </div>

          {/* Lado Derecho: Info */}
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div>
              <h2 className="text-3xl font-display font-bold text-white flex items-center justify-center md:justify-start gap-3">
                <QrCode className="text-brand-gold" size={32} />
                Confirmacion de Asistencia
              </h2>
              <p className="text-gray-400 mt-2">
                Genera el código de acceso para que tus socios consulten sus rutinas de forma autónoma desde sus dispositivos.
              </p>
            </div>

            <div className="bg-black/40 border border-gray-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-3 text-brand-gold font-bold text-sm">
                <Smartphone size={18} />
                <span>¿Cómo funciona?</span>
              </div>
              <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside ml-1 text-left">
                <li>Imprime el código QR y colócalo en un lugar visible del gimnasio.</li>
                <li>El socio escanea el código con la cámara de su celular.</li>
                <li>Ingresa su DNI y el sistema le muestra su rutina actual.</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button 
                onClick={() => window.print()}
                className="bg-brand-gold text-black px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-yellow-500 transition shadow-lg shadow-brand-gold/20"
              >
                <Printer size={18} /> Imprimir Cartelera
              </button>
              <button 
                onClick={copyToClipboard}
                className="bg-gray-800 text-white px-6 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-gray-700 transition"
                disabled={!qrUrl}
              >
                <Copy size={18} /> Copiar Enlace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NOTA TECNICA PARA PRUEBAS */}
      <div className="bg-blue-900/20 border border-blue-800 p-6 rounded-3xl flex gap-4 items-start">
        <div className="bg-blue-500 p-2 rounded-lg text-white">
          <Info size={24} />
        </div>
        <div>
          <h4 className="text-blue-400 font-bold text-sm uppercase tracking-widest">Nota para el desarrollador</h4>
          <p className="text-gray-400 text-sm mt-1">
            Si estás en modo de desarrollo (localhost) y el QR no abre en tu celular:
          </p>
          <ul className="text-xs text-gray-500 mt-2 list-disc list-inside space-y-1">
            <li>Tu PC y tu Celular deben estar en la <b>misma red WiFi</b>.</li>
            <li>En lugar de <code className="text-blue-300">localhost:3000</code>, usa la IP de tu red local (ej: <code className="text-blue-300">http://192.168.1.50:3000</code>).</li>
            <li>Una vez que subas el sitio a internet (producción), el QR funcionará automáticamente para todos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRManager;