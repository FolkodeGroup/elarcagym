import { PrismaClient } from './src/generated/prisma/client/client.js';

const prisma = new PrismaClient();

async function cleanDuplicateEmails() {
  const members = await prisma.member.findMany();
  const seen = new Set();
  for (const member of members) {
    if (seen.has(member.email)) {
      await prisma.member.delete({ where: { id: member.id } });
      console.log(`Eliminado duplicado: ${member.email} (${member.id})`);
    } else {
      seen.add(member.email);
    }
  }
  await prisma.$disconnect();
}

cleanDuplicateEmails();
