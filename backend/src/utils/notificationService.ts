import { PrismaClient } from '../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

/**
 * Envía una notificación a un usuario
 * - Guarda en la base de datos
 * - Emite via Socket.io si está conectado
 */
export async function sendNotification(data: NotificationData) {
  try {
    // Crear notificación en la base de datos
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        link: data.link ?? null,
      },
    });

    // Emitir via Socket.io si está disponible
    const io = (global as any).io;
    if (io) {
      io.to(`user_${data.userId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    throw error;
  }
}

/**
 * Envía notificación a múltiples usuarios
 */
export async function sendNotificationToMany(userIds: string[], data: Omit<NotificationData, 'userId'>) {
  const promises = userIds.map(userId => 
    sendNotification({ ...data, userId })
  );
  return Promise.all(promises);
}

/**
 * Envía notificación a todos los administradores
 */
export async function sendNotificationToAdmins(data: Omit<NotificationData, 'userId'>) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    const adminIds = admins.map((admin: { id: string }) => admin.id);
    return sendNotificationToMany(adminIds, data);
  } catch (error) {
    console.error('Error al enviar notificación a admins:', error);
    throw error;
  }
}
