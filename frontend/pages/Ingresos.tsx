import React, { useEffect, useState } from 'react';
import { SalesAPI, PaymentLogsAPI } from '../services/api';
import { Sale, PaymentLog } from '../types';
import { DollarSign, TrendingUp, Edit2, Trash2, Printer, X, CreditCard, ShoppingCart } from 'lucide-react';
import Toast from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipo unificado para mostrar ventas y pagos de membresía juntos
interface IncomeItem {
    id: string;
    date: string;
    total: number;
    type: 'sale' | 'payment';
    description: string;
    detail: string;
    original: Sale | PaymentLog;
}

const Ingresos = () => {
    const { t } = useLanguage();
    const [ventas, setVentas] = useState<Sale[]>([]);
    const [pagos, setPagos] = useState<PaymentLog[]>([]);
    const [totalHoy, setTotalHoy] = useState(0);
    const [totalGeneral, setTotalGeneral] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [filtroFecha, setFiltroFecha] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemAEliminar, setItemAEliminar] = useState<IncomeItem | null>(null);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setIsLoading(true);
        try {
            const [todasLasVentas, todosLosPagos] = await Promise.all([
                SalesAPI.list(),
                PaymentLogsAPI.list()
            ]);
            setVentas(todasLasVentas);
            setPagos(todosLosPagos);

            const hoy = new Date().toISOString().split('T')[0];
            
            const ventasHoy = todasLasVentas.filter(v => new Date(v.date).toISOString().split('T')[0] === hoy);
            const pagosHoy = todosLosPagos.filter(p => new Date(p.date).toISOString().split('T')[0] === hoy);

            const totalDia = ventasHoy.reduce((acc, v) => acc + v.total, 0) + pagosHoy.reduce((acc, p) => acc + p.amount, 0);
            const totalG = todasLasVentas.reduce((acc, v) => acc + v.total, 0) + todosLosPagos.reduce((acc, p) => acc + p.amount, 0);

            setTotalHoy(totalDia);
            setTotalGeneral(totalG);
        } catch (error) {
            console.error('Error loading data:', error);
            setToast({ message: 'Error al cargar datos', type: 'error' });
        } finally {
            setIsLoading(false);
        }
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

    const eliminarItem = (item: IncomeItem) => {
        setItemAEliminar(item);
        setShowDeleteModal(true);
    };

    const confirmarEliminar = async () => {
        if (itemAEliminar) {
            try {
                if (itemAEliminar.type === 'sale') {
                    await SalesAPI.delete(itemAEliminar.id);
                } else {
                    await PaymentLogsAPI.delete(itemAEliminar.id);
                }
                setToast({ message: itemAEliminar.type === 'sale' ? t('ventaEliminadaCorrectamente') : 'Pago eliminado correctamente', type: 'success' });
                setShowDeleteModal(false);
                setItemAEliminar(null);
                await cargarDatos();
            } catch (error) {
                setToast({ message: 'Error al eliminar venta', type: 'error' });
            }
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
        if (ingresosAMostrar.length === 0) {
            setToast({ message: t('noHayVentasParaImprimir'), type: 'error' });
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(14);
        doc.text('Reporte de Ingresos - El Arca Gym', pageWidth / 2, 10, { align: 'center' });
        
        doc.setFontSize(10);
        const fecha = filtroFecha ? `Ingresos del ${filtroFecha}` : 'Ingresos de Hoy';
        doc.text(fecha, pageWidth / 2, 18, { align: 'center' });
        
        const tableData = ingresosAMostrar.map(item => [
            formatearFecha(item.date),
            item.type === 'sale' ? 'Venta' : 'Membresía',
            item.description,
            `$${item.total.toFixed(2)}`
        ]);

        autoTable(doc, {
            head: [[t('fechayHora'), 'Tipo', 'Detalle', t('total')]],
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

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`${t('total')}: $${totalFiltrado.toFixed(2)}`, pageWidth - 15, finalY, { align: 'right' });
        
        doc.save(`ingresos-${new Date().toISOString().split('T')[0]}.pdf`);
        setToast({ message: t('reporteDescargadoCorrectamente'), type: 'success' });
    };

    // Combinar ventas y pagos en una lista unificada
    const buildIncomeItems = (): IncomeItem[] => {
        const hoy = new Date().toISOString().split('T')[0];
        
        const ventasFiltradas = filtroFecha 
            ? ventas.filter(v => new Date(v.date).toISOString().split('T')[0] === filtroFecha)
            : ventas.filter(v => new Date(v.date).toISOString().split('T')[0] === hoy);
        
        const pagosFiltrados = filtroFecha
            ? pagos.filter(p => new Date(p.date).toISOString().split('T')[0] === filtroFecha)
            : pagos.filter(p => new Date(p.date).toISOString().split('T')[0] === hoy);

        const items: IncomeItem[] = [
            ...ventasFiltradas.map(v => ({
                id: v.id,
                date: v.date,
                total: v.total,
                type: 'sale' as const,
                description: v.items.map(i => `${i.productName} x${i.quantity}`).join(', '),
                detail: 'Venta de productos',
                original: v
            })),
            ...pagosFiltrados.map(p => ({
                id: p.id,
                date: p.date,
                total: p.amount,
                type: 'payment' as const,
                description: `${p.concept}${p.memberName ? ` - ${p.memberName}` : ''}`,
                detail: `${p.method || 'Efectivo'}`,
                original: p
            }))
        ];

        // Ordenar por fecha descendente
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return items;
    };

    const ingresosAMostrar = buildIncomeItems();
    const totalFiltrado = ingresosAMostrar.reduce((acc, item) => acc + item.total, 0);

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
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 cursor-pointer hover:border-brand-gold transition [color-scheme:dark]"
                    />
                </div>
            </div>

            {/* Lista de Ingresos (Ventas + Pagos de Membresía) */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">
                        {filtroFecha ? `Ingresos del ${filtroFecha}` : 'Ingresos de Hoy'} ({ingresosAMostrar.length})
                        {ingresosAMostrar.length > 0 && (
                            <span className="text-brand-gold ml-2">— Total: ${totalFiltrado.toFixed(2)}</span>
                        )}
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    {ingresosAMostrar.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700 bg-black/50">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-300">{t('fechayHora')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-300">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-300">Detalle</th>
                                    <th className="px-8 py-3 text-right text-xs font-bold text-gray-300">{t('total')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-300">{t('acciones')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingresosAMostrar.map((item) => (
                                    <tr key={`${item.type}-${item.id}`} className="border-b border-gray-700 hover:bg-black/30 transition">
                                        <td className="px-6 py-4 text-sm text-white">
                                            {formatearFecha(item.date)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                item.type === 'sale' 
                                                    ? 'bg-blue-900/30 border border-blue-700 text-blue-400' 
                                                    : 'bg-green-900/30 border border-green-700 text-green-400'
                                            }`}>
                                                {item.type === 'sale' ? <ShoppingCart size={12} /> : <CreditCard size={12} />}
                                                {item.type === 'sale' ? 'Venta' : 'Membresía'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            <div className="text-xs">{item.description}</div>
                                            {item.type === 'payment' && (
                                                <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-bold text-brand-gold">
                                            ${item.total.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                {item.type === 'sale' && (
                                                    <button
                                                        onClick={() => imprimirTicket(item.original as Sale)}
                                                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
                                                        title={t('imprimirReporte')}
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => eliminarItem(item)}
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
                            <p>No hay ingresos {filtroFecha ? 'para esta fecha' : 'hoy'}.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Confirmación de Eliminación */}
            {showDeleteModal && itemAEliminar && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="absolute inset-0" onClick={() => setShowDeleteModal(false)} />
                    <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg max-w-md w-full p-6 z-10" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">{t('confirmarEliminacion')}</h3>
                            <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg mb-4">
                            <p className="text-white mb-2">{t('estasSeguroEliminar')}</p>
                            <p className="text-sm text-gray-300 mb-2">
                                <strong>Tipo:</strong> {itemAEliminar.type === 'sale' ? 'Venta de productos' : 'Pago de membresía'}
                            </p>
                            <p className="text-sm text-gray-300 mb-2">
                                <strong>{t('fechaColon')}</strong> {formatearFecha(itemAEliminar.date)}
                            </p>
                            <p className="text-sm text-gray-300 mb-2">
                                <strong>{t('totalColon')}</strong> ${itemAEliminar.total.toFixed(2)}
                            </p>
                            <p className="text-sm text-yellow-400">{t('estaAccionNoSePuedeDeshace')}</p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition cursor-pointer"
                            >
                                {t('cancelar')}
                            </button>
                            <button
                                onClick={confirmarEliminar}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
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