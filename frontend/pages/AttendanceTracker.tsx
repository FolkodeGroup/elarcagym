import React, { useEffect, useState, useMemo } from 'react';
import { ReservationsAPI } from '../services/api';
import { AttendanceRecord, DailyAttendanceResponse } from '../types';
import {
  ChevronLeft, ChevronRight, Search, Clock, Users,
  CheckCircle2, XCircle, AlertCircle, Filter, X, Phone, Mail
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import Toast from '../components/Toast';

const AttendanceTracker: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filtros
  const [filterName, setFilterName] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const getLocalDateString = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  // FUNCIÓN DE CARGA DE DATOS SOLO USA RESERVATIONSAPI
  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await ReservationsAPI.getWithHabitual(selectedDate);
      const now = new Date();
      const processed = result.reservations.map((r: any) => {
        // Para reservas virtuales sin asistencia, verificar si pasaron 2 horas
        if (r.isVirtual && (r.attended === null || r.attended === undefined)) {
          const timeStr = r.end || r.time || r.start;
          if (timeStr) {
            const [h, m] = timeStr.split(':');
            const turnoEnd = new Date(selectedDate + 'T' + h.padStart(2, '0') + ':' + (m || '00').padStart(2, '0') + ':00');
            turnoEnd.setHours(turnoEnd.getHours() + 2);
            if (now > turnoEnd) {
              return { ...r, attended: false };
            }
          }
        }
        return r;
      });
      
      // Extraer slots únicos de todas las reservas (tanto manuales como virtuales)
      const uniqueTimes = new Set<string>();
      processed.forEach((r: any) => {
        const time = r.time || r.slot?.time;
        if (time) uniqueTimes.add(time);
      });
      const slots = Array.from(uniqueTimes).sort().map(time => ({ id: time, time, duration: 60 }));
      
      setData({
        date: result.date,
        stats: {
          total: processed.length,
          attended: processed.filter((r: any) => r.attended === true).length,
          absent: processed.filter((r: any) => r.attended === false).length,
          pending: processed.filter((r: any) => r.attended === null || r.attended === undefined).length
        },
        slots,
        reservations: processed,
        groupedByTime: {}
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
      setToast({ message: 'Error al cargar datos de asistencia', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Filtrado local por nombre
  const filteredReservations = useMemo(() => {
    if (!data?.reservations) return [];
    if (!filterName.trim()) return data.reservations;
    const search = filterName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return data.reservations.filter(r => {
      const name = (r.member ? `${r.member.firstName} ${r.member.lastName}` : r.clientName)
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(search);
    });
  }, [data?.reservations, filterName]);

  // Agrupar las reservas filtradas por horario
  const groupedFiltered = useMemo(() => {
    const groups: Record<string, AttendanceRecord[]> = {};
    for (const r of filteredReservations) {
      const time = r.time || r.slot?.time || 'Sin horario';
      if (!groups[time]) groups[time] = [];
      groups[time].push(r);
    }
    // Ordenar por hora
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredReservations]);

  const handleToggleAttendance = async (reservation: any) => {
    try {
      // Solo permitir marcar asistencia sobre reservas manuales (no virtuales)
      if (reservation.isVirtual) {
        setToast({ message: 'No se puede marcar asistencia directamente sobre horarios habituales. Cree una reserva manual primero.', type: 'info' });
        return;
      }
      const newAttended = reservation.attended === true ? false : true;
      await ReservationsAPI.update(reservation.id, { attended: newAttended });
      await loadData();
      setToast({
        message: newAttended ? 'Asistencia registrada' : 'Marcado como ausente',
        type: newAttended ? 'success' : 'info'
      });
    } catch (err: any) {
      setToast({ message: err?.message || 'Error al cambiar asistencia', type: 'error' });
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('549')) return clean;
    if (clean.startsWith('54')) return '549' + clean.substring(2);
    const noZero = clean.startsWith('0') ? clean.substring(1) : clean;
    return `549${noZero}`;
  };

  const getAttendanceIcon = (attended?: boolean | null) => {
    if (attended === true) return <CheckCircle2 size={18} className="text-green-500" />;
    if (attended === false) return <XCircle size={18} className="text-red-500" />;
    return <AlertCircle size={18} className="text-yellow-500" />;
  };

  const getAttendanceLabel = (attended?: boolean | null) => {
    if (attended === true) return 'Asistió';
    if (attended === false) return 'Ausente';
    return 'Pendiente';
  };

  const getAttendanceBg = (attended?: boolean | null) => {
    if (attended === true) return 'border-green-800/40 bg-green-900/10';
    if (attended === false) return 'border-red-800/40 bg-red-900/10';
    return 'border-yellow-800/30 bg-yellow-900/5';
  };

  const stats = data?.stats || { total: 0, attended: 0, absent: 0, pending: 0 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1a1a1a] p-4 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-display font-bold text-white">Registro de Asistencia</h2>
          <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-lg p-1">
            <button onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDate(getLocalDateString(d));
            }} className="p-1 hover:text-brand-gold transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-bold w-28 text-center text-gray-300 uppercase">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <button onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDate(getLocalDateString(d));
            }} className="p-1 hover:text-brand-gold transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-brand-gold" />
            <span className="text-xs text-gray-500 uppercase font-bold">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-green-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-xs text-gray-500 uppercase font-bold">Asistieron</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.attended}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-red-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-500" />
            <span className="text-xs text-gray-500 uppercase font-bold">Ausentes</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.absent}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-yellow-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-yellow-500" />
            <span className="text-xs text-gray-500 uppercase font-bold">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Filtros</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscar por nombre */}
          <div className="flex-1 flex items-center gap-2 bg-black rounded-lg border border-gray-700 px-3 py-2">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-full"
            />
            {filterName && (
              <button onClick={() => setFilterName('')} className="text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtrar por horario */}
          <div className="flex items-center gap-2 bg-black rounded-lg border border-gray-700 px-3 py-2">
            <Clock size={16} className="text-gray-500" />
            <select
              value={filterTime}
              onChange={e => setFilterTime(e.target.value)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            >
              <option value="" className="bg-gray-900">Todos los horarios</option>
              {(data?.slots || []).map(s => (
                <option key={s.id} value={s.time} className="bg-gray-900">{s.time}</option>
              ))}
            </select>
          </div>

          {/* Filtrar por estado */}
          <div className="flex gap-2">
            {[
              { value: '', label: 'Todos', color: 'text-gray-400 border-gray-700' },
              { value: 'attended', label: 'Asistieron', color: 'text-green-400 border-green-800' },
              { value: 'absent', label: 'Ausentes', color: 'text-red-400 border-red-800' },
              { value: 'pending', label: 'Pendientes', color: 'text-yellow-400 border-yellow-800' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filterStatus === opt.value
                    ? `${opt.color} bg-white/5`
                    : 'text-gray-600 border-gray-800 hover:border-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-12 text-center">
            <p className="text-gray-500">Cargando...</p>
          </div>
        ) : groupedFiltered.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-12 text-center">
            <Users size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 text-lg">No hay reservas para este día</p>
            <p className="text-gray-600 text-sm mt-1">Seleccioná otra fecha o ajustá los filtros</p>
          </div>
        ) : (
          groupedFiltered.map(([time, reservations]) => (
            <div key={time} className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
              {/* Time Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-black/40 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-brand-gold" />
                  <span className="text-lg font-bold text-white font-mono">{time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{reservations.length} socios</span>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle2 size={12} /> {reservations.filter(r => r.attended === true).length}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <XCircle size={12} /> {reservations.filter(r => r.attended === false).length}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-yellow-500">
                      <AlertCircle size={12} /> {reservations.filter(r => r.attended === null || r.attended === undefined).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="divide-y divide-gray-800/50">
                {reservations.map(reservation => {
                  const memberName = reservation.member
                    ? `${reservation.member.firstName} ${reservation.member.lastName}`
                    : reservation.clientName;
                  const hasException = reservation.member?.scheduleExceptions && reservation.member.scheduleExceptions.length > 0;

                  return (
                    <div
                      key={reservation.id}
                      className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02] border-l-4 ${getAttendanceBg(reservation.attended)}`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
                        {reservation.member?.photoUrl ? (
                          <img src={reservation.member.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🦁</div>
                        )}
                      </div>

                      {/* Name & Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{memberName}</span>
                          {hasException && (
                            <span className="text-[10px] bg-yellow-900/30 text-yellow-500 px-1.5 py-0.5 rounded font-bold">
                              EXCEPCIÓN
                            </span>
                          )}
                        </div>
                        {reservation.member && (
                          <div className="flex items-center gap-3 mt-0.5">
                            {reservation.member.phone && (
                              <span className="text-[11px] text-gray-600 flex items-center gap-1">
                                <Phone size={10} /> {reservation.member.phone}
                              </span>
                            )}
                            {reservation.member.status && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                reservation.member.status === 'ACTIVE' ? 'bg-green-900/30 text-green-500' :
                                reservation.member.status === 'DEBTOR' ? 'bg-red-900/30 text-red-500' :
                                'bg-gray-800 text-gray-500'
                              }`}>
                                {reservation.member.status === 'ACTIVE' ? 'ACTIVO' :
                                 reservation.member.status === 'DEBTOR' ? 'MOROSO' : 'INACTIVO'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Attendance Status */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${
                          reservation.attended === true ? 'text-green-400' :
                          reservation.attended === false ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {getAttendanceLabel(reservation.attended)}
                        </span>
                        {getAttendanceIcon(reservation.attended)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleAttendance(reservation)}
                          className={`p-2 rounded-lg transition-colors ${
                            reservation.attended === true
                              ? 'bg-red-900/20 hover:bg-red-900/40 text-red-400'
                              : 'bg-green-900/20 hover:bg-green-900/40 text-green-400'
                          }`}
                          title={reservation.attended === true ? 'Marcar como ausente' : 'Marcar como asistió'}
                        >
                          {reservation.attended === true ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        {reservation.member?.phone && (
                          <button
                            onClick={() => window.open(`https://wa.me/${formatPhoneNumber(reservation.member!.phone)}`, '_blank')}
                            className="p-2 bg-green-900/20 hover:bg-green-900/40 text-green-400 rounded-lg transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <FaWhatsapp size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AttendanceTracker;
