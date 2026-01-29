import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las dietas
  router.get('/', async (req, res) => {
    const diets = await prisma.diet.findMany();
    res.json(diets);
  });

  // Crear una dieta
  router.post('/', async (req, res) => {
    try {
      const diet = await prisma.diet.create({ data: req.body });
      res.status(201).json(diet);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar una dieta
  router.put('/:id', async (req, res) => {
    try {
      const diet = await prisma.diet.update({ where: { id: req.params.id }, data: req.body });
      res.json(diet);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar una dieta
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.diet.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
