import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los logs de pago
  router.get('/', async (req, res) => {
    const payments = await prisma.paymentLog.findMany({
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    // Aplanar la info del miembro para simplificar el frontend
    const result = payments.map((p: any) => ({
      ...p,
      memberName: p.member ? `${p.member.firstName} ${p.member.lastName}` : 'Desconocido',
      member: undefined
    }));
    res.json(result);
  });

  // Crear un log de pago
  router.post('/', async (req, res) => {
    try {
      const payment = await prisma.paymentLog.create({ data: req.body });
      
      // Si el pago está asociado a un socio, actualizar su estado a ACTIVE si es necesario
      if (req.body.memberId) {
        const member = await prisma.member.findUnique({ where: { id: req.body.memberId } });
        if (member && (member.status === 'DEBTOR' || member.status === 'INACTIVE' || member.status === 'PENDIENTE')) {
          await prisma.member.update({
            where: { id: req.body.memberId },
            data: { status: 'ACTIVE' }
          });
          console.log(`[PAYMENT] Estado del socio ${member.firstName} ${member.lastName} actualizado de ${member.status} a ACTIVE`);
        }
      }
      
      res.status(201).json(payment);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un log de pago
  router.put('/:id', async (req, res) => {
    try {
      const payment = await prisma.paymentLog.update({ where: { id: req.params.id }, data: req.body });
      res.json(payment);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un log de pago
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.paymentLog.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
