import { Router } from 'express';
import { verifyRoutineToken } from '../utils/routineToken.js';
import { isWithinGymRadius } from '../config/gymLocation.js';

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
      const { dni, latitude, longitude } = req.body;
      if (!dni) {
        return res.status(400).json({ error: 'DNI requerido' });
      }
      
      // Validar geolocalización si se proporciona
      if (latitude !== undefined && longitude !== undefined) {
        const withinRadius = isWithinGymRadius(latitude, longitude);
        if (!withinRadius) {
          return res.status(403).json({ 
            error: 'Debes estar en el gimnasio para acceder a tu rutina.',
            code: 'LOCATION_OUT_OF_RANGE'
          });
        }
      } else {
        // Si no se proporciona ubicación, rechazar el acceso
        return res.status(400).json({ 
          error: 'Se requiere tu ubicación para acceder a la rutina.',
          code: 'LOCATION_REQUIRED'
        });
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
      // Buscar todas las reservas del día para el usuario
      const todayReservations = allReservations.filter((r: { slot: { date: string } }) => {
        const slotDate = new Date(r.slot.date);
        return slotDate >= startOfDay && slotDate <= endOfDay;
      });
      // Buscar reserva con accessedAt dentro de la ventana
      const nowDate = new Date();
      const windowMs = 120 * 60 * 1000; // 2 horas en ms
      let reservation = todayReservations.find((r: { accessedAt?: string }) => r.accessedAt && (nowDate.getTime() - new Date(r.accessedAt).getTime() <= windowMs));
      let allowAccess = false;
      if (reservation) {
        // Acceso dentro de la ventana
        const accessedAt = new Date(reservation.accessedAt);
        const diffMs = nowDate.getTime() - accessedAt.getTime();
        console.log('[ACCESO RUTINA] Acceso posterior. nowDate:', nowDate.toISOString(), 'accessedAt:', accessedAt.toISOString(), 'diffMs:', diffMs, 'windowMs:', windowMs);
        allowAccess = true;
      } else {
        // Buscar reserva sin accessedAt (primer acceso del día)
        reservation = todayReservations.find((r: { accessedAt?: string }) => !r.accessedAt);
        if (reservation) {
          console.log('[ACCESO RUTINA] Primer acceso. nowDate:', nowDate.toISOString());
          await prisma.reservation.update({ where: { id: reservation.id }, data: { accessedAt: nowDate } });
          allowAccess = true;
        }
      }
      console.log('Reserva encontrada para hoy:', reservation);
      if (!reservation || !allowAccess) {
        return res.status(403).json({ error: 'No tienes un turno activo para hoy o ya fue registrado.' });
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
