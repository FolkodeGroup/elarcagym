// Script para crear usuarios, roles y permisos iniciales
import { PrismaClient } from './generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Definición de todos los permisos del sistema
const SYSTEM_PERMISSIONS = [
  // Módulo: Socios
  { code: 'members.view', name: 'Ver Socios', description: 'Permite ver la lista y detalles de socios', module: 'members' },
  { code: 'members.create', name: 'Crear Socios', description: 'Permite crear nuevos socios', module: 'members' },
  { code: 'members.edit', name: 'Editar Socios', description: 'Permite editar información de socios', module: 'members' },
  { code: 'members.delete', name: 'Eliminar Socios', description: 'Permite eliminar socios', module: 'members' },
  
  // Módulo: Rutinas
  { code: 'routines.view', name: 'Ver Rutinas', description: 'Permite ver rutinas de socios', module: 'routines' },
  { code: 'routines.create', name: 'Crear Rutinas', description: 'Permite crear rutinas', module: 'routines' },
  { code: 'routines.edit', name: 'Editar Rutinas', description: 'Permite editar rutinas', module: 'routines' },
  { code: 'routines.delete', name: 'Eliminar Rutinas', description: 'Permite eliminar rutinas', module: 'routines' },
  
  // Módulo: Biometría
  { code: 'biometrics.view', name: 'Ver Biometría', description: 'Permite ver datos biométricos', module: 'biometrics' },
  { code: 'biometrics.create', name: 'Registrar Biometría', description: 'Permite registrar datos biométricos', module: 'biometrics' },
  { code: 'biometrics.edit', name: 'Editar Biometría', description: 'Permite editar datos biométricos', module: 'biometrics' },
  { code: 'biometrics.delete', name: 'Eliminar Biometría', description: 'Permite eliminar datos biométricos', module: 'biometrics' },
  
  // Módulo: Nutrición
  { code: 'nutrition.view', name: 'Ver Nutrición', description: 'Permite ver planes nutricionales', module: 'nutrition' },
  { code: 'nutrition.create', name: 'Crear Plan Nutricional', description: 'Permite crear planes nutricionales', module: 'nutrition' },
  { code: 'nutrition.edit', name: 'Editar Plan Nutricional', description: 'Permite editar planes nutricionales', module: 'nutrition' },
  { code: 'nutrition.delete', name: 'Eliminar Plan Nutricional', description: 'Permite eliminar planes nutricionales', module: 'nutrition' },
  
  // Módulo: Reservas
  { code: 'reservations.view', name: 'Ver Reservas', description: 'Permite ver reservas', module: 'reservations' },
  { code: 'reservations.create', name: 'Crear Reservas', description: 'Permite crear reservas', module: 'reservations' },
  { code: 'reservations.edit', name: 'Editar Reservas', description: 'Permite editar reservas', module: 'reservations' },
  { code: 'reservations.delete', name: 'Eliminar Reservas', description: 'Permite eliminar reservas', module: 'reservations' },
  
  // Módulo: Productos y Ventas
  { code: 'products.view', name: 'Ver Productos', description: 'Permite ver productos', module: 'products' },
  { code: 'products.create', name: 'Crear Productos', description: 'Permite crear productos', module: 'products' },
  { code: 'products.edit', name: 'Editar Productos', description: 'Permite editar productos', module: 'products' },
  { code: 'products.delete', name: 'Eliminar Productos', description: 'Permite eliminar productos', module: 'products' },
  { code: 'sales.view', name: 'Ver Ventas', description: 'Permite ver historial de ventas', module: 'sales' },
  { code: 'sales.create', name: 'Registrar Ventas', description: 'Permite registrar ventas', module: 'sales' },
  { code: 'sales.delete', name: 'Eliminar Ventas', description: 'Permite eliminar ventas', module: 'sales' },
  
  // Módulo: Pagos
  { code: 'payments.view', name: 'Ver Pagos', description: 'Permite ver historial de pagos', module: 'payments' },
  { code: 'payments.create', name: 'Registrar Pagos', description: 'Permite registrar pagos', module: 'payments' },
  { code: 'payments.edit', name: 'Editar Pagos', description: 'Permite editar pagos', module: 'payments' },
  { code: 'payments.delete', name: 'Eliminar Pagos', description: 'Permite eliminar pagos', module: 'payments' },
  
  // Módulo: Recordatorios
  { code: 'reminders.view', name: 'Ver Recordatorios', description: 'Permite ver recordatorios', module: 'reminders' },
  { code: 'reminders.create', name: 'Crear Recordatorios', description: 'Permite crear recordatorios', module: 'reminders' },
  { code: 'reminders.edit', name: 'Editar Recordatorios', description: 'Permite editar recordatorios', module: 'reminders' },
  { code: 'reminders.delete', name: 'Eliminar Recordatorios', description: 'Permite eliminar recordatorios', module: 'reminders' },
  
  // Módulo: Ejercicios Master
  { code: 'exercises.view', name: 'Ver Ejercicios', description: 'Permite ver catálogo de ejercicios', module: 'exercises' },
  { code: 'exercises.create', name: 'Crear Ejercicios', description: 'Permite crear ejercicios', module: 'exercises' },
  { code: 'exercises.edit', name: 'Editar Ejercicios', description: 'Permite editar ejercicios', module: 'exercises' },
  { code: 'exercises.delete', name: 'Eliminar Ejercicios', description: 'Permite eliminar ejercicios', module: 'exercises' },
  
  // Módulo: Configuración y Administración
  { code: 'config.view', name: 'Ver Configuración', description: 'Permite ver configuración del sistema', module: 'config' },
  { code: 'config.edit', name: 'Editar Configuración', description: 'Permite editar configuración del sistema', module: 'config' },
  { code: 'users.view', name: 'Ver Usuarios', description: 'Permite ver lista de usuarios del sistema', module: 'users' },
  { code: 'users.create', name: 'Crear Usuarios', description: 'Permite crear usuarios del sistema', module: 'users' },
  { code: 'users.edit', name: 'Editar Usuarios', description: 'Permite editar usuarios del sistema', module: 'users' },
  { code: 'users.delete', name: 'Eliminar Usuarios', description: 'Permite eliminar usuarios del sistema', module: 'users' },
  { code: 'roles.manage', name: 'Gestionar Roles', description: 'Permite gestionar roles y permisos', module: 'users' },
  
  // Módulo: Dashboard y Reportes
  { code: 'dashboard.view', name: 'Ver Dashboard', description: 'Permite ver el panel principal', module: 'dashboard' },
  { code: 'reports.view', name: 'Ver Reportes', description: 'Permite ver reportes y estadísticas', module: 'reports' },
  { code: 'reports.export', name: 'Exportar Reportes', description: 'Permite exportar reportes', module: 'reports' },
];

