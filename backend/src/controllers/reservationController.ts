import { Router, type Request, type Response } from 'express';
import { fromZonedTime } from 'date-fns-tz';
import { 
  generateVirtualReservations, 
  combineReservationsWithHabitual,
  getDayName 
} from '../utils/habitualScheduleUtils.js';
import { requirePermission } from '../middleware/auth.js';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas en milisegundos para permitir marcar ausencias de todo el día

/**
 * Calcula el tiempo del slot en UTC (combinando fecha y hora del slot con zona horaria de Buenos Aires)
 */
function getSlotTimeInUTC(slot: { date: Date | string; time: string }): Date {
  // Si slot.date es un string, usarlo directamente (se espera formato 'YYYY-MM-DD')
  // Si es un Date, convertir a formato 'YYYY-MM-DD' en UTC
  let dateStr: string;
  if (typeof slot.date === 'string') {
    dateStr = slot.date.slice(0, 10); // Tomar solo 'YYYY-MM-DD'
  } else {
    const year = slot.date.getUTCFullYear();
    const month = String(slot.date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(slot.date.getUTCDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  }
  const slotDateTimeStr = `${dateStr}T${slot.time}:00`;
  return fromZonedTime(slotDateTimeStr, TIME_ZONE);
}

/**
 * Verifica si se puede marcar como "no asistió" (dentro de 2 horas del horario reservado)
 */
export function canMarkAsNotAttended(slot: { date: Date | string; time: string }, now: Date = new Date()): { allowed: boolean; reason?: string } {
  const slotTimeUTC = getSlotTimeInUTC(slot);
  const diffMs = now.getTime() - slotTimeUTC.getTime();
  
  if (diffMs < 0) {
    return { allowed: false, reason: 'El turno aún no ha comenzado' };
  }
  
  if (diffMs > WINDOW_MS) {
    return { allowed: false, reason: 'Han pasado más de 2 horas desde el horario reservado. No se puede modificar la asistencia.' };
  }
  
  return { allowed: true };
}

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las reservas con slot y miembro
  router.get('/', requirePermission('reservations.view'), async (req, res) => {
    try {
      const reservations = await prisma.reservation.findMany({
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          slot: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(reservations);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  /**
   * Nuevo endpoint: Obtener reservas con horarios habituales incluidos para una fecha
   * GET /reservations/with-habitual?date=YYYY-MM-DD
   */
  router.get('/with-habitual', requirePermission('reservations.view'), async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Fecha requerida en query param: ?date=YYYY-MM-DD' });
      }

      // Validar formato de fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
      }

      // Obtener todos los socios activos con sus horarios habituales
      const members = await prisma.member.findMany({
        where: { status: 'ACTIVE' },
        include: {
          habitualSchedules: true,
          scheduleExceptions: true
        }
      });

      // Obtener todas las reservas manuales para la fecha especificada
      const dateSlots = await prisma.slot.findMany({
        where: {
          date: {
            gte: new Date(date + 'T00:00:00.000Z'),
            lt: new Date(date + 'T23:59:59.999Z')
          }
        }
      });

      const slotIds = dateSlots.map((s: any) => s.id);
      
      const manualReservations = await prisma.reservation.findMany({
        where: {
          slotId: { in: slotIds }
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              photoUrl: true
            }
          },
          slot: true
        }
      });

      // Combinar reservas manuales con virtuales generadas desde horarios habituales
      const combinedReservations = combineReservationsWithHabitual(
        manualReservations,
        members,
        date
      );

      res.json({
        date,
        total: combinedReservations.length,
        manual: manualReservations.length,
        virtual: combinedReservations.length - manualReservations.length,
        reservations: combinedReservations
      });
    } catch (e) {
      console.error('Error in /with-habitual:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener una reserva por ID
  router.get('/:id', requirePermission('reservations.view'), async (req, res) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          slot: true
        }
      });
      if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
      res.json(reservation);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear una reserva
  router.post('/', requirePermission('reservations.create'), async (req, res) => {
    try {
      const { slotId, memberId, clientName, clientPhone, clientEmail, notes } = req.body;

      // Validación explícita de datos requeridos
      if (!slotId || (!memberId && !clientName)) {
        return res.status(400).json({ error: 'slotId y (memberId o clientName) son requeridos' });
      }

      // Verificar que el slot existe
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      if (!slot) {
        return res.status(404).json({ error: 'Slot not found' });
      }

      // 1. Limitar a 15 personas por turno (manuales + virtuales)
      // Formato YYYY-MM-DD para generateVirtualReservations
      const dateStr = slot.date.toISOString().split('T')[0];
      const membersForVirtuals = await prisma.member.findMany({
        where: { status: 'ACTIVE' },
        include: {
          habitualSchedules: true,
          scheduleExceptions: true
        }
      });

      const virtualRes = generateVirtualReservations(membersForVirtuals, dateStr);
      const virtualCountForThisTime = virtualRes.filter((v: any) => v.time === slot.time).length;
      const manualCountForThisSlot = await prisma.reservation.count({ where: { slotId } });

      if (virtualCountForThisTime + manualCountForThisSlot >= 15) {
        return res.status(400).json({ error: 'Cupo completo. El límite es de 15 personas por turno.' });
      }

      // Verificar que el miembro no tenga ya una reserva en este slot
      if (memberId) {
        const existingReservation = await prisma.reservation.findFirst({
          where: { slotId, memberId }
        });
        if (existingReservation) {
          return res.status(409).json({ error: 'Member already has a reservation in this slot' });
        }
      }

      const reservation = await prisma.reservation.create({
        data: {
          slotId,
          memberId: memberId || null,
          clientName,
          clientPhone: clientPhone || null,
          clientEmail: clientEmail || null,
          notes: notes || null
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          slot: true
        }
      });

      // Actualizar estado del slot
      await prisma.slot.update({
        where: { id: slotId },
        data: { status: 'reserved' }
      });

      res.status(201).json(reservation);
    } catch (e) {
      console.error('Error en POST /reservations:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Actualizar una reserva
  router.put('/:id', requirePermission('reservations.edit'), async (req: Request, res: Response) => {
    try {
      const { attended, ...otherData } = req.body;
      
      // Si se intenta cambiar el estado de asistencia, validar la ventana de tiempo
      if (attended !== undefined) {
        // Obtener la reserva actual con su slot
        const currentReservation = await prisma.reservation.findUnique({
          where: { id: req.params.id },
          include: { slot: true }
        });
        
        if (!currentReservation) {
          res.status(404).json({ error: 'Reserva no encontrada' });
          return;
        }
        
        // Si ya asistió (attended === true) y se intenta marcar como no asistió (attended === false)
        if (currentReservation.attended === true && attended === false) {
          const check = canMarkAsNotAttended(currentReservation.slot);
          if (!check.allowed) {
            res.status(403).json({ 
              error: check.reason,
              code: 'ATTENDANCE_CHANGE_NOT_ALLOWED'
            });
            return;
          }
        }
        
        // Si se intenta marcar como no asistió (attended === false) por primera vez
        if (attended === false && currentReservation.attended !== false) {
          const check = canMarkAsNotAttended(currentReservation.slot);
          if (!check.allowed) {
            res.status(403).json({ 
              error: check.reason,
              code: 'ATTENDANCE_CHANGE_NOT_ALLOWED'
            });
            return;
          }
        }
      }
      
      const reservation = await prisma.reservation.update({
        where: { id: req.params.id },
        data: { ...otherData, attended },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          slot: true
        }
      });
      res.json(reservation);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar una reserva
  router.delete('/:id', requirePermission('reservations.delete'), async (req, res) => {
    try {
      const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      
      await prisma.reservation.delete({ where: { id: req.params.id } });
      
      // Verificar si hay más reservas en el slot
      const remainingReservations = await prisma.reservation.count({
        where: { slotId: reservation.slotId }
      });
      
      // Si no hay más reservas, actualizar estado del slot a available
      if (remainingReservations === 0) {
        await prisma.slot.update({
          where: { id: reservation.slotId },
          data: { status: 'available' }
        });
      }
      
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Marcar asistencia
  router.patch('/:id/attendance', requirePermission('reservations.edit'), async (req: Request, res: Response) => {
    try {
      const { attended } = req.body;
      
      // Obtener la reserva actual con su slot
      const currentReservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: { slot: true }
      });
      
      if (!currentReservation) {
        res.status(404).json({ error: 'Reserva no encontrada' });
        return;
      }
      
      // Si se intenta marcar como no asistió, validar la ventana de tiempo
      if (attended === false) {
        const check = canMarkAsNotAttended(currentReservation.slot);
        if (!check.allowed) {
          res.status(403).json({ 
            error: check.reason,
            code: 'ATTENDANCE_CHANGE_NOT_ALLOWED'
          });
          return;
        }
      }
      
      const reservation = await prisma.reservation.update({
        where: { id: req.params.id },
        data: { attended },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          slot: true
        }
      });
      res.json(reservation);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Endpoint para verificar si se puede cambiar la asistencia
  router.get('/:id/can-change-attendance', requirePermission('reservations.view'), async (req: Request, res: Response) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: { slot: true }
      });
      
      if (!reservation) {
        res.status(404).json({ error: 'Reserva no encontrada' });
        return;
      }
      
      const check = canMarkAsNotAttended(reservation.slot);
      res.json({
        canChange: check.allowed,
        reason: check.reason,
        attended: reservation.attended,
        accessedAt: reservation.accessedAt
      });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
