import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las reservas
  router.get('/', async (req, res) => {
    const reservations = await prisma.reservation.findMany({ include: { member: true, slot: true } });
    res.json(reservations);
  });

  // Crear una reserva
  router.post('/', async (req, res) => {
    try {
      const reservation = await prisma.reservation.create({ data: req.body });
      res.status(201).json(reservation);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
