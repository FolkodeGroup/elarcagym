import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los recordatorios
  router.get('/', requirePermission('reminders.view'), async (req, res) => {
    try {
      const reminders = await prisma.reminder.findMany({
        orderBy: { date: 'asc' }
      });
      res.json(reminders);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener un recordatorio por ID
  router.get('/:id', requirePermission('reminders.view'), async (req, res) => {
    try {
      const reminder = await prisma.reminder.findUnique({
        where: { id: req.params.id }
      });
      if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
      res.json(reminder);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear un recordatorio
  router.post('/', requirePermission('reminders.create'), async (req, res) => {
    try {
      const { text, date, priority } = req.body;
      const reminder = await prisma.reminder.create({
        data: {
          text,
          date: new Date(date),
          priority: priority || 'medium'
        }
      });
      res.status(201).json(reminder);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un recordatorio
  router.put('/:id', requirePermission('reminders.edit'), async (req, res) => {
    try {
      const { date, ...rest } = req.body;
      const reminder = await prisma.reminder.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          date: date ? new Date(date) : undefined
        }
      });
      res.json(reminder);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un recordatorio
  router.delete('/:id', requirePermission('reminders.delete'), async (req, res) => {
    try {
      await prisma.reminder.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
