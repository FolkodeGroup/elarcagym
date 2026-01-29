import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los slots
  router.get('/', async (req, res) => {
    const slots = await prisma.slot.findMany({ include: { reservations: true } });
    res.json(slots);
  });

  // Crear un slot
  router.post('/', async (req, res) => {
    try {
      const slot = await prisma.slot.create({ data: req.body });
      res.status(201).json(slot);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un slot
  router.put('/:id', async (req, res) => {
    try {
      const slot = await prisma.slot.update({ where: { id: req.params.id }, data: req.body });
      res.json(slot);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un slot
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
