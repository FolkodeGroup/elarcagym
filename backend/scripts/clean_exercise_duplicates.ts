/**
 * Script de limpieza de ejercicios duplicados
 * 
 * Este script:
 * 1. Normaliza todos los nombres de ejercicios a MAYÚSCULAS
 * 2. Detecta y elimina duplicados (ignorando tildes y mayúsculas)
 * 3. Actualiza las referencias en ExerciseDetail (rutinas)
 * 4. Proceso atómico usando transacciones de Prisma
 * 
 * Uso: npx tsx scripts/clean_exercise_duplicates.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Normaliza un string para comparación (quita tildes y convierte a minúsculas)
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover tildes
    .trim();
}

/**
 * Convierte un string a MAYÚSCULAS manteniendo las tildes
 */
function toUpperCase(str: string): string {
  return str.toUpperCase().trim();
}

interface ExerciseGroup {
  normalizedName: string;
  exercises: Array<{
    id: string;
    name: string;
    categoryId: string;
  }>;
}

async function cleanExerciseDuplicates() {
  console.log('🔄 Iniciando limpieza de ejercicios duplicados...\n');

  try {
    // 1. Obtener todos los ejercicios
    console.log('📊 Obteniendo todos los ejercicios...');
    const allExercises = await prisma.exerciseMaster.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
    });
    console.log(`   ✓ Total de ejercicios en BD: ${allExercises.length}\n`);

    // 2. Agrupar ejercicios por nombre normalizado
    console.log('🔍 Agrupando ejercicios duplicados...');
    const exerciseGroups: Map<string, ExerciseGroup> = new Map();

    allExercises.forEach((exercise) => {
      const normalized = normalizeForComparison(exercise.name);
      
      if (!exerciseGroups.has(normalized)) {
        exerciseGroups.set(normalized, {
          normalizedName: normalized,
          exercises: [],
        });
      }
      
      exerciseGroups.get(normalized)!.exercises.push(exercise);
    });

    // 3. Identificar grupos con duplicados
    const duplicateGroups = Array.from(exerciseGroups.values()).filter(
      (group) => group.exercises.length > 1
    );

    console.log(`   ✓ Grupos únicos: ${exerciseGroups.size}`);
    console.log(`   ✓ Grupos con duplicados: ${duplicateGroups.length}\n`);

    if (duplicateGroups.length > 0) {
      console.log('📋 Ejercicios duplicados encontrados:');
      console.log('─'.repeat(60));
      duplicateGroups.forEach((group) => {
        console.log(`\n${group.exercises[0].name.toUpperCase()} (${group.exercises.length} variantes):`);
        group.exercises.forEach((ex, idx) => {
          console.log(`   ${idx + 1}. "${ex.name}" (ID: ${ex.id.substring(0, 8)}...)`);
        });
      });
      console.log('\n' + '─'.repeat(60) + '\n');
    }

    // 4. Obtener todos los ExerciseDetail antes de la limpieza
    console.log('📝 Obteniendo ejercicios en rutinas...');
    const allExerciseDetails = await prisma.exerciseDetail.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    console.log(`   ✓ Total de ejercicios en rutinas: ${allExerciseDetails.length}\n`);

    // 5. Crear mapa de nombres antiguos -> nombres normalizados
    const nameMapping: Map<string, string> = new Map();
    
    exerciseGroups.forEach((group) => {
      // El nombre final será el primero del grupo en MAYÚSCULAS
      const finalName = toUpperCase(group.exercises[0].name);
      
      group.exercises.forEach((exercise) => {
        nameMapping.set(exercise.name, finalName);
      });
    });

    // 6. Ejecutar limpieza en una transacción
    console.log('🚀 Ejecutando limpieza en transacción atómica...\n');
    
    const result = await prisma.$transaction(async (tx) => {
      let exercisesUpdated = 0;
      let exercisesDeleted = 0;
      let detailsUpdated = 0;

      // 6a. Por cada grupo, conservar uno y eliminar los demás
      for (const group of exerciseGroups.values()) {
        const finalName = toUpperCase(group.exercises[0].name);
        const [keepExercise, ...deleteExercises] = group.exercises;

        // Actualizar el nombre del ejercicio que se conserva
        if (keepExercise.name !== finalName) {
          await tx.exerciseMaster.update({
            where: { id: keepExercise.id },
            data: { name: finalName },
          });
          exercisesUpdated++;
        }

        // Eliminar los duplicados
        for (const exercise of deleteExercises) {
          await tx.exerciseMaster.delete({
            where: { id: exercise.id },
          });
          exercisesDeleted++;
        }
      }

      // 6b. Actualizar todos los ExerciseDetail
      for (const detail of allExerciseDetails) {
        const newName = nameMapping.get(detail.name);
        
        if (newName && detail.name !== newName) {
          await tx.exerciseDetail.update({
            where: { id: detail.id },
            data: { name: newName },
          });
          detailsUpdated++;
        }
      }

      return {
        exercisesUpdated,
        exercisesDeleted,
        detailsUpdated,
      };
    });

    // 7. Mostrar resultados
    console.log('✅ Limpieza completada exitosamente!\n');
    console.log('📊 Resumen de cambios:');
    console.log('─'.repeat(60));
    console.log(`   • Ejercicios maestros actualizados: ${result.exercisesUpdated}`);
    console.log(`   • Ejercicios duplicados eliminados: ${result.exercisesDeleted}`);
    console.log(`   • Referencias en rutinas actualizadas: ${result.detailsUpdated}`);
    console.log('─'.repeat(60) + '\n');

    // 8. Verificar resultado final
    console.log('🔍 Verificando resultado final...');
    const finalExercises = await prisma.exerciseMaster.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    // Verificar que no hay duplicados
    const finalNormalized = new Set();
    let duplicatesFound = 0;

    finalExercises.forEach((ex) => {
      const normalized = normalizeForComparison(ex.name);
      if (finalNormalized.has(normalized)) {
        duplicatesFound++;
        console.log(`   ⚠️  Duplicado encontrado: ${ex.name}`);
      }
      finalNormalized.add(normalized);
    });

    if (duplicatesFound === 0) {
      console.log(`   ✓ No se encontraron duplicados`);
      console.log(`   ✓ Total de ejercicios únicos: ${finalExercises.length}\n`);
      
      console.log('📝 Muestra de ejercicios finales (primeros 10):');
      console.log('─'.repeat(60));
      finalExercises.slice(0, 10).forEach((ex, idx) => {
        console.log(`   ${idx + 1}. ${ex.name}`);
      });
      if (finalExercises.length > 10) {
        console.log(`   ... y ${finalExercises.length - 10} ejercicios más`);
      }
      console.log('─'.repeat(60) + '\n');
    } else {
      console.log(`   ⚠️  Se encontraron ${duplicatesFound} duplicados aún presentes\n`);
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
cleanExerciseDuplicates()
  .then(() => {
    console.log('🎉 Proceso completado con éxito!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
