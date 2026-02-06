import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import Toast from '../components/Toast';

interface Waitlist {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  reservationDate: string;
  status?: string;
  createdAt: string;
}

const WaitlistPage: React.FC = () => {
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    reservationDate: '',
    status: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info'; action?: React.ReactNode } | null>(null);
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);
  const [confirmConvertPhone, setConfirmConvertPhone] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          reservationDate: new Date(form.reservationDate).toISOString()
        })
      });
      setForm({ firstName: '', lastName: '', phone: '', reservationDate: '', status: '' });
      fetchWaitlist();
      setToast({ message: 'Registro guardado correctamente', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al guardar registro', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold text-brand-gold mb-6">Lista de Espera</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end bg-[#181818] p-4 rounded-lg shadow mb-8 border border-gray-800">
        <input name="firstName" placeholder="Nombre" value={form.firstName} onChange={handleChange} required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" />
        <input name="lastName" placeholder="Apellido" value={form.lastName} onChange={handleChange} required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" />
        <input name="phone" placeholder="Celular" value={form.phone} onChange={handleChange} required
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" />
        <input name="reservationDate" type="datetime-local" value={form.reservationDate} onChange={handleChange} required
          className="flex-1 min-w-[180px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" />
        <input name="status" placeholder="Estado (opcional)" value={form.status} onChange={handleChange}
          className="flex-1 min-w-[140px] px-3 py-2 rounded bg-[#222] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-gold placeholder-gray-400" />
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-brand-gold text-black font-semibold rounded hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-800 bg-[#181818]">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#222] text-brand-gold">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Apellido</th>
              <th className="px-4 py-3 font-semibold">Celular</th>
              <th className="px-4 py-3 font-semibold">Horario Reserva</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {waitlist.map(w => (
              <tr key={w.id} className="border-b border-gray-800 hover:bg-[#232323] transition">
                <td className="px-4 py-2">{w.firstName}</td>
                <td className="px-4 py-2">{w.lastName}</td>
                <td className="px-4 py-2">{w.phone}</td>
                <td className="px-4 py-2">{new Date(w.reservationDate).toLocaleString()}</td>
                <td className="px-4 py-2">{w.status || 'pendiente'}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                    onClick={() => {
                      setConfirmConvertId(w.id);
                      setConfirmConvertPhone(w.phone);
                    }}
                  >Agregar a Socio</button>
                        {/* Modal de confirmación para convertir a socio */}
                        {confirmConvertId && (
                          <div className="fixed inset-0 flex items-center justify-center z-50">
                            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmConvertId(null)} />
                            <div className="relative z-10 bg-[#222] p-6 rounded-xl border border-gray-700 w-full max-w-sm">
                              <h3 className="text-lg font-bold text-white mb-4">¿Agregar este socio?</h3>
                              <p className="text-gray-300 mb-4">¿Seguro que quieres agregar a este socio?</p>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setConfirmConvertId(null)} className="px-4 py-2 text-gray-400 rounded border border-gray-700 hover:bg-gray-800">Cancelar</button>
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
                                            href={`https://wa.me/${confirmConvertPhone}`}
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
                                >Aceptar</button>
                              </div>
                            </div>
                          </div>
                        )}
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    onClick={async () => {
                      if(window.confirm('¿Eliminar este registro?')) {
                        try {
                          await apiFetch(`/waitlist/${w.id}`, { method: 'DELETE' });
                          fetchWaitlist();
                          setToast({ message: 'Registro eliminado', type: 'success' });
                        } catch (err: any) {
                          setToast({ message: err.message || 'Error al eliminar registro', type: 'error' });
                        }
                      }
                    }}
                  >Eliminar</button>
                </td>
              </tr>
            ))}
            {waitlist.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-6">No hay registros en la lista de espera.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
