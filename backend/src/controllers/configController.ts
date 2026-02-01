import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las configuraciones
  router.get('/', async (req, res) => {
    try {
      const configs = await prisma.config.findMany();
      res.json(configs);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener una configuración por key
  router.get('/:key', async (req, res) => {
    try {
      const config = await prisma.config.findUnique({
        where: { key: req.params.key }
      });
      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      res.json(config);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear o actualizar una configuración
  router.put('/:key', async (req, res) => {
    try {
      const { value, description } = req.body;
      const config = await prisma.config.upsert({
        where: { key: req.params.key },
        update: { value, description },
        create: { key: req.params.key, value, description }
      });
      res.json(config);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar una configuración
  router.delete('/:key', async (req, res) => {
    try {
      await prisma.config.delete({ where: { key: req.params.key } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
