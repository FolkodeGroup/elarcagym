import dotenv from 'dotenv';
dotenv.config();
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import memberController from './controllers/memberController.js';
import productController from './controllers/productController.js';
import saleController from './controllers/saleController.js';
import reservationController from './controllers/reservationController.js';
import dietController from './controllers/dietController.js';
import paymentLogController from './controllers/paymentLogController.js';
import reminderController from './controllers/reminderController.js';
import slotController from './controllers/slotController.js';
import exerciseMasterController from './controllers/exerciseMasterController.js';
import authController from './controllers/authController.js';
import configController from './controllers/configController.js';
import userController from './controllers/userController.js';
import nutritionTemplateController from './controllers/nutritionTemplateController.js';
import notificationRoutes from './routes/notificationRoutes.js';
import waitlistRoutes from './routes/waitlist';
import { authenticateToken, requireAdmin, requirePermission } from './middleware/auth.js';
import routineTokenController from './controllers/routineTokenController.js';
import routineAccessController from './controllers/routineAccessController.js';
import { setPrismaInstance } from './utils/notificationService.js';



const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Permitir requests sin origin (como Postman) o si está en la lista
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Inicializar la instancia de Prisma para el servicio de notificaciones
setPrismaInstance(prisma);

// Configurar Socket.io para notificaciones en tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Autenticación del socket
  socket.on('authenticate', (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`Usuario ${userId} autenticado en socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Hacer io accesible globalmente para emitir notificaciones
(global as any).io = io;

const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:4173'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman) o si está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Aumentar el límite del body a 5mb para permitir imágenes grandes
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
// Endpoints públicos para QR (deben ir después de declarar app y prisma)
app.use('/routine-access', routineAccessController(prisma));
app.use('/routine-token', routineTokenController);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de autenticación (públicas) - legacy para socios
app.use('/auth', authController(prisma));

// Rutas de usuarios (login y CRUD) - nuevo sistema de usuarios
app.use('/users', userController(prisma));

// Ruta pública para consulta de rutinas por DNI (Portal del Socio)
app.get('/public/member-routine/:dni', async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { dni: req.params.dni },
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
    if (!member) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }
    res.json(member);
  } catch (error) {
    console.error('Error fetching member routine:', error);
    res.status(500).json({ error: 'Error al buscar socio' });
  }
});

// Rutas principales protegidas
app.use('/members', authenticateToken, memberController(prisma));
app.use('/products', authenticateToken, productController(prisma));
app.use('/sales', authenticateToken, saleController(prisma));
app.use('/reservations', authenticateToken, reservationController(prisma));
app.use('/diets', authenticateToken, dietController(prisma));
app.use('/payment-logs', authenticateToken, paymentLogController(prisma));
app.use('/reminders', authenticateToken, reminderController(prisma));
app.use('/slots', authenticateToken, slotController(prisma));
app.use('/exercises', authenticateToken, exerciseMasterController(prisma));
app.use('/config', authenticateToken, configController(prisma));
app.use('/nutrition-templates', authenticateToken, nutritionTemplateController(prisma));
app.use('/notifications', notificationRoutes(prisma));
app.use('/waitlist', authenticateToken, waitlistRoutes);

const PORT = process.env.PORT || 4000;
httpServer.listen({ port: PORT, host: '0.0.0.0' }, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT} (0.0.0.0)`);
  console.log(`WebSocket de notificaciones activo`);
});
