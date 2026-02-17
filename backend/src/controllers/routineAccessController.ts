import { Router, type Request, type Response } from 'express';
import { verifyRoutineToken } from '../utils/routineToken.js';
import { isWithinGymRadius } from '../config/gymLocation.js';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getDayName, getHabitualSchedulesForDay, generateVirtualReservations } from '../utils/habitualScheduleUtils.js';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

// Interfaces para tipado
interface ReservationWithSlot {
  id: string;
  memberId?: string;
  accessedAt?: Date | string | null;
  attended?: boolean | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  slot: {
    id: string;
    date: Date | string;
    time: string;
  };
}

/**
 * Obtiene el inicio y fin del día actual en zona horaria de Buenos Aires (como fechas UTC)
 */
function getTodayBoundsInBuenosAires(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  const zonedNow = toZonedTime(now, TIME_ZONE);
  const year = zonedNow.getFullYear();
  const month = String(zonedNow.getMonth() + 1).padStart(2, '0');
  const day = String(zonedNow.getDate()).padStart(2, '0');
  
  const startOfDay = fromZonedTime(`${year}-${month}-${day}T00:00:00`, TIME_ZONE);
  const endOfDay = fromZonedTime(`${year}-${month}-${day}T23:59:59.999`, TIME_ZONE);
  
  return { startOfDay, endOfDay };
}

/**
 * Calcula el tiempo del slot en UTC (combinando fecha y hora del slot con zona horaria de Buenos Aires)
 */
function getSlotTimeInUTC(slot: { date: Date | string; time: string }): Date {
  const slotDate = new Date(slot.date);
  const year = slotDate.getFullYear();
  const month = String(slotDate.getMonth() + 1).padStart(2, '0');
  const day = String(slotDate.getDate()).padStart(2, '0');
  // La hora del slot está en formato "HH:mm"
  const slotDateTimeStr = `${year}-${month}-${day}T${slot.time}:00`;
  return fromZonedTime(slotDateTimeStr, TIME_ZONE);
}

/**
 * Verifica si el acceso al turno está dentro del plazo de 2 horas desde el horario reservado
 */
function isWithinAccessWindow(slot: { date: Date | string; time: string }, now: Date = new Date()): boolean {
  const slotTimeUTC = getSlotTimeInUTC(slot);
  const diffMs = now.getTime() - slotTimeUTC.getTime();
  console.log('[ACCESS WINDOW] now:', now.toISOString(), 'slotTimeUTC:', slotTimeUTC.toISOString(), 'diffMs:', diffMs, 'WINDOW_MS:', WINDOW_MS);
  // Permitir acceso desde el inicio del turno hasta 2 horas después
  return diffMs >= 0 && diffMs <= WINDOW_MS;
}

