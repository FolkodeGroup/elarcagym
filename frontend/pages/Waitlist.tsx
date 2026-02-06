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
    <div className="container">
      <h2>Lista de Espera</h2>
      <form onSubmit={handleSubmit} className="waitlist-form">
        <input name="firstName" placeholder="Nombre" value={form.firstName} onChange={handleChange} required />
        <input name="lastName" placeholder="Apellido" value={form.lastName} onChange={handleChange} required />
        <input name="phone" placeholder="Celular" value={form.phone} onChange={handleChange} required />
        <input name="reservationDate" type="datetime-local" value={form.reservationDate} onChange={handleChange} required />
        <input name="status" placeholder="Estado (opcional)" value={form.status} onChange={handleChange} />
        <button type="submit" disabled={loading}>Guardar</button>
      </form>
      <hr />
      <table className="waitlist-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Celular</th>
            <th>Horario Reserva</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {waitlist.map(w => (
            <tr key={w.id}>
              <td>{w.firstName}</td>
              <td>{w.lastName}</td>
              <td>{w.phone}</td>
              <td>{new Date(w.reservationDate).toLocaleString()}</td>
              <td>{w.status || 'pendiente'}</td>
              <td>
                <button onClick={async () => {
                  if(window.confirm('¿Agregar este socio?')) {
                    await axios.post(`/waitlist/${w.id}/convert`);
                    fetchWaitlist();
                  }
                }}>Agregar a Socio</button>
                <button onClick={async () => {
                  if(window.confirm('¿Eliminar este registro?')) {
                    await axios.delete(`/waitlist/${w.id}`);
                    fetchWaitlist();
                  }
                }}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WaitlistPage;
