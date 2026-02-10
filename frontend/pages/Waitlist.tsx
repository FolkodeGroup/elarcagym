import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import Toast from '../components/Toast';
import { FaWhatsapp } from 'react-icons/fa';

interface Waitlist {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  reservationDate: string;
  status?: string;
  createdAt: string;
}

const HORARIOS_DISPONIBLES = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00'
];

const WaitlistPage: React.FC = () => {
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    reservationTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info'; action?: React.ReactNode } | null>(null);
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);
  const [confirmConvertPhone, setConfirmConvertPhone] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/waitlist');
      setWaitlist(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setToast({ message: err.message || 'Error al cargar la lista de espera', type: 'error' });
      setWaitlist([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [hours, minutes] = form.reservationTime.split(':');
      const reservationDate = new Date();
      reservationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await apiFetch('/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          reservationDate: reservationDate.toISOString(),
          status: 'pendiente'
        })
      });
      setForm({ firstName: '', lastName: '', phone: '', reservationTime: '' });
      fetchWaitlist();
      setToast({ message: 'Registro guardado correctamente', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al guardar registro', type: 'error' });
    }
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiFetch(`/waitlist/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchWaitlist();
      setToast({ message: `Estado actualizado a "${newStatus}"`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al actualizar estado', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/waitlist/${id}`, { method: 'DELETE' });
      fetchWaitlist();
      setToast({ message: 'Registro eliminado', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al eliminar registro', type: 'error' });
    }
    setDeleteConfirm(null);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return dateStr;
    }
  };

  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const formattedPhone = cleaned.startsWith('54') ? cleaned : `54${cleaned}`;
    return `https://wa.me/${formattedPhone}`;
  };

  // Separar en 3 estados: pendientes, contactados y confirmados
  const pendientes = waitlist.filter(w => !w.status || w.status === 'pendiente');
  const contactados = waitlist.filter(w => w.status === 'contactado');
  const confirmados = waitlist.filter(w => w.status === 'confirmado');

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold text-brand-gold mb-6">Lista de Espera</h2>
      
      {/* Formulario de alta */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end bg-[#181818] p-4 rounded-lg shadow mb-8 border border-gray-800">
        <input 
          name="firstName" 
          placeholder="Nombre" 
          value={form.firstName} 
          onChange={handleChange} 
          required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" 
        />
        <input 
          name="lastName" 
          placeholder="Apellido" 
          value={form.lastName} 
          onChange={handleChange} 
          required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" 
        />
        <input 
          name="phone" 
          placeholder="Celular" 
          value={form.phone} 
          onChange={handleChange} 
          required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" 
        />
        <select
          name="reservationTime"
          value={form.reservationTime}
          onChange={handleChange}
          required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold"
        >
          <option value="" disabled>Horario</option>
          {HORARIOS_DISPONIBLES.map(h => (
            <option key={h} value={h}>{h} hs</option>
          ))}
        </select>
        <button 
          type="submit" 
          disabled={loading}
          className="px-5 py-2 bg-brand-gold text-black font-semibold rounded hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </form>

      {/* Tabla de Pendientes */}
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
        Pendientes
        {pendientes.length > 0 && (
          <span className="text-xs text-gray-400 font-normal ml-2">
            {pendientes.length} registro{pendientes.length !== 1 ? 's' : ''}
          </span>
        )}
      </h3>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-800 bg-[#181818] mb-10">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#222] text-brand-gold">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Apellido</th>
              <th className="px-4 py-3 font-semibold">Celular</th>
              <th className="px-4 py-3 font-semibold">Horario</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map(w => (
              <tr key={w.id} className="border-b border-gray-800 hover:bg-[#232323] transition">
                <td className="px-4 py-2 text-white">{w.firstName}</td>
                <td className="px-4 py-2 text-white">{w.lastName}</td>
                <td className="px-4 py-2 text-white">
                  <div className="flex items-center gap-2">
                    {w.phone}
                    <a
                      href={getWhatsAppLink(w.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition"
                      title="Contactar por WhatsApp"
                    >
                      <FaWhatsapp size={18} />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-2 text-white">{formatTime(w.reservationDate)} hs</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      onClick={() => handleStatusChange(w.id, 'contactado')}
                      title="Marcar como contactado"
                    >
                      Contactado
                    </button>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      onClick={() => handleStatusChange(w.id, 'confirmado')}
                      title="Confirmar asistencia"
                    >
                      Confirmar
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      onClick={() => setDeleteConfirm({ id: w.id, name: `${w.firstName} ${w.lastName}` })}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pendientes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">No hay registros pendientes en la lista de espera.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tabla de Contactados */}
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
        Contactados
        {contactados.length > 0 && (
          <span className="text-xs text-gray-400 font-normal ml-2">
            Ya fueron contactados, esperando confirmación
          </span>
        )}
      </h3>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-800 bg-[#181818] mb-10">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#222] text-brand-gold">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Apellido</th>
              <th className="px-4 py-3 font-semibold">Celular</th>
              <th className="px-4 py-3 font-semibold">Horario</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactados.map(w => (
              <tr key={w.id} className="border-b border-gray-800 hover:bg-[#232323] transition">
                <td className="px-4 py-2 text-white">{w.firstName}</td>
                <td className="px-4 py-2 text-white">{w.lastName}</td>
                <td className="px-4 py-2 text-white">
                  <div className="flex items-center gap-2">
                    {w.phone}
                    <a
                      href={getWhatsAppLink(w.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition"
                      title="Contactar por WhatsApp"
                    >
                      <FaWhatsapp size={18} />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-2 text-white">{formatTime(w.reservationDate)} hs</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
                      onClick={() => handleStatusChange(w.id, 'pendiente')}
                      title="Volver a pendiente"
                    >
                      ↩ Pendiente
                    </button>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      onClick={() => handleStatusChange(w.id, 'confirmado')}
                      title="Confirmar asistencia"
                    >
                      Confirmar
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      onClick={() => setDeleteConfirm({ id: w.id, name: `${w.firstName} ${w.lastName}` })}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contactados.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">No hay contactados aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tabla de Confirmados */}
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
        Confirmados
        {confirmados.length > 0 && (
          <span className="text-xs text-gray-400 font-normal ml-2">
            Cuando se presenten, agrégalos como socios desde aquí
          </span>
        )}
      </h3>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-800 bg-[#181818]">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#222] text-brand-gold">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Apellido</th>
              <th className="px-4 py-3 font-semibold">Celular</th>
              <th className="px-4 py-3 font-semibold">Horario</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {confirmados.map(w => (
              <tr key={w.id} className="border-b border-gray-800 hover:bg-[#232323] transition">
                <td className="px-4 py-2 text-white">{w.firstName}</td>
                <td className="px-4 py-2 text-white">{w.lastName}</td>
                <td className="px-4 py-2 text-white">
                  <div className="flex items-center gap-2">
                    {w.phone}
                    <a
                      href={getWhatsAppLink(w.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition"
                      title="Contactar por WhatsApp"
                    >
                      <FaWhatsapp size={18} />
                    </a>
                  </div>
                </td>
                <td className="px-4 py-2 text-white">{formatTime(w.reservationDate)} hs</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
                      onClick={() => handleStatusChange(w.id, 'pendiente')}
                      title="Volver a pendiente"
                    >
                      ↩ Pendiente
                    </button>
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      onClick={() => {
                        setConfirmConvertId(w.id);
                        setConfirmConvertPhone(w.phone);
                      }}
                    >
                      Agregar a Socio
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      onClick={() => setDeleteConfirm({ id: w.id, name: `${w.firstName} ${w.lastName}` })}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {confirmados.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">No hay confirmados aún. Cambia el estado de un pendiente a "Confirmado".</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación para convertir a socio */}
      {confirmConvertId && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmConvertId(null)} />
          <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">¿Agregar este socio?</h3>
            <p className="text-gray-300 mb-4">
              Se creará como socio y se eliminará automáticamente de la lista de espera.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setConfirmConvertId(null)} 
                className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiFetch(`/waitlist/${confirmConvertId}/convert`, { method: 'POST' });
                    fetchWaitlist();
                    setToast({ message: 'Socio agregado correctamente', type: 'success' });
                  } catch (err: any) {
                    setToast({
                      message: (err.message || 'Error al agregar socio') + (confirmConvertPhone ? ` | ¿Deseas avisarle por WhatsApp?` : ''),
                      type: 'error',
                      action: confirmConvertPhone ? (
                        <a
                          href={getWhatsAppLink(confirmConvertPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 underline text-green-400"
                        >Enviar WhatsApp</a>
                      ) : undefined
                    });
                  }
                  setConfirmConvertId(null);
                  setConfirmConvertPhone(null);
                }}
                className="px-4 py-2 bg-brand-gold text-black rounded font-bold hover:bg-yellow-500"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal personalizado para eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Eliminar registro</h3>
              <p className="text-gray-400 text-sm mt-2">
                ¿Estás seguro de eliminar a <strong className="text-white">{deleteConfirm.name}</strong> de la lista de espera? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.action}
        </Toast>
      )}
    </div>
  );
};

export default WaitlistPage;
