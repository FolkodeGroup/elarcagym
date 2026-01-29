import { PrismaClient } from './src/generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function testCreateMemberWithoutPassword() {
  console.log('🧪 Probando creación de socio sin contraseña...\n');
  
  try {
    // Crear un socio de prueba sin contraseña
    const testMember = await prisma.member.create({
      data: {
        firstName: 'Darío',
        lastName: 'Gimenez',
        dni: '32592833',
        email: 'dgimenez.developer@gmail.com',
        phone: '1169695436',
        status: 'ACTIVE',
        phase: 'volumen'
        // NO incluimos password
      }
    });
    
    console.log('✅ Socio creado exitosamente SIN contraseña:');
    console.log(`   Nombre: ${testMember.firstName} ${testMember.lastName}`);
    console.log(`   DNI: ${testMember.dni}`);
    console.log(`   Email: ${testMember.email}`);
    console.log(`   Password: ${testMember.password || 'NULL'}`);
    console.log(`   ID: ${testMember.id}\n`);
    
    // Listar todos los socios
    const allMembers = await prisma.member.findMany();
    console.log(`📊 Total de socios en la base de datos: ${allMembers.length}`);
    allMembers.forEach((m, i) => {
      console.log(`   ${i+1}. ${m.firstName} ${m.lastName} - DNI: ${m.dni}`);
    });
    
  } catch (error) {
    console.error('❌ Error al crear socio:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateMemberWithoutPassword();
