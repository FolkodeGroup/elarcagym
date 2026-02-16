/**
 * Script de migración de categorías de ejercicios.
 *
 * Escenario A (pre-migración): La tabla ExerciseMaster todavía tiene la columna
 *   "category" como texto libre. El script lee esos valores, crea las categorías
 *   normalizadas (mayúsculas, sin duplicados) en ExerciseCategory, y actualiza
 *   cada ejercicio con el categoryId correspondiente.
 *
 * Escenario B (post-migración): La columna "category" ya fue eliminada y
 *   "categoryId" ya existe. El script simplemente se asegura de que todas las
 *   categorías referenciadas existan y seedea categorías predeterminadas si la
 *   tabla está vacía.
 *
 * Ejecutar:  npx tsx scripts/migrate_exercise_categories.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Categorías predeterminadas que se crean si la tabla está vacía
const DEFAULT_CATEGORIES = [
  'PECHO',
  'ESPALDA',
  'PIERNAS',
  'HOMBROS',
  'BÍCEPS',
  'TRÍCEPS',
  'ABDOMINALES',
  'GLÚTEOS',
  'CARDIO',
  'FUNCIONAL',
  'ESTIRAMIENTO',
];

async function migrateCategories() {
  console.log('=== Migración de categorías de ejercicios ===\n');

  // Detectar si la columna antigua "category" todavía existe
  const columns: { column_name: string }[] = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'ExerciseMaster' AND column_name = 'category';
  `;

  const hasOldColumn = columns.length > 0;

  if (hasOldColumn) {
    console.log('⚠️  Columna "category" (texto) detectada — ejecutando migración completa.\n');

    // Leer valores antiguos con raw SQL (Prisma ya no conoce el campo)
    const rows: { id: string; category: string }[] = await prisma.$queryRaw`
      SELECT id, category FROM "ExerciseMaster" WHERE category IS NOT NULL;
    `;

    // Normalizar a mayúsculas y eliminar duplicados
    const rawNames = rows.map(r => r.category.trim().toUpperCase()).filter(Boolean);
    const uniqueNames = Array.from(new Set(rawNames));

    console.log(`Categorías únicas encontradas: ${uniqueNames.length}`);
    uniqueNames.forEach(n => console.log(`  • ${n}`));

    // Crear categorías
    const categoryMap: Record<string, string> = {};
    for (const name of uniqueNames) {
      const cat = await prisma.exerciseCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      categoryMap[name] = cat.id;
    }

    // Detectar si "categoryId" ya existe
    const hasCategoryId: { column_name: string }[] = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ExerciseMaster' AND column_name = 'categoryId';
    `;

    if (hasCategoryId.length > 0) {
      // Actualizar ejercicios con su categoryId
      for (const row of rows) {
        const normalized = row.category.trim().toUpperCase();
        const catId = categoryMap[normalized];
        if (catId) {
          await prisma.$executeRaw`
            UPDATE "ExerciseMaster" SET "categoryId" = ${catId} WHERE id = ${row.id};
          `;
        }
      }
      console.log(`\n✅ ${rows.length} ejercicios actualizados con categoryId.`);
    } else {
      console.log('\n⚠️  La columna "categoryId" aún no existe. Ejecuta la migración Prisma primero:');
      console.log('   npx prisma migrate dev --name exercise_category_table\n');
    }
  } else {
    console.log('La columna "category" (texto) ya no existe — schema ya migrado.\n');

    // Asegurar categorías por defecto si la tabla está vacía
    const count = await prisma.exerciseCategory.count();
    if (count === 0) {
      console.log('Tabla ExerciseCategory vacía. Seeding categorías predeterminadas...\n');
      for (const name of DEFAULT_CATEGORIES) {
        await prisma.exerciseCategory.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        console.log(`  ✅ ${name}`);
      }
      console.log(`\n✅ ${DEFAULT_CATEGORIES.length} categorías creadas.`);
    } else {
      console.log(`La tabla ExerciseCategory ya tiene ${count} categoría(s). No se requiere acción.`);

      // Verificar integridad: ejercicios sin categoría válida
      const orphaned: { id: string; name: string }[] = await prisma.$queryRaw`
        SELECT em.id, em.name
        FROM "ExerciseMaster" em
        LEFT JOIN "ExerciseCategory" ec ON em."categoryId" = ec.id
        WHERE ec.id IS NULL;
      `;
      if (orphaned.length > 0) {
        console.log(`\n⚠️  ${orphaned.length} ejercicio(s) sin categoría válida:`);
        orphaned.forEach(o => console.log(`  • ${o.name} (${o.id})`));
      } else {
        console.log('✅ Todos los ejercicios tienen categoría válida.');
      }
    }
  }

  console.log('\n=== Migración finalizada ===');
}

migrateCategories()
  .catch(err => {
    console.error('Error durante la migración:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
