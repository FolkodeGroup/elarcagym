import React, { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { QrCode, Printer, Smartphone, Info, Copy } from 'lucide-react';
import { RoutineAccessAPI } from '../services/api';
import Toast from '../components/Toast';
import jsPDF from 'jspdf';
import { LOGO_BASE64 } from '../services/assets';

const QRManager: React.FC = () => {
  const LOCAL_IP = '192.168.1.102';
  const qrUrl =
    process.env.NODE_ENV === 'development'
      ? `http://${LOCAL_IP}:3000/rutina`
      : `${window.location.origin}/rutina`;
  const loading = false;
  const error = '';

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrUrl);
    setToast({ message: `Enlace copiado: ${qrUrl}`, type: 'info' });
  };

  const generateQRPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Fondo oscuro ---
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // --- Barra dorada superior ---
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // --- Logo de fondo (marca de agua) ---
    try {
      if (typeof LOGO_BASE64 === 'string' && LOGO_BASE64.length > 0) {
        doc.saveGraphicsState();
        if (typeof (doc as any).GState === 'function') {
          doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
        }
        const imgSize = pageHeight * 0.75;
        const xCentered = (pageWidth - imgSize) / 2;
        const yCentered = (pageHeight - imgSize) / 2;
        doc.addImage(LOGO_BASE64, 'JPEG', xCentered, yCentered, imgSize, imgSize);
        doc.restoreGraphicsState();
      }
    } catch (e) {}

    // --- Logo en encabezado (esquina superior derecha) ---
    try {
      if (typeof LOGO_BASE64 === 'string' && LOGO_BASE64.length > 0) {
        doc.addImage(LOGO_BASE64, 'JPEG', pageWidth - 42, 8, 30, 20);
      }
    } catch (e) {}

    // --- Título principal ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(212, 175, 55);
    doc.text('EL ARCA', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(180, 180, 180);
    doc.text('GYM & FITNESS', pageWidth / 2, 30, { align: 'center' });

    // --- Subtítulo ---
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('CONSULTÁ TU RUTINA', pageWidth / 2, 48, { align: 'center' });

    // --- Línea separadora dorada ---
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - 40, 53, pageWidth / 2 + 40, 53);

    // --- QR Code (renderizado desde el canvas oculto) ---
    const qrCanvas = qrCanvasRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const qrDataUrl = qrCanvas.toDataURL('image/png');
      const qrSize = 100;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 60;

      // Fondo blanco para el QR
      doc.setFillColor(255, 255, 255);
      const padding = 8;
      doc.roundedRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2, 6, 6, 'F');

      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // "ESCANEAME" debajo del QR
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(26, 26, 26);
      doc.text('ESCANEAME', pageWidth / 2, qrY + qrSize + padding - 1, { align: 'center' });
    }

    // --- Instrucciones para los socios ---
    const instrY = 185;

    // Línea dorada antes de instrucciones
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(30, instrY - 8, pageWidth - 30, instrY - 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text('¿CÓMO FUNCIONA?', pageWidth / 2, instrY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(220, 220, 220);

    const pasos = [
      '1.  Escaneá el código QR con la cámara de tu celular.',
      '2.  Ingresá tu número de DNI.',
      '3.  ¡Listo! Vas a ver tu rutina de entrenamiento actualizada.'
    ];

    let stepY = instrY + 14;
    pasos.forEach(paso => {
      doc.text(paso, pageWidth / 2, stepY, { align: 'center' });
      stepY += 10;
    });

    // --- Mensaje motivacional ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(212, 175, 55);
    doc.text('¡A ENTRENAR CON TODO! 💪', pageWidth / 2, stepY + 12, { align: 'center' });

    // --- Barra dorada inferior ---
    doc.setFillColor(212, 175, 55);
    doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

    // --- Pie de página ---
    doc.setFontSize(8);
    doc.setTextColor(212, 175, 55);
    doc.text('EL ARCA - GYM & FITNESS', 10, pageHeight - 9);
    doc.text(qrUrl, pageWidth - 10, pageHeight - 9, { align: 'right' });

    // --- Descargar ---
    doc.save('Cartelera_QR_ElArca.pdf');
    setToast({ message: 'PDF generado correctamente', type: 'success' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Canvas oculto para generar el QR como imagen */}
      <div ref={qrCanvasRef} className="hidden">
        <QRCodeCanvas value={qrUrl} size={400} level="H" includeMargin={true} />
      </div>

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
                onClick={generateQRPdf}
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default QRManager;