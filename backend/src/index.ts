
import dotenv from 'dotenv';
dotenv.config();
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/client/client.js';
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
import { authenticateToken } from './middleware/auth.js';
import routineTokenController from './controllers/routineTokenController.js';
import routineAccessController from './controllers/routineAccessController.js';



const app = express();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());
// Endpoints públicos para QR (deben ir después de declarar app y prisma)
app.use('/routine-access', routineAccessController(prisma));
app.use('/routine-token', routineTokenController);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de autenticación (públicas)
app.use('/auth', authController(prisma));

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