// Permisos por defecto para cada rol
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: SYSTEM_PERMISSIONS.map(p => p.code), // Admin tiene todos los permisos
  TRAINER: [
    // Socios: solo ver
    'members.view',
    // Rutinas: completo
    'routines.view', 'routines.create', 'routines.edit', 'routines.delete',
    // Biometría: completo
    'biometrics.view', 'biometrics.create', 'biometrics.edit',
    // Nutrición: ver y crear
    'nutrition.view', 'nutrition.create', 'nutrition.edit',
    // Reservas: ver y crear
    'reservations.view', 'reservations.create',
    // Ejercicios: ver
    'exercises.view',
    // Dashboard
    'dashboard.view',
  ],
};

async function main() {
  console.log('🚀 Iniciando seed de usuarios y permisos...\n');

  // 1. Crear todos los permisos del sistema
  console.log('📋 Creando permisos del sistema...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, description: perm.description, module: perm.module },
      create: perm,
    });
  }
  console.log(`   ✅ ${SYSTEM_PERMISSIONS.length} permisos creados/actualizados\n`);

  // 2. Crear o actualizar usuario administrador inicial (Verónica)
  console.log('👤 Creando/actualizando usuario administrador...');
  const adminEmail = 'veronicarequena2@gmail.com';
  const adminPassword = await bcrypt.hash('Elarca2026', 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
      firstName: 'Verónica Analia',
      lastName: 'Requena',
      dni: '30108930',
      phone: '11240209461',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: adminEmail,
      password: adminPassword,
      firstName: 'Verónica Analia',
      lastName: 'Requena',
      dni: '30108930',
      phone: '11240209461',
      role: 'ADMIN',
      isActive: true,
    },
  });
  // Asignar todos los permisos al admin (eliminar y volver a crear para evitar duplicados)
  await prisma.userPermission.deleteMany({ where: { userId: admin.id } });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.userPermission.create({
      data: {
        userId: admin.id,
        permissionId: perm.id,
        granted: true,
      },
    });
  }
  console.log(`   ✅ Administrador actualizado: ${admin.email}`);
  console.log(`   📧 Email: ${admin.email}`);
  console.log(`   🔑 Contraseña inicial: Elarca2026`);
  console.log(`   ⚠️  IMPORTANTE: Cambiar la contraseña después del primer login\n`);

  // 3. Crear o actualizar usuario entrenador demo
  console.log('👤 Creando/actualizando usuario entrenador demo...');
  const trainerEmail = 'ariel_ale75@hotmail.com';
  const trainerPassword = await bcrypt.hash('Entrenador123', 10);
  const trainer = await prisma.user.upsert({
    where: { email: trainerEmail },
    update: {
      password: trainerPassword,
      firstName: 'Emmanuel Fernando',
      lastName: 'Paredes',
      dni: '31282905',
      phone: '1139244649',
      role: 'TRAINER',
      isActive: true,
    },
    create: {
      email: trainerEmail,
      password: trainerPassword,
      firstName: 'Emmanuel Fernando',
      lastName: 'Paredes',
      dni: '31282905',
      phone: '1139244649',
      role: 'TRAINER',
      isActive: true,
    },
  });
  // Asignar permisos por defecto de TRAINER (eliminar y volver a crear para evitar duplicados)
  await prisma.userPermission.deleteMany({ where: { userId: trainer.id } });
  const trainerPermCodes = ROLE_DEFAULT_PERMISSIONS.TRAINER || [];
  const trainerPerms = await prisma.permission.findMany({
    where: { code: { in: trainerPermCodes as string[] } },
  });
  for (const perm of trainerPerms) {
    await prisma.userPermission.create({
      data: {
        userId: trainer.id,
        permissionId: perm.id,
        granted: true,
      },
    });
  }
  console.log(`   ✅ Entrenador demo actualizado: ${trainer.email}`);
  console.log(`   👤 Nombre: Emmanuel Fernando Paredes`);
  console.log(`   🔑 Contraseña: Entrenador123\n`);

  console.log('✨ Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
