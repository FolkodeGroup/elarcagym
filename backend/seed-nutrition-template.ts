import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const defaultRecommendations = `OPCIONES DE INFUSIONES (no cuenta como ingesta de agua)
•CAFÉ TOSTADO (no torrado)
•TÉ (cualquier opción)
•MATE COCIDO
•MATE
•TERERÉ (puede ser con jugo clight)
•JUGO DE LIMÓN, MENTA Y GENGIBRE (Edulcorante, 200ml de agua, medio limón grande ó uno mediano. Menta y gengibre a gusto)

OPCIONES DE...
•VERDURAS MIXTAS
Zuccini, Morrón rojo, Zapallito, Calabaza, Zapallo, Hongos, chaucha, Hinojo, Espárrago, Col de Bruselas, Acelga, Espinaca, Morrón verde, Hoja de nabo, Col verde, Zuccini, lechuga, rúcula, pepino, apio, acelga, cebolla

•ENSALADA MIXTA
Repollo, Repollo colorado, coliflor, berenjena, tomate, cebolla, zanahoria, lechuga

CONDIMENTOS
•PARA LAS ENSALADAS: vinagre, pimienta, ajo molido,pimentón, pimentón dulce, orégano, romero, albahaca, comino y aceto balsámico
•PARA LAS CARNES: Ajo molido, pimienta, pimentón dulce, comino, provenzal, orégano
•TORTA DE AVENA DULCE: Opcionales... Edulcorante, stevia, escencia de vainilla, 20grs de cacao amargo, 20grs de coco rallado, canela, rayadura de naranja, limón, etc. Cocinar a fuego lento en un horno o sartén que no se pegue (se puede agregar fritolin)
•TORTA DE AVENA SALADA: opcionales... 10grs de chía, sal rosa, 10grs de queso rallado, orégano. Cocinar a fuego lento en un horno o en una sartén.

IMPORTANTE
•La dieta es de lunes a lunes
•Los alimentos se pesan en crudo
•3 litros de agua por dia como mínimo
•Gelatina light a gusto (usálo siempre en caso de ansiedad)
•Jugos sin azúcar lo mínimo posible
•Gaseosas light lo mínimo posible
•Nada de alcohol
•El modo de cocción de la comidas es indistinto, puede ser a la plancha, al horno o hervido

HORARIOS
•Empezás siempre con la comida 1 y comés cada 3.30/4hs.
•Si te pasas de horario o te desacomodás en algún momento, no hay mayor problema, lo mas importante es que comas TODAS las comidas.`;

async function seedNutritionTemplate() {
  try {
    // Verificar si ya existe una plantilla activa
    const existing = await prisma.nutritionTemplate.findFirst({
      where: { isActive: true }
    });

    if (existing) {
      console.log('✅ Ya existe una plantilla de recomendaciones activa');
      return;
    }

    // Crear la plantilla por defecto
    const template = await prisma.nutritionTemplate.create({
      data: {
        title: 'AYUDA E INDICACIONES GENERALES PARA LLEVAR TU DIETA CORRECTAMENTE',
        content: defaultRecommendations,
        isActive: true
      }
    });

    console.log('✅ Plantilla de recomendaciones nutricionales creada exitosamente');
    console.log(`   ID: ${template.id}`);
  } catch (error) {
    console.error('❌ Error al crear plantilla de recomendaciones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedNutritionTemplate();
