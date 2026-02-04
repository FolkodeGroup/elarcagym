import { Router, type Request, type Response } from 'express';
import { fromZonedTime } from 'date-fns-tz';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

/**
 * Calcula el tiempo del slot en UTC (combinando fecha y hora del slot con zona horaria de Buenos Aires)
 */
function getSlotTimeInUTC(slot: { date: Date | string; time: string }): Date {
  const slotDate = new Date(slot.date);
  const year = slotDate.getFullYear();
  const month = String(slotDate.getMonth() + 1).padStart(2, '0');
  const day = String(slotDate.getDate()).padStart(2, '0');
  const slotDateTimeStr = `${year}-${month}-${day}T${slot.time}:00`;
  return fromZonedTime(slotDateTimeStr, TIME_ZONE);
}

/**
 * Verifica si se puede marcar como "no asistió" (dentro de 2 horas del horario reservado)
 */
function canMarkAsNotAttended(slot: { date: Date | string; time: string }, now: Date = new Date()): { allowed: boolean; reason?: string } {
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
  router.get('/', async (req, res) => {
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

  // Obtener una reserva por ID
  router.get('/:id', async (req, res) => {
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
  router.post('/', async (req, res) => {
    try {
      const { slotId, memberId, clientName, clientPhone, clientEmail, notes } = req.body;
      
      // Verificar que el slot existe
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      if (!slot) {
        return res.status(404).json({ error: 'Slot not found' });
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
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar una reserva
  router.put('/:id', async (req: Request, res: Response) => {
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
  router.delete('/:id', async (req, res) => {
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
  router.patch('/:id/attendance', async (req: Request, res: Response) => {
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
  router.get('/:id/can-change-attendance', async (req: Request, res: Response) => {
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
