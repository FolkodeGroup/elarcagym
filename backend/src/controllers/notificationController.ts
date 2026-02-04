import type { Request, Response } from 'express';

// Refactor: Exportar función que recibe prisma
export default function notificationController(prisma: any) {

  // Obtener todas las notificaciones del usuario
  const getNotifications = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limitar a las últimas 50 notificaciones
      });

      res.json(notifications);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
  };

  // Obtener contador de notificaciones no leídas
  const getUnreadCount = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const count = await prisma.notification.count({
        where: { 
          userId,
          read: false 
        },
      });

      res.json({ count });
    } catch (error) {
      console.error('Error al obtener contador:', error);
      res.status(500).json({ error: 'Error al obtener contador' });
    }
  };

  // Marcar notificación como leída
  const markAsRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const id = req.params.id as string;

      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Verificar que la notificación pertenece al usuario
      const notification = await prisma.notification.findFirst({
        where: { 
          id: id,
          userId: userId 
        },
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }

      const updated = await prisma.notification.update({
        where: { id: id },
        data: { read: true },
      });

      res.json(updated);
    } catch (error) {
      console.error('Error al marcar como leída:', error);
      res.status(500).json({ error: 'Error al marcar como leída' });
    }
  };

  // Marcar todas las notificaciones como leídas
  const markAllAsRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      await prisma.notification.updateMany({
        where: { 
          userId,
          read: false 
        },
        data: { read: true },
      });

      res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      res.status(500).json({ error: 'Error al marcar todas como leídas' });
    }
  };

  // Crear una nueva notificación (para testing o uso interno)
  const createNotification = async (req: Request, res: Response) => {
    try {
      const { userId, title, message, type, link } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type || 'info',
          link,
        },
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error('Error al crear notificación:', error);
      res.status(500).json({ error: 'Error al crear notificación' });
    }
  };

  // Eliminar una notificación
  const deleteNotification = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const id = req.params.id as string;

      if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Verificar que la notificación pertenece al usuario
      const notification = await prisma.notification.findFirst({
        where: { 
          id: id,
          userId: userId 
        },
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }

      await prisma.notification.delete({
        where: { id: id },
      });

      res.json({ message: 'Notificación eliminada' });
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      res.status(500).json({ error: 'Error al eliminar notificación' });
    }
  };

  return {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
  };
}

// Obtener todas las notificaciones del usuario
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limitar a las últimas 50 notificaciones
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

// Obtener contador de notificaciones no leídas
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const count = await prisma.notification.count({
      where: { 
        userId,
        read: false 
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Error al obtener contador:', error);
    res.status(500).json({ error: 'Error al obtener contador' });
  }
};

// Marcar notificación como leída
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: { 
        id: id,
        userId: userId 
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const updated = await prisma.notification.update({
      where: { id: id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al marcar como leída:', error);
    res.status(500).json({ error: 'Error al marcar como leída' });
  }
};

// Marcar todas las notificaciones como leídas
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    await prisma.notification.updateMany({
      where: { 
        userId,
        read: false 
      },
      data: { read: true },
    });

    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    res.status(500).json({ error: 'Error al marcar todas como leídas' });
  }
};

// Crear una nueva notificación (para testing o uso interno)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type, link } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
        link,
      },
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

// Eliminar una notificación
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: { 
        id: id,
        userId: userId 
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await prisma.notification.delete({
      where: { id: id },
    });

    res.json({ message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
};
