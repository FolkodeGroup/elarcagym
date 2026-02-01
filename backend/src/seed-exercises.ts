import { PrismaClient } from './generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const exercises = [
  { name: 'Press de Banca Plano', category: 'Pecho' },
  { name: 'Press de Banca Inclinado', category: 'Pecho' },
  { name: 'Press de Banca Declinado', category: 'Pecho' },
  { name: 'Aperturas con Mancuernas', category: 'Pecho' },
  { name: 'Fondos en Paralelas', category: 'Pecho' },
  { name: 'Pull Over', category: 'Pecho' },
  { name: 'Sentadilla Libre', category: 'Piernas' },
  { name: 'Prensa de Piernas', category: 'Piernas' },
  { name: 'Extensión de Cuádriceps', category: 'Piernas' },
  { name: 'Curl Femoral', category: 'Piernas' },
  { name: 'Peso Muerto Rumano', category: 'Piernas' },
  { name: 'Zancadas', category: 'Piernas' },
  { name: 'Elevación de Talones', category: 'Pantorrillas' },
  { name: 'Gemelos en Prensa', category: 'Pantorrillas' },
  { name: 'Remo con Barra', category: 'Espalda' },
  { name: 'Remo en Máquina', category: 'Espalda' },
  { name: 'Jalón al Pecho', category: 'Espalda' },
  { name: 'Jalón Tras Nuca', category: 'Espalda' },
  { name: 'Dominadas', category: 'Espalda' },
  { name: 'Peso Muerto', category: 'Espalda' },
  { name: 'Press Militar', category: 'Hombros' },
  { name: 'Elevaciones Laterales', category: 'Hombros' },
  { name: 'Elevaciones Frontales', category: 'Hombros' },
  { name: 'Pájaros', category: 'Hombros' },
  { name: 'Encogimientos', category: 'Trapecio' },
  { name: 'Curl de Bíceps con Barra', category: 'Bíceps' },
  { name: 'Curl de Bíceps con Mancuernas', category: 'Bíceps' },
  { name: 'Curl Martillo', category: 'Bíceps' },
  { name: 'Curl Concentrado', category: 'Bíceps' },
  { name: 'Press Francés', category: 'Tríceps' },
  { name: 'Fondos en Banco', category: 'Tríceps' },
  { name: 'Extensión de Tríceps en Polea', category: 'Tríceps' },
  { name: 'Patada de Tríceps', category: 'Tríceps' },
  { name: 'Crunch Abdominal', category: 'Abdomen' },
  { name: 'Elevación de Piernas', category: 'Abdomen' },
  { name: 'Plancha', category: 'Abdomen' },
  { name: 'Abdominales en Máquina', category: 'Abdomen' },
  { name: 'Twist Ruso', category: 'Abdomen' },
  { name: 'Mountain Climbers', category: 'Abdomen' },
  { name: 'Burpees', category: 'Cardio' },
  { name: 'Cinta de Correr', category: 'Cardio' },
  { name: 'Bicicleta Fija', category: 'Cardio' },
  { name: 'Elíptico', category: 'Cardio' },
  { name: 'Remo en Máquina', category: 'Cardio' },
  { name: 'Saltos de Tijera', category: 'Cardio' },
  { name: 'Battle Rope', category: 'Cardio' },
  { name: 'Soga', category: 'Cardio' },
  { name: 'Step', category: 'Cardio' },
  { name: 'Press Arnold', category: 'Hombros' },
  { name: 'Face Pull', category: 'Hombros' },
  { name: 'Hip Thrust', category: 'Glúteos' },
  { name: 'Abducción de Cadera', category: 'Glúteos' },
  { name: 'Adducción de Cadera', category: 'Piernas' },
  { name: 'Peso Muerto Sumo', category: 'Piernas' },
  { name: 'Remo Gironda', category: 'Espalda' },
  { name: 'Curl de Piernas Acostado', category: 'Piernas' },
  { name: 'Press de Piernas Unilateral', category: 'Piernas' },
];

async function main() {
  let nuevos = 0;
  for (const ex of exercises) {
    // Normalizar el grupo muscular a mayúsculas
    const exNormalized = { ...ex, category: ex.category.toUpperCase() };
    const existe = await prisma.exerciseMaster.findFirst({ where: { name: exNormalized.name } });
    if (!existe) {
      await prisma.exerciseMaster.create({ data: exNormalized });
      nuevos++;
    }
  }
  console.log(`✅ Ejercicios cargados correctamente. Nuevos insertados: ${nuevos}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
