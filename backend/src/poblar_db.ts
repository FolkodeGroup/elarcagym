import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Poblando la base de datos con datos de ejemplo ---');

  // 1. Crear 15 miembros
  const members = [];
  for (let i = 0; i < 15; i++) {
    const member = await prisma.member.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        dni: faker.string.numeric(8),
        email: faker.internet.email(),
        phone: faker.phone.number({ style: 'national' }),
        status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
        joinDate: faker.date.past({ years: 2 }),
        phase: faker.helpers.arrayElement(['inicio', 'progreso', 'mantenimiento', 'objetivo']),
        bioObjective: faker.lorem.words(3),
        photoUrl: faker.image.avatar(),
      },
    });
    members.push(member);
  }
  console.log(`✔️  Miembros creados: ${members.length}`);

  // 2. Crear productos
  const productNames = [
    'Proteína Whey', 'Creatina', 'Barra Energética', 'Bebida Isotónica',
    'Camiseta Gym', 'Short Deportivo', 'Guantes', 'Toalla', 'Shaker', 'Gorra',
  ];
  const products: Array<{ id: string; name: string; price: number; category: string; stock: number }> = [];
  for (const name of productNames) {
    const product = await prisma.product.create({
      data: {
        name,
        price: faker.number.float({ min: 2000, max: 15000, fractionDigits: 2 }),
        category: faker.helpers.arrayElement(['SUPPLEMENT', 'DRINK', 'MERCHANDISE', 'OTHER']),
        stock: faker.number.int({ min: 10, max: 100 }),
      },
    });
    products.push(product);
  }
  console.log(`✔️  Productos creados: ${products.length}`);

  // 3. Crear ventas y items de venta
  for (let i = 0; i < 10; i++) {
    const member = faker.helpers.arrayElement(members);
    const sale = await prisma.sale.create({
      data: {
        date: faker.date.recent({ days: 30 }),
        total: 0, // se actualizará luego
        memberId: member.id,
        items: {
          create: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() => {
            const product = faker.helpers.arrayElement(products);
            const qty = faker.number.int({ min: 1, max: 5 });
            return {
              productId: product.id,
              quantity: qty,
              priceAtSale: product.price,
              productName: product.name,
            };
          }),
        },
      },
      include: { items: true },
    });
    // Calcular total
    const total = sale.items.reduce((acc, item) => acc + item.priceAtSale * item.quantity, 0);
    await prisma.sale.update({ where: { id: sale.id }, data: { total } });
  }
  console.log('✔️  Ventas y items de venta creados');

  // 4. Crear pagos de cuotas
  for (const member of members) {
    const pagos = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < pagos; i++) {
      await prisma.paymentLog.create({
        data: {
          date: faker.date.past({ years: 1 }),
          amount: faker.number.float({ min: 3000, max: 35000, fractionDigits: 2 }),
          concept: 'Cuota Mensual',
          method: faker.helpers.arrayElement(['EFECTIVO', 'TRANSFERENCIA', 'MERCADO PAGO']),
          memberId: member.id,
        },
      });
    }
  }
  console.log('✔️  Pagos de cuotas creados');

  // 5. Crear rutinas y días de rutina para algunos miembros
  for (let i = 0; i < 8; i++) {
    const member = faker.helpers.arrayElement(members);
    await prisma.routine.create({
      data: {
        name: faker.lorem.words(2),
        goal: faker.lorem.words(2),
        assignedBy: 'Entrenador Demo',
        memberId: member.id,
        days: {
          create: [
            {
              dayName: 'Lunes',
              exercises: {
                create: [
                  { name: 'Press de Banca Plano', series: '4', reps: '12', weight: '60', notes: 'Calentar bien' },
                  { name: 'Pull Over', series: '3', reps: '15', weight: '30', notes: '' },
                ],
              },
            },
            {
              dayName: 'Miércoles',
              exercises: {
                create: [
                  { name: 'Sentadilla Libre', series: '4', reps: '10', weight: '80', notes: '' },
                  { name: 'Prensa de Piernas', series: '3', reps: '12', weight: '120', notes: '' },
                ],
              },
            },
          ],
        },
      },
    });
  }
  console.log('✔️  Rutinas y días de rutina creados');

  // 6. Crear logs biométricos para algunos miembros
  for (const member of members.slice(0, 10)) {
    for (let i = 0; i < 3; i++) {
      await prisma.biometricLog.create({
        data: {
          date: faker.date.past({ years: 1 }),
          weight: faker.number.float({ min: 60, max: 110, fractionDigits: 1 }),
          height: faker.number.float({ min: 1.55, max: 2.0, fractionDigits: 2 }),
          bodyFat: faker.number.float({ min: 10, max: 30, fractionDigits: 1 }),
          chest: faker.number.float({ min: 80, max: 120, fractionDigits: 1 }),
          waist: faker.number.float({ min: 70, max: 110, fractionDigits: 1 }),
          abdomen: faker.number.float({ min: 70, max: 110, fractionDigits: 1 }),
          hips: faker.number.float({ min: 80, max: 120, fractionDigits: 1 }),
          glutes: faker.number.float({ min: 80, max: 120, fractionDigits: 1 }),
          rightThigh: faker.number.float({ min: 50, max: 70, fractionDigits: 1 }),
          leftThigh: faker.number.float({ min: 50, max: 70, fractionDigits: 1 }),
          rightCalf: faker.number.float({ min: 30, max: 45, fractionDigits: 1 }),
          leftCalf: faker.number.float({ min: 30, max: 45, fractionDigits: 1 }),
          rightArm: faker.number.float({ min: 25, max: 45, fractionDigits: 1 }),
          leftArm: faker.number.float({ min: 25, max: 45, fractionDigits: 1 }),
          neck: faker.number.float({ min: 30, max: 45, fractionDigits: 1 }),
          memberId: member.id,
        },
      });
    }
  }
  console.log('✔️  Logs biométricos creados');

  // 7. Crear dietas para algunos miembros
  for (const member of members.slice(0, 8)) {
    await prisma.diet.create({
      data: {
        name: 'Dieta ejemplo',
        calories: faker.number.int({ min: 1800, max: 3500 }),
        description: faker.lorem.sentence(),
        memberId: member.id,
      },
    });
  }
  console.log('✔️  Dietas creadas');

  // 8. Crear horarios habituales para algunos miembros
  for (const member of members.slice(0, 10)) {
    await prisma.habitualSchedule.create({
      data: {
        day: faker.helpers.arrayElement(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']),
        start: faker.helpers.arrayElement(['07:00', '08:00', '09:00', '18:00', '19:00']),
        end: faker.helpers.arrayElement(['08:00', '09:00', '10:00', '19:00', '20:00']),
        memberId: member.id,
      },
    });
  }
  console.log('✔️  Horarios habituales creados');

  // 9. Crear slots y reservas
  for (let i = 0; i < 10; i++) {
    const slot = await prisma.slot.create({
      data: {
        date: faker.date.soon({ days: 15 }),
        time: faker.helpers.arrayElement(['07:00', '08:00', '09:00', '18:00', '19:00']),
        duration: faker.number.int({ min: 30, max: 90 }),
        status: faker.helpers.arrayElement(['DISPONIBLE', 'OCUPADO']),
        color: faker.color.rgb(),
      },
    });
    // Crear reserva para un miembro
    await prisma.reservation.create({
      data: {
        slotId: slot.id,
        memberId: faker.helpers.arrayElement(members).id,
        clientName: faker.person.fullName(),
        clientPhone: faker.phone.number({ style: 'national' }),
        clientEmail: faker.internet.email(),
        notes: faker.lorem.sentence(),
        attended: faker.datatype.boolean(),
      },
    });
  }
  console.log('✔️  Slots y reservas creados');

  // 10. Crear notificaciones para algunos usuarios (User)
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Bienvenido al sistema',
        message: 'Este es un mensaje de ejemplo para notificaciones.',
        type: 'info',
        link: '/',
      },
    });
  }
  console.log('✔️  Notificaciones de ejemplo creadas');

  // 11. Crear plantillas de nutrición
  await prisma.nutritionTemplate.create({
    data: {
      title: 'Recomendaciones generales',
      content: 'Bebe al menos 2 litros de agua al día. Incluye proteínas en cada comida. Evita azúcares simples.',
    },
  });
  console.log('✔️  Plantilla de nutrición creada');

  // 12. Crear algunos en lista de espera
  for (let i = 0; i < 5; i++) {
    await prisma.waitlist.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number({ style: 'national' }),
        reservationDate: faker.date.soon({ days: 30 }),
        status: faker.helpers.arrayElement(['PENDIENTE', 'CONFIRMADO', 'CANCELADO']),
      },
    });
  }
  console.log('✔️  Lista de espera poblada');

  console.log('--- Poblado de base de datos finalizado ---');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());