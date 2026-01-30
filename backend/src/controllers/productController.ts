import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los productos
  router.get('/', async (req, res) => {
    const products = await prisma.product.findMany();
    res.json(products);
  });

  // Crear un producto
  router.post('/', async (req, res) => {
    try {
      const product = await prisma.product.create({ data: req.body });
      res.status(201).json(product);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un producto
  router.put('/:id', async (req, res) => {
    try {
      const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
      res.json(product);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un producto
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.product.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