export default function(prisma: any) {
  const router = Router();

  // Endpoint para validar token, verificar DNI, registrar asistencia y devolver rutina
  router.post('/validate-routine-access', async (req: Request, res: Response) => {
    try {
      const { token, dni } = req.body;
      if (!token || !dni) {
        res.status(400).json({ error: 'Token y DNI requeridos' });
        return;
      }
      const decoded: any = verifyRoutineToken(token);
      if (!decoded) {
        res.status(401).json({ error: 'Token inválido o expirado' });
        return;
      }
      // Buscar miembro por DNI y comparar con el del token
      const member = await prisma.member.findUnique({ where: { dni } });
      if (!member || member.id !== decoded.memberId) {
        res.status(404).json({ error: 'Socio no encontrado o no coincide' });
        return;
      }
      // Registrar asistencia en la reserva
      await prisma.reservation.update({
        where: { id: decoded.slotId },
        data: { attended: true }
      });
      // Devolver rutina
      const memberWithRoutine = await prisma.member.findUnique({
        where: { id: member.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          routines: {
            include: {
              days: {
                include: {
                  exercises: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      res.json({ member: memberWithRoutine });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Endpoint para autoconsulta: solo DNI, busca turno activo, marca asistencia y devuelve rutina
  router.post('/selfservice', async (req: Request, res: Response) => {
    try {
      const { dni, latitude, longitude } = req.body;
      if (!dni) {
        res.status(400).json({ error: 'DNI requerido' });
        return;
      }
      
      // Validar geolocalización si se proporciona
      if (latitude !== undefined && longitude !== undefined) {
        const withinRadius = isWithinGymRadius(latitude, longitude);
        if (!withinRadius) {
          res.status(403).json({ 
            error: 'Debes estar en el gimnasio para acceder a tu rutina.',
            code: 'LOCATION_OUT_OF_RANGE'
          });
          return;
        }
      } else {
        // Si no se proporciona ubicación, rechazar el acceso
        res.status(400).json({ 
          error: 'Se requiere tu ubicación para acceder a la rutina.',
          code: 'LOCATION_REQUIRED'
        });
        return;
      }
      

      // Buscar miembro por DNI e incluir horarios habituales y pagos
      const member = await prisma.member.findUnique({
        where: { dni },
        include: {
          habitualSchedules: true,
          scheduleExceptions: true,
          payments: { orderBy: { date: 'desc' } }
        }
      });
      if (!member) {
        res.status(404).json({ error: 'Socio no encontrado' });
        return;
      }

      // Validar cuota al día (último pago dentro del mes actual)
      const now = new Date();
      const lastPayment = member.payments?.[0];
      if (!lastPayment || (now.getFullYear() !== lastPayment.date.getFullYear() || now.getMonth() !== lastPayment.date.getMonth())) {
        res.status(403).json({ error: 'Cuota no está al día', code: 'PAYMENT_REQUIRED' });
        return;
      }

      // Obtener los límites del día en zona horaria de Buenos Aires
      const { startOfDay, endOfDay } = getTodayBoundsInBuenosAires();
      // Buscar todas las reservas del socio con su slot
      const allReservations: ReservationWithSlot[] = await prisma.reservation.findMany({
        where: { memberId: member.id },
        include: { slot: true }
      });
      // Filtrar reservas de hoy
      const todayReservations = allReservations.filter((r: ReservationWithSlot) => {
        const slotDateLocal = toZonedTime(new Date(r.slot.date), TIME_ZONE);
        const nowLocal = toZonedTime(now, TIME_ZONE);
        return (
          slotDateLocal.getFullYear() === nowLocal.getFullYear() &&
          slotDateLocal.getMonth() === nowLocal.getMonth() &&
          slotDateLocal.getDate() === nowLocal.getDate()
        );
      });

      // Generar reservas virtuales si no hay reservas manuales activas
      let combinedReservations = [...todayReservations];
      if (member.habitualSchedules && member.habitualSchedules.length > 0) {
        // Usar locale local (con TZ=Buenos Aires configurado en Docker) para obtener YYYY-MM-DD correcto
        const todayStr = now.toLocaleDateString('sv-SE');
        const virtuals = generateVirtualReservations([member], todayStr, todayReservations);
        // Simular slot para virtuales
        const virtualReservations = virtuals.map(v => ({
          id: v.id,
          memberId: v.memberId,
          accessedAt: null,
          attended: null,
          clientEmail: v.clientEmail,
          clientPhone: v.clientPhone,
          slot: {
            id: v.id,
            date: now,
            time: v.time
          },
          isVirtual: true
        }));
        combinedReservations = [...todayReservations, ...virtualReservations];
        console.log('[SELFSERVICE] Reservas virtuales generadas:', virtualReservations.length);
      }


      // Separar reservas manuales y virtuales
      const manualReservations = combinedReservations.filter((r: any) => !r.isVirtual);
      const virtualReservations = combinedReservations.filter((r: any) => r.isVirtual);

      let reservation: any = undefined;
      let allowAccess = false;

      if (manualReservations.length > 0) {
        // Si hay reservas manuales, solo considerar esas
        reservation = manualReservations.find((r: any) => {
          if (r.accessedAt) {
            const accessedAt = new Date(r.accessedAt);
            const diffMs = now.getTime() - accessedAt.getTime();
            console.log('[SELFSERVICE] Reserva manual con accessedAt:', {
              now: now.toISOString(),
              accessedAt: accessedAt.toISOString(),
              diffMs,
              WINDOW_MS
            });
            return diffMs >= 0 && diffMs <= WINDOW_MS;
          }
          // Para manuales sin accessedAt
          return isWithinAccessWindow(r.slot, now);
        });
      } else {
        // Si no hay manuales, considerar virtuales
        reservation = virtualReservations.find((r: any) => {
          // Validar si la hora habitual está dentro de la ventana de acceso
          const [h, m] = r.slot.time.split(':');
          const slotDateTime = new Date(now);
          slotDateTime.setHours(Number(h), Number(m), 0, 0);
          const diffMs = now.getTime() - slotDateTime.getTime();
          console.log('[SELFSERVICE] Reserva virtual:', {
            now: now.toISOString(),
            slotTime: slotDateTime.toISOString(),
            habitual: r.slot.time,
            diffMs,
            WINDOW_MS
          });
          return diffMs >= 0 && diffMs <= WINDOW_MS;
        });
      }

      if (reservation) {
        allowAccess = true;
        if (!reservation.isVirtual && !reservation.accessedAt) {
          // Marcar asistencia solo si es reserva manual y no fue accedida
          await prisma.reservation.update({ 
            where: { id: reservation.id }, 
            data: { accessedAt: now, attended: true } 
          });
        }
      }

      console.log('[SELFSERVICE] Reserva encontrada:', reservation?.id, 'allowAccess:', allowAccess, 'isVirtual:', reservation?.isVirtual);

      if (!reservation || !allowAccess) {
        res.status(403).json({ 
          error: 'No tienes un turno activo para hoy.',
          code: 'NO_ACTIVE_SLOT'
        });
        return;
      }

      // Devolver rutina y datos de contacto
      const memberWithRoutine = await prisma.member.findUnique({
        where: { id: member.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          phone: true,
          routines: {
            include: {
              days: { include: { exercises: true } }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Si los datos de contacto están en la reserva, usarlos como fallback
      const memberData: any = { ...memberWithRoutine };
      if (reservation) {
        if (!memberData.email && reservation.clientEmail) memberData.email = reservation.clientEmail;
        if (!memberData.phone && reservation.clientPhone) memberData.phone = reservation.clientPhone;
      }
      
      res.json({ member: memberData });
    } catch (e) {
      console.error('[SELFSERVICE] Error:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
