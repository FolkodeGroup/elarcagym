import { Router } from 'express';
import { sendNotificationToAdmins } from '../utils/notificationService.js';

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
      const { name, price, category, stock, imageUrl } = req.body;
      // Validaciones estrictas
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'El nombre es obligatorio.' });
      }
      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({ error: 'La categoría es obligatoria.' });
      }
      if (price === undefined || isNaN(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({ error: 'El precio debe ser mayor a 0.' });
      }
      if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({ error: 'El stock debe ser 0 o mayor.' });
      }
      const product = await prisma.product.create({ data: { name: name.trim(), price: Number(price), category, stock: Number(stock), imageUrl } });
      // Notificar a admins
      try {
        await sendNotificationToAdmins({
          title: 'Nuevo producto creado',
          message: `Se agregó "${product.name}" al inventario (Stock: ${product.stock})`,
          type: 'success',
          link: 'admin'
        });
      } catch (err) {
        console.error('Error enviando notificación:', err);
      }
      res.status(201).json(product);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un producto
  router.put('/:id', async (req, res) => {
    try {
      const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
      
      // Notificar a admins
      try {
        await sendNotificationToAdmins({
          title: 'Producto actualizado',
          message: `Se actualizó "${product.name}"`,
          type: 'info',
          link: 'admin'
        });
      } catch (err) {
        console.error('Error enviando notificación:', err);
      }
      
      res.json(product);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un producto
  router.delete('/:id', async (req, res) => {
    try {
      const product = await prisma.product.findUnique({ where: { id: req.params.id } });
      await prisma.product.delete({ where: { id: req.params.id } });
      
      // Notificar a admins
      if (product) {
        try {
          await sendNotificationToAdmins({
            title: 'Producto eliminado',
            message: `Se eliminó "${product.name}" del inventario`,
            type: 'warning',
            link: 'admin'
          });
        } catch (err) {
          console.error('Error enviando notificación:', err);
        }
      }
      
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
