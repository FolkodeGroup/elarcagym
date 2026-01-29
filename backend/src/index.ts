import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

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
import { authenticateToken } from './middleware/auth.js';

dotenv.config();
const app = express();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de autenticación
app.use('/auth', authController(prisma));

// Rutas principales protegidas (ejemplo: members)
app.use('/members', authenticateToken, memberController(prisma));
app.use('/products', productController(prisma));
app.use('/sales', saleController(prisma));
app.use('/reservations', reservationController(prisma));
app.use('/diets', dietController(prisma));
app.use('/payment-logs', paymentLogController(prisma));
app.use('/reminders', reminderController(prisma));
app.use('/slots', slotController(prisma));
app.use('/exercises', exerciseMasterController(prisma));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
