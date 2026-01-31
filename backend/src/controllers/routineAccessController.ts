import { Router } from 'express';
import { verifyRoutineToken } from '../utils/routineToken.js';

export default function(prisma: any) {
  const router = Router();

  // Endpoint para validar token, verificar DNI, registrar asistencia y devolver rutina
  router.post('/validate-routine-access', async (req, res) => {
    try {
      const { token, dni } = req.body;
      if (!token || !dni) {
        return res.status(400).json({ error: 'Token y DNI requeridos' });
      }
      const decoded: any = verifyRoutineToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      // Buscar miembro por DNI y comparar con el del token
      const member = await prisma.member.findUnique({ where: { dni } });
      if (!member || member.id !== decoded.memberId) {
        return res.status(404).json({ error: 'Socio no encontrado o no coincide' });
      }
      // Registrar asistencia en la reserva
      await prisma.reservation.update({
        where: { id: decoded.slotId },
        data: { attended: true }
      });
      // Devolver rutina
      const memberWithRoutine = await prisma.member.findUnique({
        where: { id: member.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          routines: {
            include: {
              days: {
                include: {
                  exercises: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      res.json({ member: memberWithRoutine });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Endpoint para autoconsulta: solo DNI, busca turno activo, marca asistencia y devuelve rutina
  router.post('/selfservice', async (req, res) => {
    try {
      const { dni } = req.body;
      if (!dni) {
        return res.status(400).json({ error: 'DNI requerido' });
      }
      // Buscar miembro por DNI
      const member = await prisma.member.findUnique({ where: { dni } });
      if (!member) {
        return res.status(404).json({ error: 'Socio no encontrado' });
      }
      // Buscar reserva activa (turno de hoy, no atendido)
      const now = new Date();
      // Ajuste: comparar solo la fecha (año, mes, día) ignorando la hora y la zona horaria
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      // Log: mostrar todas las reservas de este socio
      const allReservations = await prisma.reservation.findMany({
        where: { memberId: member.id },
        include: { slot: true }
      });
      console.log('Reservas del socio:', allReservations);
      const reservation = await prisma.reservation.findFirst({
        where: {
          memberId: member.id,
          OR: [
            { attended: false },
            { attended: null }
          ],
          slot: {
            date: { gte: startOfDay, lte: endOfDay }
          }
        },
        orderBy: {
          slot: {
            date: 'asc'
          }
        },
        include: {
          slot: true
        }
      });
      console.log('Reserva encontrada para hoy:', reservation);
      if (!reservation) {
        return res.status(403).json({ error: 'No tienes un turno activo para hoy o ya fue registrado.' });
      }
      // Lógica de ventana temporal: 1h30min desde el primer acceso
      const nowDate = new Date();
      const windowMs = 90 * 60 * 1000; // 1h30min en ms
      let allowAccess = false;
      if (!reservation.accessedAt) {
        // Primer acceso: setear accessedAt y permitir acceso
        await prisma.reservation.update({ where: { id: reservation.id }, data: { accessedAt: nowDate } });
        allowAccess = true;
      } else {
        // Acceso posterior: permitir si está dentro de la ventana
        const accessedAt = new Date(reservation.accessedAt);
        if (nowDate.getTime() - accessedAt.getTime() <= windowMs) {
          allowAccess = true;
        }
      }
      if (!allowAccess) {
        return res.status(403).json({ error: 'El acceso temporal a tu rutina ha expirado. Solicita asistencia en recepción.' });
      }
      // Devolver rutina y datos de contacto
      const memberWithRoutine = await prisma.member.findUnique({
        where: { id: member.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
          phone: true,
          routines: {
            include: {
              days: { include: { exercises: true } }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      // Si los datos de contacto están en la reserva, usarlos como fallback
      const memberData = { ...memberWithRoutine };
      if (reservation) {
        if (!memberData.email && reservation.clientEmail) memberData.email = reservation.clientEmail;
        if (!memberData.phone && reservation.clientPhone) memberData.phone = reservation.clientPhone;
      }
      res.json({ member: memberData });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
