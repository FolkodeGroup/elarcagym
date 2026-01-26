import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Sale } from '../types';
import { DollarSign, TrendingUp, Edit2, Trash2, Printer, X } from 'lucide-react';
import Toast from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Ingresos = () => {
    const { t } = useLanguage();
    const [ventas, setVentas] = useState<Sale[]>([]);
    const [ventasHoy, setVentasHoy] = useState<Sale[]>([]);
    const [totalHoy, setTotalHoy] = useState(0);
    const [totalGeneral, setTotalGeneral] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [filtroFecha, setFiltroFecha] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [ventaAEliminar, setVentaAEliminar] = useState<Sale | null>(null);

    useEffect(() => {
        cargarVentas();
    }, []);

    const cargarVentas = () => {
        const todasLasVentas = db.getAllSales();
        setVentas(todasLasVentas);

        const hoy = new Date().toISOString().split('T')[0];
        const ventasDelDia = todasLasVentas.filter(venta => {
            const fechaVenta = new Date(venta.date).toISOString().split('T')[0];
            return fechaVenta === hoy;
        });

        setVentasHoy(ventasDelDia);

        const totalDia = ventasDelDia.reduce((acc, venta) => acc + venta.total, 0);
        const totalG = todasLasVentas.reduce((acc, venta) => acc + venta.total, 0);

        setTotalHoy(totalDia);
        setTotalGeneral(totalG);
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const eliminarVenta = (venta: Sale) => {
        setVentaAEliminar(venta);
        setShowDeleteModal(true);
    };

    const confirmarEliminar = () => {
        if (ventaAEliminar) {
            db.deleteSale(ventaAEliminar.id);
            setToast({ message: t('ventaEliminadaCorrectamente'), type: 'success' });
            setShowDeleteModal(false);
            setVentaAEliminar(null);
            cargarVentas();
        }
    };

    const imprimirTicket = (venta: Sale) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Encabezado
        doc.setFontSize(16);
        doc.text(t('elArcaGym'), pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(t('centroDeportivoDesc'), pageWidth / 2, 22, { align: 'center' });
        
        // Línea separadora
        doc.line(10, 28, pageWidth - 10, 28);
        
        // Información de la venta
        doc.setFontSize(11);
        doc.text(t('reciboDeVenta'), pageWidth / 2, 35, { align: 'center' });
        
        doc.setFontSize(9);
        doc.text(`${t('fechaColon')} ${formatearFecha(venta.date)}`, 15, 45);
        doc.text(`${t('idVenta')} ${venta.id}`, 15, 52);
        
        // Línea separadora
        doc.line(10, 58, pageWidth - 10, 58);
        
        // Tabla de productos
        const tableData = venta.items.map(item => [
            item.productName,
            item.quantity.toString(),
            `$${item.priceAtSale.toFixed(2)}`,
            `$${(item.priceAtSale * item.quantity).toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [[t('producto'), t('cantidad'), t('precioUnitario'), t('subtotal')]],
            body: tableData,
            startY: 65,
            margin: 15,
            styles: {
                fontSize: 9,
                halign: 'left'
            },
            headStyles: {
                fillColor: [251, 191, 36],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'right', cellWidth: 40 },
                3: { halign: 'right', cellWidth: 40 }
            }
        });

        // Total
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.line(10, finalY - 5, pageWidth - 10, finalY - 5);
        doc.setFontSize(12);
        doc.text(`${t('total')}: $${venta.total.toFixed(2)}`, pageWidth - 15, finalY + 5, { align: 'right' });
        
        // Pie de página
        doc.setFontSize(8);
        doc.text(t('graciasCompraTu'), pageWidth / 2, finalY + 20, { align: 'center' });
        doc.text(new Date().toLocaleDateString('es-AR'), pageWidth / 2, finalY + 25, { align: 'center' });
        
        // Descargar
        doc.save(`ticket-${venta.id}.pdf`);
        setToast({ message: t('ticketDescargadoCorrectamente'), type: 'success' });
    };

    const imprimirMultiples = () => {
        if (ventasAMostrar.length === 0) {
            setToast({ message: t('noHayVentasParaImprimir'), type: 'error' });
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(14);
        doc.text(t('reporteVentasElArcaGym'), pageWidth / 2, 10, { align: 'center' });
        
        doc.setFontSize(10);
        const fecha = filtroFecha ? `${t('ventasDel')} ${filtroFecha}` : t('ventasdeHoy');
        doc.text(fecha, pageWidth / 2, 18, { align: 'center' });
        
        const tableData = ventasAMostrar.map(venta => [
            formatearFecha(venta.date),
            venta.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
            `$${venta.total.toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [[t('fechayHora'), t('productos'), t('total')]],
            body: tableData,
            startY: 25,
            margin: 10,
            styles: { fontSize: 9 },
            headStyles: {
                fillColor: [251, 191, 36],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            }
        });

        const totalPagina = ventasAMostrar.reduce((acc, v) => acc + v.total, 0);
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`${t('total')}: $${totalPagina.toFixed(2)}`, pageWidth - 15, finalY, { align: 'right' });
        
        doc.save(`ventas-${new Date().toISOString().split('T')[0]}.pdf`);
        setToast({ message: t('reporteDescargadoCorrectamente'), type: 'success' });
    };

    const ventasAMostrar = filtroFecha ? ventas.filter(v => v.date.startsWith(filtroFecha)) : ventasHoy;

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-display font-bold text-white">{t('Ingresos y Ventas')}</h1>
                <button
                    onClick={imprimirMultiples}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Printer size={20} />
                    {t('imprimirReporte')}
                </button>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total del Día */}
                <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold opacity-90">{t('totaldeHoy')}</p>
                            <p className="text-4xl font-bold mt-2">${totalHoy.toFixed(2)}</p>
                        </div>
                        <DollarSign size={48} className="opacity-30" />
                    </div>
                </div>

                {/* Total General */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold opacity-90">{t('totalGeneral')}</p>
                            <p className="text-4xl font-bold mt-2">${totalGeneral.toFixed(2)}</p>
                        </div>
                        <TrendingUp size={48} className="opacity-30" />
                    </div>
                </div>
            </div>

            {/* Filtro de Fecha */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
                <label className="text-white text-sm font-semibold mb-3 block">{t('filtrarPorFecha')}</label>
                <div className="flex gap-2 flex-wrap items-center">
                    <button
                        onClick={() => setFiltroFecha('')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            filtroFecha === ''
                                ? 'bg-brand-gold text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        {t('todas')}
                    </button>
                    <button
                        onClick={() => {
                            const hoy = new Date().toISOString().split('T')[0];
                            setFiltroFecha(hoy);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            filtroFecha === new Date().toISOString().split('T')[0]
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        {t('hoy')}
                    </button>
                    <input
                        type="date"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 cursor-pointer hover:border-brand-gold transition"
                    />
                </div>
            </div>

            {/* Lista de Ventas */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">
                        {filtroFecha ? `${t('ventasDel')} ${filtroFecha}` : t('ventasdeHoy')} ({ventasAMostrar.length})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    {ventasAMostrar.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700 bg-black/50">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-300">{t('fechayHora')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-300">{t('productos')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-300">{t('total')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-300">{t('acciones')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventasAMostrar.map((venta) => (
                                    <tr key={venta.id} className="border-b border-gray-700 hover:bg-black/30 transition">
                                        <td className="px-6 py-4 text-sm text-white">
                                            {formatearFecha(venta.date)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {venta.items.map((item, idx) => (
                                                <div key={idx} className="text-xs">
                                                    {item.productName} x{item.quantity}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-bold text-brand-gold">
                                            ${venta.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => imprimirTicket(venta)}
                                                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
                                                    title={t('imprimirReporte')}
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button
                                                    onClick={() => eliminarVenta(venta)}
                                                    className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition"
                                                    title={t('eliminar')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            <p>{t('noHayVentas')} {filtroFecha ? t('paraEstaFecha') : t('hoy')}.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmación de Eliminación */}
            {showDeleteModal && ventaAEliminar && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">{t('confirmarEliminacion')}</h3>
                            <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg mb-4">
                            <p className="text-white mb-2">{t('estasSeguroEliminar')}</p>
                            <p className="text-sm text-gray-300 mb-2">
                                <strong>{t('fechaColon')}</strong> {formatearFecha(ventaAEliminar.date)}
                            </p>
                            <p className="text-sm text-gray-300 mb-2">
                                <strong>{t('totalColon')}</strong> ${ventaAEliminar.total.toFixed(2)}
                            </p>
                            <p className="text-sm text-yellow-400">{t('estaAccionNoSePuedeDeshace')}</p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                            >
                                {t('cancelar')}
                            </button>
                            <button
                                onClick={confirmarEliminar}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                {t('eliminar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default Ingresos;