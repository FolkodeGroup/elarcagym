import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function migrateCategories() {
  // 1. Obtener todas las categorías antiguas (texto libre)
  const exercises = await prisma.exerciseMaster.findMany();
  const rawCategories = exercises.map(e => e.category).filter(Boolean);

  // 2. Normalizar a mayúsculas y eliminar duplicados
  const uniqueCategories = Array.from(new Set(rawCategories.map(c => c.trim().toUpperCase())));

  // 3. Crear categorías en la nueva tabla
  const categoryMap: Record<string, string> = {};
  for (const name of uniqueCategories) {
    const cat = await prisma.exerciseCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    categoryMap[name] = cat.id;
  }

  // 4. Actualizar ejercicios para usar categoryId
  for (const ex of exercises) {
    const normalized = ex.category?.trim().toUpperCase();
    if (normalized && categoryMap[normalized]) {
      await prisma.exerciseMaster.update({
        where: { id: ex.id },
        data: { categoryId: categoryMap[normalized] }
      });
    }
  }

  // 5. (Opcional) Eliminar campo category antiguo si ya no se usa
  console.log('Migración completada. Categorías migradas:', uniqueCategories.length);
}

migrateCategories().then(() => {
  prisma.$disconnect();
});
