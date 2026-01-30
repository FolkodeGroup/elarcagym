import { Router } from 'express';

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
  router.put('/:id', async (req, res) => {
    try {
      const reservation = await prisma.reservation.update({
        where: { id: req.params.id },
        data: req.body,
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
  router.patch('/:id/attendance', async (req, res) => {
    try {
      const { attended } = req.body;
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

  return router;
}
