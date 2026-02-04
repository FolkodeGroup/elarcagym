import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from './src/generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { sendNotificationToAdmins, setPrismaInstance } from './src/utils/notificationService.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Inicializar la instancia de Prisma para el servicio de notificaciones
setPrismaInstance(prisma);

// Hacer io accesible globalmente (simulado para pruebas)
(global as any).io = {
  to: () => ({ emit: () => {} })
};

async function testNotification() {
  console.log('🧪 Probando sistema de notificaciones...\n');

  try {
    // 1. Buscar administradores
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    console.log(`✅ Administradores encontrados: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`   - ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });

    if (admins.length === 0) {
      console.log('❌ No hay administradores activos');
      return;
    }

    console.log('\n📤 Enviando notificación de prueba...');

    // 2. Enviar notificación de prueba
    await sendNotificationToAdmins({
      title: '🧪 Notificación de prueba',
      message: 'Esta es una notificación de prueba del sistema. ¡Todo funciona correctamente!',
      type: 'success',
      link: 'dashboard',
    });

    console.log('✅ Notificación enviada correctamente');

    // 3. Verificar que se guardó en la base de datos
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    console.log(`\n📊 Últimas notificaciones en DB: ${notifications.length}`);
    notifications.forEach((notif, i) => {
      console.log(`   ${i + 1}. ${notif.title} → ${notif.user.firstName} ${notif.user.lastName} (${notif.read ? 'Leída' : 'No leída'})`);
    });

    console.log('\n✨ Prueba completada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotification();
