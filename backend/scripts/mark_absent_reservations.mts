import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function markAbsentReservations() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const absentReservations = await prisma.reservation.findMany({
    where: {
      attended: null,
      slot: {
        date: {
          gte: new Date(todayStr + 'T00:00:00'),
          lte: new Date(todayStr + 'T23:59:59'),
        },
        time: {
          lt: twoHoursAgo.toTimeString().slice(0, 5),
        },
      },
    },
    include: { slot: true, member: true },
  });

  if (absentReservations.length === 0) {
    console.log('No hay reservas para marcar como ausentes.');
    return;
  }

  for (const reservation of absentReservations) {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { attended: false },
    });
    console.log(`Reserva de ${reservation.member?.firstName} ${reservation.member?.lastName} marcada como ausente.`);
  }
}

markAbsentReservations()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
