import { Router, type Request, type Response } from 'express';

export default function(prisma: any) {
  const router = Router();

  /**
   * GET /attendance/daily?date=YYYY-MM-DD
   * Obtiene todas las reservas del día con info de socio, slot y asistencia.
   * Soporta filtros opcionales: time, name, status (attended/pending/absent)
   */
  router.get('/daily', async (req: Request, res: Response) => {
    try {
      const { date, time, name, status } = req.query;
      
      if (!date || typeof date !== 'string') {
        res.status(400).json({ error: 'Parámetro "date" requerido (YYYY-MM-DD)' });
        return;
      }

      // Construir las fechas de inicio y fin del día
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);

      // Buscar todos los slots del día
      const slots = await prisma.slot.findMany({
        where: {
          date: {
            gte: dayStart,
            lte: dayEnd
          },
          ...(time && typeof time === 'string' ? { time } : {})
        },
        orderBy: { time: 'asc' }
      });

      const slotIds = slots.map((s: any) => s.id);

      // Buscar reservas de esos slots con info del miembro
      const whereClause: any = {
        slotId: { in: slotIds }
      };

      // Filtrar por nombre del socio
      if (name && typeof name === 'string') {
        whereClause.OR = [
          { clientName: { contains: name, mode: 'insensitive' } },
          {
            member: {
              OR: [
                { firstName: { contains: name, mode: 'insensitive' } },
                { lastName: { contains: name, mode: 'insensitive' } }
              ]
            }
          }
        ];
      }

      // Filtrar por estado de asistencia
      if (status && typeof status === 'string') {
        switch (status) {
          case 'attended':
            whereClause.attended = true;
            break;
          case 'absent':
            whereClause.attended = false;
            break;
          case 'pending':
            whereClause.attended = null;
            break;
        }
      }

      const reservations = await prisma.reservation.findMany({
        where: whereClause,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              photoUrl: true,
              status: true,
              habitualSchedules: true,
              scheduleExceptions: {
                where: {
                  date: {
                    gte: dayStart,
                    lte: dayEnd
                  }
                }
              }
            }
          },
          slot: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Agrupar por horario para la vista
      const groupedByTime: Record<string, any[]> = {};
      for (const reservation of reservations) {
        const slotTime = reservation.slot?.time || 'Sin horario';
        if (!groupedByTime[slotTime]) {
          groupedByTime[slotTime] = [];
        }
        groupedByTime[slotTime].push(reservation);
      }

      // Estadísticas del día
      const stats = {
        total: reservations.length,
        attended: reservations.filter((r: any) => r.attended === true).length,
        absent: reservations.filter((r: any) => r.attended === false).length,
        pending: reservations.filter((r: any) => r.attended === null || r.attended === undefined).length
      };

      res.json({
        date,
        stats,
        slots: slots.map((s: any) => ({ id: s.id, time: s.time, duration: s.duration })),
        reservations,
        groupedByTime
      });
    } catch (e) {
      console.error('[ATTENDANCE] Error:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  /**
   * GET /attendance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Resumen de asistencia por rango de fechas
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query;
      
      if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
        res.status(400).json({ error: 'Parámetros "from" y "to" requeridos (YYYY-MM-DD)' });
        return;
      }

      const startDate = new Date(`${from}T00:00:00.000Z`);
      const endDate = new Date(`${to}T23:59:59.999Z`);

      const slots = await prisma.slot.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        }
      });

      const slotIds = slots.map((s: any) => s.id);

      const reservations = await prisma.reservation.findMany({
        where: { slotId: { in: slotIds } },
        include: {
          slot: { select: { date: true, time: true } },
          member: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      res.json({
        from,
        to,
        total: reservations.length,
        attended: reservations.filter((r: any) => r.attended === true).length,
        absent: reservations.filter((r: any) => r.attended === false).length,
        pending: reservations.filter((r: any) => r.attended === null || r.attended === undefined).length,
        reservations
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
