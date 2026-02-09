import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function checkMembers() {
  console.log('📊 Verificando socios en la base de datos...\n');
  
  const members = await prisma.member.findMany({
    take: 10
  });
  
  console.log(`Total de socios encontrados: ${members.length}`);
  console.log('\nSocios registrados:');
  members.forEach((m, i) => {
    console.log(`${i+1}. ${m.firstName} ${m.lastName} - DNI: ${m.dni} - Email: ${m.email}`);
  });
  
  await prisma.$disconnect();
}

checkMembers().catch(console.error);
