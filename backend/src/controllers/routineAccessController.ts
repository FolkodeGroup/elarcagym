import { Router, type Request, type Response } from 'express';
import { verifyRoutineToken } from '../utils/routineToken.js';
import { isWithinGymRadius } from '../config/gymLocation.js';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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
      
      // Buscar miembro por DNI
      const member = await prisma.member.findUnique({ where: { dni } });
      if (!member) {
        res.status(404).json({ error: 'Socio no encontrado' });
        return;
      }

      // Obtener los límites del día en zona horaria de Buenos Aires
      const { startOfDay, endOfDay } = getTodayBoundsInBuenosAires();
      const now = new Date();
      
      // Buscar todas las reservas del socio con su slot
      const allReservations: ReservationWithSlot[] = await prisma.reservation.findMany({
        where: { memberId: member.id },
        include: { slot: true }
      });
      
      console.log('[SELFSERVICE] Reservas del socio:', allReservations.length);
      
      // Filtrar reservas de hoy
      const todayReservations = allReservations.filter((r: ReservationWithSlot) => {
        const slotDate = new Date(r.slot.date);
        return slotDate >= startOfDay && slotDate <= endOfDay;
      });
      
      console.log('[SELFSERVICE] Reservas de hoy:', todayReservations.length);

      let reservation: ReservationWithSlot | undefined;
      let allowAccess = false;

      // Caso 1: Buscar reserva con accessedAt dentro de la ventana de 2 horas
      reservation = todayReservations.find((r: ReservationWithSlot) => {
        if (!r.accessedAt) return false;
        const accessedAt = new Date(r.accessedAt);
        const diffMs = now.getTime() - accessedAt.getTime();
        return diffMs >= 0 && diffMs <= WINDOW_MS;
      });

      if (reservation) {
        // Acceso dentro de la ventana de acceso anterior
        const accessedAt = new Date(reservation.accessedAt!);
        console.log('[ACCESO RUTINA] Acceso posterior. now:', now.toISOString(), 'accessedAt:', accessedAt.toISOString());
        allowAccess = true;
      } else {
        // Caso 2: Buscar reserva sin accessedAt que esté dentro de la ventana del turno
        reservation = todayReservations.find((r: ReservationWithSlot) => {
          if (r.accessedAt) return false;
          // Verificar que el turno esté dentro de la ventana de 2 horas
          return isWithinAccessWindow(r.slot, now);
        });

        if (reservation) {
          console.log('[ACCESO RUTINA] Primer acceso. now:', now.toISOString(), 'slotTime:', reservation.slot.time);
          // Marcar como asistió y registrar el momento del acceso
          await prisma.reservation.update({ 
            where: { id: reservation.id }, 
            data: { accessedAt: now, attended: true } 
          });
          allowAccess = true;
        } else {
          // Caso 3: Verificar si hay algún turno que ya pasó más de 2 horas (turno expirado)
          const expiredReservation = todayReservations.find((r: ReservationWithSlot) => {
            if (r.accessedAt) return false;
            const slotTimeUTC = getSlotTimeInUTC(r.slot);
            const diffMs = now.getTime() - slotTimeUTC.getTime();
            return diffMs > WINDOW_MS; // Más de 2 horas desde el turno
          });

          if (expiredReservation) {
            res.status(403).json({ 
              error: 'Tu turno ha expirado. Solo puedes acceder hasta 2 horas después del horario reservado.',
              code: 'SLOT_EXPIRED'
            });
            return;
          }

          // Caso 4: Hay turno pero aún no es la hora (turno futuro)
          const futureReservation = todayReservations.find((r: ReservationWithSlot) => {
            if (r.accessedAt) return false;
            const slotTimeUTC = getSlotTimeInUTC(r.slot);
            return now.getTime() < slotTimeUTC.getTime();
          });

          if (futureReservation) {
            res.status(403).json({ 
              error: `Tu turno es a las ${futureReservation.slot.time}. Vuelve a intentar en ese horario.`,
              code: 'SLOT_NOT_STARTED'
            });
            return;
          }
        }
      }

      console.log('[SELFSERVICE] Reserva encontrada:', reservation?.id, 'allowAccess:', allowAccess);
      
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
