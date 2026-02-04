import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los slots con sus reservaciones
  router.get('/', async (req, res) => {
    try {
      const { date, startDate, endDate } = req.query;
      
      let whereClause: any = {};
      
      if (date) {
        // Filtrar por fecha específica
        const dateObj = new Date(date as string);
        const nextDay = new Date(dateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.date = {
          gte: dateObj,
          lt: nextDay
        };
      } else if (startDate && endDate) {
        // Filtrar por rango de fechas
        whereClause.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      const slots = await prisma.slot.findMany({
        where: whereClause,
        include: {
          reservations: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }]
      });
      res.json(slots);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener un slot por ID
  router.get('/:id', async (req, res) => {
    try {
      const slot = await prisma.slot.findUnique({
        where: { id: req.params.id },
        include: {
          reservations: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });
      if (!slot) return res.status(404).json({ error: 'Slot not found' });
      res.json(slot);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear un slot
  router.post('/', async (req, res) => {
    try {
      const { date, time, duration, status, target, color } = req.body;
      // Convertir la fecha y hora a formato ISO con zona horaria local
      const localDateTime = `${date}T${time}:00-03:00`;
      const slot = await prisma.slot.create({
        data: {
          date: localDateTime,
          time,
          duration: duration || 60,
          status: status || 'available',
          target: target || null,
          color: color || null
        },
        include: {
          reservations: true
        }
      });
      res.status(201).json(slot);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un slot
  router.put('/:id', async (req, res) => {
    try {
      const { date, ...rest } = req.body;
      // Convertir la fecha y hora a formato ISO con zona horaria local si se actualiza
      let updateData = { ...rest };
      if (date && rest.time) {
        updateData.date = `${date}T${rest.time}:00-03:00`;
      } else if (date) {
        updateData.date = `${date}T00:00:00-03:00`;
      }
      const slot = await prisma.slot.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          reservations: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });
      res.json(slot);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un slot (y sus reservaciones por cascade)
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.slot.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
