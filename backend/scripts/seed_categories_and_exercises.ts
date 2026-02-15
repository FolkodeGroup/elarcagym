import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  'PECHO',
  'PIERNAS', 
  'PANTORRILLAS',
  'ESPALDA',
  'HOMBROS',
  'TRAPECIO',
  'BÍCEPS',
  'TRÍCEPS',
  'ABDOMEN',
  'CARDIO',
  'GLÚTEOS'
];

const exercises = [
  { name: 'Press de Banca Plano', category: 'PECHO' },
  { name: 'Press de Banca Inclinado', category: 'PECHO' },
  { name: 'Press de Banca Declinado', category: 'PECHO' },
  { name: 'Aperturas con Mancuernas', category: 'PECHO' },
  { name: 'Fondos en Paralelas', category: 'PECHO' },
  { name: 'Pull Over', category: 'PECHO' },
  { name: 'Sentadilla Libre', category: 'PIERNAS' },
  { name: 'Prensa de Piernas', category: 'PIERNAS' },
  { name: 'Extensión de Cuádriceps', category: 'PIERNAS' },
  { name: 'Curl Femoral', category: 'PIERNAS' },
  { name: 'Peso Muerto Rumano', category: 'PIERNAS' },
  { name: 'Zancadas', category: 'PIERNAS' },
  { name: 'Elevación de Talones', category: 'PANTORRILLAS' },
  { name: 'Gemelos en Prensa', category: 'PANTORRILLAS' },
  { name: 'Remo con Barra', category: 'ESPALDA' },
  { name: 'Remo en Máquina', category: 'ESPALDA' },
  { name: 'Jalón al Pecho', category: 'ESPALDA' },
  { name: 'Jalón Tras Nuca', category: 'ESPALDA' },
  { name: 'Dominadas', category: 'ESPALDA' },
  { name: 'Peso Muerto', category: 'ESPALDA' },
  { name: 'Press Militar', category: 'HOMBROS' },
  { name: 'Elevaciones Laterales', category: 'HOMBROS' },
  { name: 'Elevaciones Frontales', category: 'HOMBROS' },
  { name: 'Pájaros', category: 'HOMBROS' },
  { name: 'Encogimientos', category: 'TRAPECIO' },
  { name: 'Curl de Bíceps con Barra', category: 'BÍCEPS' },
  { name: 'Curl de Bíceps con Mancuernas', category: 'BÍCEPS' },
  { name: 'Curl Martillo', category: 'BÍCEPS' },
  { name: 'Curl Concentrado', category: 'BÍCEPS' },
  { name: 'Press Francés', category: 'TRÍCEPS' },
  { name: 'Fondos en Banco', category: 'TRÍCEPS' },
  { name: 'Extensión de Tríceps en Polea', category: 'TRÍCEPS' },
  { name: 'Patada de Tríceps', category: 'TRÍCEPS' },
  { name: 'Crunch Abdominal', category: 'ABDOMEN' },
  { name: 'Elevación de Piernas', category: 'ABDOMEN' },
  { name: 'Plancha', category: 'ABDOMEN' },
  { name: 'Abdominales en Máquina', category: 'ABDOMEN' },
  { name: 'Twist Ruso', category: 'ABDOMEN' },
  { name: 'Mountain Climbers', category: 'ABDOMEN' },
  { name: 'Burpees', category: 'CARDIO' },
  { name: 'Cinta de Correr', category: 'CARDIO' },
  { name: 'Bicicleta Fija', category: 'CARDIO' },
  { name: 'Elíptico', category: 'CARDIO' },
  { name: 'Remo en Máquina', category: 'CARDIO' },
  { name: 'Saltos de Tijera', category: 'CARDIO' },
  { name: 'Battle Rope', category: 'CARDIO' },
  { name: 'Soga', category: 'CARDIO' },
  { name: 'Step', category: 'CARDIO' },
  { name: 'Press Arnold', category: 'HOMBROS' },
  { name: 'Face Pull', category: 'HOMBROS' },
  { name: 'Hip Thrust', category: 'GLÚTEOS' },
  { name: 'Abducción de Cadera', category: 'GLÚTEOS' },
  { name: 'Adducción de Cadera', category: 'PIERNAS' },
  { name: 'Peso Muerto Sumo', category: 'PIERNAS' },
  { name: 'Remo Gironda', category: 'ESPALDA' },
  { name: 'Curl de Piernas Acostado', category: 'PIERNAS' },
  { name: 'Press de Piernas Unilateral', category: 'PIERNAS' },
];

async function main() {
  console.log('🏋️ Iniciando carga de categorías y ejercicios...\n');
  
  // 1. Crear categorías
  console.log('📂 Creando categorías...');
  const categoryMap: Record<string, string> = {};
  
  for (const categoryName of CATEGORIES) {
    const category = await prisma.exerciseCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });
    categoryMap[categoryName] = category.id;
    console.log(`  ✅ ${categoryName}`);
  }
  
  console.log(`\n✅ ${CATEGORIES.length} categorías creadas/actualizadas\n`);
  
  // 2. Cargar ejercicios
  console.log('💪 Cargando ejercicios...');
  let nuevos = 0;
  let existentes = 0;
  
  for (const ex of exercises) {
    const categoryId = categoryMap[ex.category];
    if (!categoryId) {
      console.warn(`⚠️  Categoría no encontrada para: ${ex.name} (${ex.category})`);
      continue;
    }
    
    const existe = await prisma.exerciseMaster.findFirst({ 
      where: { name: ex.name } 
    });
    
    if (!existe) {
      await prisma.exerciseMaster.create({ 
        data: { 
          name: ex.name, 
          categoryId 
        } 
      });
      nuevos++;
    } else {
      existentes++;
    }
  }
  
  console.log(`\n✅ Ejercicios cargados: ${nuevos} nuevos, ${existentes} ya existían`);
  console.log(`📊 Total de ejercicios en BD: ${nuevos + existentes}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
