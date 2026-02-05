import { Router } from 'express';
import { sendNotificationToAdmins } from '../utils/notificationService.js';

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

  // Crear un nuevo miembro
  router.post('/', async (req, res) => {
    try {
      const { habitualSchedules, ...memberData } = req.body;
      // Validaciones de inputs
      const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
      const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
      if (!memberData.firstName || typeof memberData.firstName !== 'string' || !nameRegex.test(memberData.firstName) || !hasLetter.test(memberData.firstName)) {
        return res.status(400).json({ error: 'Nombre inválido: solo letras y espacios.' });
      }
      if (!memberData.lastName || typeof memberData.lastName !== 'string' || !nameRegex.test(memberData.lastName) || !hasLetter.test(memberData.lastName)) {
        return res.status(400).json({ error: 'Apellido inválido: solo letras y espacios.' });
      }
      // DNI: solo dígitos, máximo 8
      const dniClean = String(memberData.dni).replace(/\D/g, '');
      if (!/^[0-9]{1,8}$/.test(dniClean)) {
        return res.status(400).json({ error: 'DNI inválido: solo números, máximo 8 dígitos.' });
      }
      // Email: contiene @ y termina en .com (opcional)
      let email = undefined;
      if (memberData.email) {
        email = memberData.email.trim();
        if (!(email.includes('@') && email.toLowerCase().endsWith('.com'))) {
          return res.status(400).json({ error: 'Email inválido: debe contener @ y terminar en .com.' });
        }
        // Verificar unicidad de email si se proporciona
        const existingEmail = await prisma.member.findUnique({ where: { email } });
        if (existingEmail) {
          return res.status(409).json({ error: 'El email ya está registrado.' });
        }
      }
      // Teléfono: solo dígitos
      const phoneClean = String(memberData.phone).replace(/\D/g, '');
      if (memberData.phone && !/^[0-9]+$/.test(phoneClean)) {
        return res.status(400).json({ error: 'Teléfono inválido: solo números.' });
      }
      // Verificar unicidad de DNI
      const existingDni = await prisma.member.findUnique({ where: { dni: dniClean } });
      if (existingDni) {
        return res.status(409).json({ error: 'El DNI ya está registrado.' });
      }

      const member = await prisma.member.create({
        data: {
          ...memberData,
          dni: dniClean,
          email,
          phone: phoneClean,
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

      // Notificar a los administradores
      try {
        await sendNotificationToAdmins({
          title: 'Nuevo socio registrado',
          message: `${member.firstName} ${member.lastName} se ha registrado`,
          type: 'success',
          link: 'members'
        });
      } catch (err) {
        console.error('Error enviando notificación a admins:', err);
      }

      // Notificar a la administradora Veronica
      // try {
      //   await sendEmail({
      //     to: 'veronica@elarcagym.com',
      //     subject: 'Nuevo socio registrado',
      //     text: `Se ha registrado un nuevo socio:\nNombre: ${member.firstName} ${member.lastName}\nDNI: ${member.dni}`
      //   });
      // } catch (err) {
      //   console.error('Error enviando email a Veronica:', err);
      // }

      res.status(201).json(member);
    } catch (e) {
      // Prisma error de unicidad
      if (
        typeof e === 'object' && e !== null &&
        'code' in e && e.code === 'P2002' &&
        'meta' in e && e.meta &&
        typeof e.meta === 'object' &&
        'target' in e.meta && Array.isArray(e.meta.target)
      ) {
        if (e.meta.target.includes('dni')) {
          return res.status(409).json({ error: 'El DNI ya está registrado.' });
        }
        if (e.meta.target.includes('email')) {
          return res.status(409).json({ error: 'El email ya está registrado.' });
        }
      }
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un miembro (PATCH)
  router.patch('/:id', async (req, res) => {
    try {
      const { habitualSchedules, ...memberData } = req.body;
      // Validaciones de inputs
      const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
      const hasLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
      
      let dniClean = undefined;
      let email = undefined;
      let phoneClean = undefined;
      
      if ('firstName' in memberData) {
        if (!memberData.firstName || typeof memberData.firstName !== 'string' || !nameRegex.test(memberData.firstName) || !hasLetter.test(memberData.firstName)) {
          return res.status(400).json({ error: 'Nombre inválido: solo letras y espacios.' });
        }
      }
      if ('lastName' in memberData) {
        if (!memberData.lastName || typeof memberData.lastName !== 'string' || !nameRegex.test(memberData.lastName) || !hasLetter.test(memberData.lastName)) {
          return res.status(400).json({ error: 'Apellido inválido: solo letras y espacios.' });
        }
      }
      if ('dni' in memberData) {
        dniClean = String(memberData.dni).replace(/\D/g, '');
        if (!/^[0-9]{1,8}$/.test(dniClean)) {
          return res.status(400).json({ error: 'DNI inválido: solo números, máximo 8 dígitos.' });
        }
        // Verificar unicidad de DNI (excepto si es el mismo miembro)
        const existingDni = await prisma.member.findUnique({ where: { dni: dniClean } });
        if (existingDni && existingDni.id !== req.params.id) {
          return res.status(409).json({ error: 'El DNI ya está registrado.' });
        }
      }
      if ('email' in memberData) {
        email = (memberData.email || '').trim();
        if (!email || !(email.includes('@') && email.toLowerCase().endsWith('.com'))){
          return res.status(400).json({ error: 'Email inválido: debe contener @ y terminar en .com.' });
        }
        // Verificar unicidad de email (excepto si es el mismo miembro)
        const existingEmail = await prisma.member.findUnique({ where: { email } });
        if (existingEmail && existingEmail.id !== req.params.id) {
          return res.status(409).json({ error: 'El email ya está registrado.' });
        }
      }
      if ('phone' in memberData) {
        phoneClean = String(memberData.phone).replace(/\D/g, '');
        if (memberData.phone && !/^[0-9]+$/.test(phoneClean)) {
          return res.status(400).json({ error: 'Teléfono inválido: solo números.' });
        }
      }
      // Si se envían habitualSchedules, actualizar
      if (habitualSchedules) {
        await prisma.habitualSchedule.deleteMany({ where: { memberId: req.params.id } });
        await prisma.habitualSchedule.createMany({
          data: habitualSchedules.map((hs: any) => ({ ...hs, memberId: req.params.id }))
        });
      }
      // Solo actualizar los campos presentes
      const updateData: any = {};
      if ('firstName' in memberData) updateData.firstName = memberData.firstName;
      if ('lastName' in memberData) updateData.lastName = memberData.lastName;
      if ('dni' in memberData) updateData.dni = dniClean;
      if ('email' in memberData) updateData.email = email;
      if ('phone' in memberData) updateData.phone = phoneClean;
      if ('phase' in memberData) updateData.phase = memberData.phase;
      if ('bioObjective' in memberData) updateData.bioObjective = memberData.bioObjective;
      if ('photoUrl' in req.body) updateData.photoUrl = req.body.photoUrl;
      if ('status' in memberData) updateData.status = memberData.status;
      if ('nutritionPlan' in memberData) updateData.nutritionPlan = memberData.nutritionPlan;
      // ...agrega aquí otros campos si es necesario
      const member = await prisma.member.update({
        where: { id: req.params.id },
        data: updateData,
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
      // Prisma error de unicidad
      if (
        typeof e === 'object' && e !== null &&
        'code' in e && e.code === 'P2002' &&
        'meta' in e && e.meta &&
        typeof e.meta === 'object' &&
        'target' in e.meta && Array.isArray(e.meta.target)
      ) {
        if (e.meta.target.includes('dni')) {
          return res.status(409).json({ error: 'El DNI ya está registrado.' });
        }
        if (e.meta.target.includes('email')) {
          return res.status(409).json({ error: 'El email ya está registrado.' });
        }
      }
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
      // Validar existencia del miembro
      const member = await prisma.member.findUnique({ where: { id: req.params.memberId } });
      if (!member) {
        return res.status(400).json({ error: 'El miembro no existe' });
      }

      const payment = await prisma.paymentLog.create({
        data: {
          ...req.body,
          memberId: req.params.memberId,
          date: req.body.date ? new Date(req.body.date) : new Date()
        }
      });

      // Actualizar estado del miembro a ACTIVE si estaba DEBTOR o INACTIVE
      if (member.status === 'DEBTOR' || member.status === 'INACTIVE') {
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
