import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

export default function notificationRoutes(prisma: any) {
  const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification
  } = notificationController(prisma);

  const router = express.Router();

  // Todas las rutas requieren autenticación
  router.use(authenticateToken);

  // Obtener todas las notificaciones del usuario
  router.get('/', getNotifications);

  // Obtener contador de no leídas
  router.get('/unread-count', getUnreadCount);

  // Marcar todas como leídas
  router.put('/mark-all-read', markAllAsRead);

  // Marcar una como leída
  router.put('/:id/read', markAsRead);

  // Crear notificación (solo para admins, puedes agregar middleware de admin si quieres)
  router.post('/', createNotification);

  // Eliminar notificación
  router.delete('/:id', deleteNotification);

  return router;
}
