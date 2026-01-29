import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los recordatorios
  router.get('/', async (req, res) => {
    const reminders = await prisma.reminder.findMany();
    res.json(reminders);
  });

  // Crear un recordatorio
  router.post('/', async (req, res) => {
    try {
      const reminder = await prisma.reminder.create({ data: req.body });
      res.status(201).json(reminder);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un recordatorio
  router.put('/:id', async (req, res) => {
    try {
      const reminder = await prisma.reminder.update({ where: { id: req.params.id }, data: req.body });
      res.json(reminder);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un recordatorio
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.reminder.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
