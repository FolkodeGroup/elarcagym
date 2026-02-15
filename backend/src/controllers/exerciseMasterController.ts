
  import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();
  // Verificar si un ejercicio está en uso en alguna rutina (por nombre)
  router.get('/in-use/:name', async (req, res) => {
    try {
      const name = req.params.name;
      const count = await prisma.exerciseDetail.count({ where: { name } });
      res.json({ inUse: count > 0, count });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener todos los ejercicios
  router.get('/', async (req, res) => {
    const exercises = await prisma.exerciseMaster.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    res.json(exercises);
  });

  // Crear un ejercicio
  router.post('/', async (req, res) => {
    try {
      const exercise = await prisma.exerciseMaster.create({ data: req.body });
      res.status(201).json(exercise);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un ejercicio
  router.put('/:id', async (req, res) => {
    try {
      const exercise = await prisma.exerciseMaster.update({ where: { id: req.params.id }, data: req.body });
      res.json(exercise);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un ejercicio
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.exerciseMaster.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
