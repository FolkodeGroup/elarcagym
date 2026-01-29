import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las ventas
  router.get('/', async (req, res) => {
    const sales = await prisma.sale.findMany({ include: { items: true, member: true } });
    res.json(sales);
  });

  // Crear una venta
  router.post('/', async (req, res) => {
    try {
      const sale = await prisma.sale.create({ data: req.body });
      res.status(201).json(sale);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
