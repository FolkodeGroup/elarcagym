import { Router } from 'express';
import { sendNotificationToAdmins } from '../utils/notificationService.js';

export default function(prisma: any) {
  const router = Router();

  // Obtener todas las ventas con items y miembro
  router.get('/', async (req, res) => {
    try {
      const sales = await prisma.sale.findMany({
        include: {
          items: {
            include: {
              product: true
            }
          },
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });
      
      // Transformar para incluir productName en items
      const transformedSales = sales.map((sale: any) => ({
        ...sale,
        items: sale.items.map((item: any) => ({
          ...item,
          productName: item.product?.name || item.productName
        }))
      }));
      
      res.json(transformedSales);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener una venta por ID
  router.get('/:id', async (req, res) => {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: req.params.id },
        include: {
          items: {
            include: {
              product: true
            }
          },
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
      if (!sale) return res.status(404).json({ error: 'Sale not found' });
      res.json(sale);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear una venta (con transacción para actualizar stock)
  router.post('/', async (req, res) => {
    try {
      const { items, memberId } = req.body;
      
      // Usar transacción para asegurar consistencia
      const result = await prisma.$transaction(async (tx: any) => {
        let total = 0;
        const saleItems = [];
        
        // Verificar stock y calcular total
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });
          
          if (!product) {
            throw new Error(`Producto ${item.productId} no encontrado`);
          }
          
          if (product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${product.name}`);
          }
          
          total += product.price * item.quantity;
          saleItems.push({
            productId: item.productId,
            quantity: item.quantity,
            priceAtSale: product.price,
            productName: product.name
          });
          
          // Actualizar stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }
        
        // Crear la venta
        const sale = await tx.sale.create({
          data: {
            total,
            memberId: memberId || null,
            items: {
              create: saleItems
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });
        
        return sale;
      });
      
      // Notificar a admins sobre la nueva venta
      try {
        const itemNames = result.items.map((i: any) => i.productName || i.product?.name).filter(Boolean).join(', ');
        await sendNotificationToAdmins({
          title: 'Nueva venta registrada',
          message: `Venta por $${result.total.toFixed(2)} - ${itemNames}`,
          type: 'success',
          link: 'Ingresos'
        });
      } catch (err) {
        console.error('Error enviando notificación:', err);
      }
      
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar una venta (opcionalmente restaurar stock)
  router.delete('/:id', async (req, res) => {
    try {
      const { restoreStock } = req.query;
      
      if (restoreStock === 'true') {
        // Restaurar stock con transacción
        await prisma.$transaction(async (tx: any) => {
          const sale = await tx.sale.findUnique({
            where: { id: req.params.id },
            include: { items: true }
          });
          
          if (!sale) {
            throw new Error('Venta no encontrada');
          }
          
          // Restaurar stock de cada producto
          for (const item of sale.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });
          }
          
          // Eliminar la venta
          await tx.sale.delete({ where: { id: req.params.id } });
        });
      } else {
        await prisma.sale.delete({ where: { id: req.params.id } });
      }
      
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
