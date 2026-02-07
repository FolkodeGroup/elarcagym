import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener la plantilla activa de recomendaciones nutricionales
  router.get('/active', async (req, res) => {
    try {
      const template = await prisma.nutritionTemplate.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(template || null);
    } catch (e) {
      console.error('Error obteniendo plantilla activa:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener todas las plantillas de recomendaciones
  router.get('/', async (req, res) => {
    try {
      const templates = await prisma.nutritionTemplate.findMany({
        orderBy: { updatedAt: 'desc' }
      });
      res.json(templates);
    } catch (e) {
      console.error('Error obteniendo plantillas:', e);
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener una plantilla específica por ID
  router.get('/:id', async (req, res) => {
    try {
      const template = await prisma.nutritionTemplate.findUnique({
        where: { id: req.params.id }
      });
      if (!template) {
        return res.status(404).json({ error: 'Plantilla no encontrada' });
      }
      res.json(template);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear una nueva plantilla de recomendaciones
  router.post('/', async (req, res) => {
    try {
      const { title, content, isActive } = req.body;
      
      // Si la nueva plantilla es activa, desactivar las demás
      if (isActive) {
        await prisma.nutritionTemplate.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        });
      }

      const template = await prisma.nutritionTemplate.create({
        data: {
          title,
          content,
          isActive: isActive ?? true
        }
      });
      res.status(201).json(template);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar una plantilla existente
  router.put('/:id', async (req, res) => {
    try {
      const { title, content, isActive } = req.body;
      
      // Si se activa esta plantilla, desactivar las demás
      if (isActive) {
        await prisma.nutritionTemplate.updateMany({
          where: { 
            isActive: true,
            NOT: { id: req.params.id }
          },
          data: { isActive: false }
        });
      }

      const template = await prisma.nutritionTemplate.update({
        where: { id: req.params.id },
        data: { title, content, isActive }
      });
      res.json(template);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar una plantilla
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.nutritionTemplate.delete({ 
        where: { id: req.params.id } 
      });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
