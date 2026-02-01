import { PrismaClient } from '../src/generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const ejercicios = await prisma.exerciseMaster.findMany();
  let actualizados = 0;
  for (const ex of ejercicios) {
    if (ex.category !== ex.category.toUpperCase()) {
      await prisma.exerciseMaster.update({
        where: { id: ex.id },
        data: { category: ex.category.toUpperCase() },
      });
      actualizados++;
    }
  }
  console.log(`✅ Grupos musculares actualizados a mayúsculas: ${actualizados}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
