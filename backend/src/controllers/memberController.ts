import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los miembros con relaciones
  router.get('/', async (req, res) => {
    try {
      const members = await prisma.member.findMany({
        include: {
          habitualSchedules: true,
          biometrics: { orderBy: { date: 'desc' } },
          routines: {
            include: {
              days: {
                include: {
                  exercises: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          diets: { orderBy: { generatedAt: 'desc' } },
          payments: { orderBy: { date: 'desc' } }
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
      });
      res.json(members);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener un miembro por ID con todas sus relaciones
  router.get('/:id', async (req, res) => {
    try {
      const member = await prisma.member.findUnique({
        where: { id: req.params.id },
        include: {
          habitualSchedules: true,
          biometrics: { orderBy: { date: 'desc' } },
          routines: {
            include: {
              days: {
                include: {
                  exercises: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          diets: { orderBy: { generatedAt: 'desc' } },
          payments: { orderBy: { date: 'desc' } }
        }
      });
      if (!member) return res.status(404).json({ error: 'Member not found' });
      res.json(member);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Obtener un miembro por DNI
  router.get('/dni/:dni', async (req, res) => {
    try {
      const member = await prisma.member.findUnique({
        where: { dni: req.params.dni },
        include: {
          habitualSchedules: true,
          biometrics: { orderBy: { date: 'desc' } },
          routines: {
            include: {
              days: {
                include: {
                  exercises: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          diets: { orderBy: { generatedAt: 'desc' } },
          payments: { orderBy: { date: 'desc' } }
        }
      });
      if (!member) return res.status(404).json({ error: 'Member not found' });
      res.json(member);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Crear un nuevo miembro
  router.post('/', async (req, res) => {
    try {
      const { habitualSchedules, ...memberData } = req.body;
      const member = await prisma.member.create({
        data: {
          ...memberData,
          habitualSchedules: habitualSchedules ? {
            create: habitualSchedules
          } : undefined
        },
        include: {
          habitualSchedules: true,
          biometrics: true,
          routines: true,
          diets: true,
          payments: true
        }
      });
      res.status(201).json(member);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un miembro
  router.put('/:id', async (req, res) => {
    try {
      const { habitualSchedules, biometrics, routines, diets, payments, ...memberData } = req.body;
      
      // Si se envían habitualSchedules, actualizar
      if (habitualSchedules) {
        await prisma.habitualSchedule.deleteMany({ where: { memberId: req.params.id } });
        await prisma.habitualSchedule.createMany({
          data: habitualSchedules.map((hs: any) => ({ ...hs, memberId: req.params.id }))
        });
      }
      
      const member = await prisma.member.update({
        where: { id: req.params.id },
        data: memberData,
        include: {
          habitualSchedules: true,
          biometrics: { orderBy: { date: 'desc' } },
          routines: {
            include: { days: { include: { exercises: true } } },
            orderBy: { createdAt: 'desc' }
          },
          diets: { orderBy: { generatedAt: 'desc' } },
          payments: { orderBy: { date: 'desc' } }
        }
      });
      res.json(member);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un miembro
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.member.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // ==================== BIOMETRICS ====================
  
  // Obtener biométricos de un miembro
  router.get('/:memberId/biometrics', async (req, res) => {
    try {
      const biometrics = await prisma.biometricLog.findMany({
        where: { memberId: req.params.memberId },
        orderBy: { date: 'desc' }
      });
      res.json(biometrics);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Agregar biométrico a un miembro
  router.post('/:memberId/biometrics', async (req, res) => {
    try {
      const biometric = await prisma.biometricLog.create({
        data: {
          ...req.body,
          memberId: req.params.memberId,
          date: req.body.date ? new Date(req.body.date) : new Date()
        }
      });
      res.status(201).json(biometric);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar biométrico
  router.put('/:memberId/biometrics/:biometricId', async (req, res) => {
    try {
      const biometric = await prisma.biometricLog.update({
        where: { id: req.params.biometricId },
        data: {
          ...req.body,
          date: req.body.date ? new Date(req.body.date) : undefined
        }
      });
      res.json(biometric);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar biométrico
  router.delete('/:memberId/biometrics/:biometricId', async (req, res) => {
    try {
      await prisma.biometricLog.delete({ where: { id: req.params.biometricId } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // ==================== ROUTINES ====================
  
  // Obtener rutinas de un miembro
  router.get('/:memberId/routines', async (req, res) => {
    try {
      const routines = await prisma.routine.findMany({
        where: { memberId: req.params.memberId },
        include: {
          days: {
            include: {
              exercises: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(routines);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Agregar rutina a un miembro
  router.post('/:memberId/routines', async (req, res) => {
    try {
      const { days, ...routineData } = req.body;
      const routine = await prisma.routine.create({
        data: {
          ...routineData,
          memberId: req.params.memberId,
          days: days ? {
            create: days.map((day: any) => ({
              dayName: day.dayName,
              exercises: day.exercises ? {
                create: day.exercises
              } : undefined
            }))
          } : undefined
        },
        include: {
          days: {
            include: {
              exercises: true
            }
          }
        }
      });
      res.status(201).json(routine);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar rutina
  router.put('/:memberId/routines/:routineId', async (req, res) => {
    try {
      const { days, ...routineData } = req.body;
      
      // Si se envían días, eliminar los existentes y crear nuevos
      if (days) {
        await prisma.routineDay.deleteMany({ where: { routineId: req.params.routineId } });
      }
      
      const routine = await prisma.routine.update({
        where: { id: req.params.routineId },
        data: {
          ...routineData,
          days: days ? {
            create: days.map((day: any) => ({
              dayName: day.dayName,
              exercises: day.exercises ? {
                create: day.exercises
              } : undefined
            }))
          } : undefined
        },
        include: {
          days: {
            include: {
              exercises: true
            }
          }
        }
      });
      res.json(routine);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar rutina
  router.delete('/:memberId/routines/:routineId', async (req, res) => {
    try {
      await prisma.routine.delete({ where: { id: req.params.routineId } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // ==================== PAYMENTS ====================
  
  // Obtener pagos de un miembro
  router.get('/:memberId/payments', async (req, res) => {
    try {
      const payments = await prisma.paymentLog.findMany({
        where: { memberId: req.params.memberId },
        orderBy: { date: 'desc' }
      });
      res.json(payments);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Agregar pago a un miembro
  router.post('/:memberId/payments', async (req, res) => {
    try {
      const payment = await prisma.paymentLog.create({
        data: {
          ...req.body,
          memberId: req.params.memberId,
          date: req.body.date ? new Date(req.body.date) : new Date()
        }
      });
      
      // Actualizar estado del miembro a ACTIVE si estaba DEBTOR o INACTIVE
      const member = await prisma.member.findUnique({ where: { id: req.params.memberId } });
      if (member && (member.status === 'DEBTOR' || member.status === 'INACTIVE')) {
        await prisma.member.update({
          where: { id: req.params.memberId },
          data: { status: 'ACTIVE' }
        });
      }
      
      res.status(201).json(payment);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // ==================== NUTRITION PLAN ====================
  
  // Actualizar plan de nutrición
  router.put('/:memberId/nutrition', async (req, res) => {
    try {
      const member = await prisma.member.update({
        where: { id: req.params.memberId },
        data: {
          nutritionPlan: {
            ...req.body,
            lastUpdated: new Date().toISOString()
          }
        }
      });
      res.json(member);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
