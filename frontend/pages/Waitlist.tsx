import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/waitlist');
      setWaitlist(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert('Error al cargar la lista de espera');
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
      await axios.post('/waitlist', {
        ...form,
        reservationDate: new Date(form.reservationDate).toISOString()
      });
      setForm({ firstName: '', lastName: '', phone: '', reservationDate: '', status: '' });
      fetchWaitlist();
    } catch (err) {
      alert('Error al guardar registro');
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
                    onClick={async () => {
                      if(window.confirm('¿Agregar este socio?')) {
                        await axios.post(`/waitlist/${w.id}/convert`);
                        fetchWaitlist();
                      }
                    }}
                  >Agregar a Socio</button>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    onClick={async () => {
                      if(window.confirm('¿Eliminar este registro?')) {
                        await axios.delete(`/waitlist/${w.id}`);
                        fetchWaitlist();
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
    </div>
  );
};

export default WaitlistPage;
