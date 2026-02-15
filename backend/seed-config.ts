import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedConfig() {
  try {
    console.log('Insertando configuración inicial...');
    
    await prisma.config.upsert({
      where: { key: 'monthly_fee' },
      update: { value: '35000', description: 'Cuota mensual del gimnasio' },
      create: { key: 'monthly_fee', value: '35000', description: 'Cuota mensual del gimnasio' }
    });
    
    console.log('✅ Configuración inicial creada exitosamente');
    console.log('   - Cuota mensual: $35,000');
    
  } catch (error) {
    console.error('❌ Error al insertar configuración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedConfig();
