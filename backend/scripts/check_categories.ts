import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function checkCategories() {
  console.log('🔍 Verificando categorías de ejercicios...\n');
  
  // Verificar categorías existentes
  const categories = await prisma.exerciseCategory.findMany({ orderBy: { name: 'asc' } });
  console.log(`📂 Categorías totales: ${categories.length}`);
  if (categories.length > 0) {
    console.log('Categorías:');
    categories.forEach(cat => console.log(`  - ${cat.name} (ID: ${cat.id})`));
  }
  
  console.log('\n');
  
  // Verificar ejercicios
  const exercises = await prisma.exerciseMaster.findMany({ include: { category: true } });
  console.log(`💪 Ejercicios totales: ${exercises.length}`);
  
  // Verificar cuántos ejercicios tienen categoría asignada
  const withCategory = exercises.filter(e => e.categoryId);
  console.log(`✅ Ejercicios con categoría asignada: ${withCategory.length}`);
  console.log(`❌ Ejercicios SIN categoría: ${exercises.length - withCategory.length}`);
  
  // Mostrar algunos ejemplos
  if (exercises.length > 0) {
    console.log('\nEjemplos de ejercicios:');
    exercises.slice(0, 5).forEach(ex => {
      console.log(`  - ${ex.name} → ${ex.category?.name || 'SIN CATEGORÍA'}`);
    });
  }
  
  console.log('\n✅ Verificación completada.');
}

checkCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
