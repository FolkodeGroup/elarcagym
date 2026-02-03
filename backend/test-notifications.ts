import { PrismaClient } from './src/generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function testNotification() {
  try {
    // Obtener el primer usuario administrador
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      console.log('❌ No se encontró ningún usuario administrador');
      return;
    }

    console.log(`✅ Usuario encontrado: ${admin.firstName} ${admin.lastName} (${admin.email})`);

    // Crear notificación de prueba
    const notification = await prisma.notification.create({
      data: {
        userId: admin.id,
        title: '¡Bienvenido al sistema de notificaciones!',
        message: 'Este es un mensaje de prueba para verificar que el sistema de notificaciones funciona correctamente.',
        type: 'info',
        link: 'dashboard',
      },
    });

    console.log('✅ Notificación creada exitosamente:');
    console.log(notification);

    // Crear algunas notificaciones adicionales
    await prisma.notification.createMany({
      data: [
        {
          userId: admin.id,
          title: 'Nuevo socio registrado',
          message: 'Juan Pérez se ha registrado en el gimnasio.',
          type: 'success',
          link: 'members',
        },
        {
          userId: admin.id,
          title: 'Pago pendiente',
          message: 'Hay 3 socios con pagos pendientes este mes.',
          type: 'warning',
          link: 'members',
        },
        {
          userId: admin.id,
          title: 'Sistema actualizado',
          message: 'El sistema de notificaciones ha sido instalado correctamente.',
          type: 'info',
        },
      ],
    });

    console.log('✅ Notificaciones adicionales creadas');

    // Contar notificaciones
    const count = await prisma.notification.count({
      where: { userId: admin.id },
    });

    console.log(`\n📊 Total de notificaciones: ${count}`);

    // Listar todas las notificaciones
    const allNotifications = await prisma.notification.findMany({
      where: { userId: admin.id },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n📋 Todas las notificaciones:');
    allNotifications.forEach((n, i) => {
      console.log(`  ${i + 1}. [${n.type.toUpperCase()}] ${n.title}`);
      console.log(`     ${n.message}`);
      console.log(`     Leída: ${n.read ? '✓' : '✗'} | ${new Date(n.createdAt).toLocaleString('es-AR')}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotification();
