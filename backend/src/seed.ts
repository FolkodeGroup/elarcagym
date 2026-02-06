// Script para crear un usuario administrador inicial
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Verificar si ya existe un admin
  const existingAdmin = await prisma.member.findUnique({
    where: { email: 'admin@elarca.com' }
  });

  if (existingAdmin) {
    console.log('El usuario admin ya existe');
    return;
  }

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.member.create({
    data: {
      email: 'admin@elarca.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'El Arca',
      dni: '00000001',
      phone: '0000000000',
      status: 'ACTIVE',
      phase: 'admin'
    }
  });

  console.log('Usuario admin creado:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
