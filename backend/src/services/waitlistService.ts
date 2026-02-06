import { prisma } from '../prismaClient';

export const WaitlistService = {
  async create(data: {
    firstName: string;
    lastName: string;
    phone: string;
    reservationDate: string | Date;
    status?: string;
  }) {
    // Convertir reservationDate a Date si es string
    const reservationDate = typeof data.reservationDate === 'string' ? new Date(data.reservationDate) : data.reservationDate;
    return prisma.waitlist.create({ data: { ...data, reservationDate } });
  },

  async list() {
    return prisma.waitlist.findMany({ orderBy: { reservationDate: 'asc' } });
  },

  async update(id: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    reservationDate?: Date;
    status?: string;
  }) {
    return prisma.waitlist.update({ where: { id }, data });
  },

  async remove(id: string) {
    return prisma.waitlist.delete({ where: { id } });
  },

  async convertToMember(id: string) {
    const waitlist = await prisma.waitlist.findUnique({ where: { id } });
    if (!waitlist) throw new Error('Registro no encontrado');
    const member = await prisma.member.create({
      data: {
        firstName: waitlist.firstName,
        lastName: waitlist.lastName,
        phone: waitlist.phone,
        dni: '', // Add required dni field
        status: 'activo',
        joinDate: new Date(),
      }
    });
    await prisma.waitlist.delete({ where: { id } });
    return member;
  }
};
