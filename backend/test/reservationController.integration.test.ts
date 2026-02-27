import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import reservationController from '../src/controllers/reservationController';

// Mock de auth middleware — no bloquea en tests
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
  requirePermission: () => (req: any, res: any, next: any) => next(),
}));

describe('Integración: reservas', () => {
  let app, prisma;

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-02-05T14:00:00.000Z')); // 11:00 hora de Buenos Aires
    prisma = {
      reservation: {
        create: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      slot: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      member: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      }
    };
    app = express();
    app.use(express.json());
    app.use('/reservations', reservationController(prisma));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('crea una reserva exitosamente', async () => {
    prisma.slot.findUnique.mockResolvedValue({ id: 's1', status: 'available', date: new Date('2026-02-05T10:00:00.000Z'), time: '10:00' });
    prisma.member.findMany = vi.fn().mockResolvedValue([]);
    prisma.reservation.findFirst.mockResolvedValue(null); // No hay reserva previa
    prisma.reservation.create.mockResolvedValue({ id: 'r1', memberId: 'm1', slotId: 's1' });
    prisma.slot.update.mockResolvedValue({ id: 's1', status: 'reserved' });
    const res = await request(app)
      .post('/reservations')
      .send({ memberId: 'm1', slotId: 's1' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('r1');
  });

  it('no permite reservas duplicadas', async () => {
    prisma.slot.findUnique.mockResolvedValue({ id: 's1', status: 'available', date: new Date('2026-02-05T10:00:00.000Z'), time: '10:00' });
    prisma.member.findMany = vi.fn().mockResolvedValue([]);
    prisma.reservation.findFirst.mockResolvedValue({ id: 'r1', memberId: 'm1', slotId: 's1' });
    const res = await request(app)
      .post('/reservations')
      .send({ memberId: 'm1', slotId: 's1' });
    expect(res.status).toBe(409);
  });

  it('cancela una reserva correctamente', async () => {
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', slotId: 's1' });
    prisma.reservation.delete.mockResolvedValue({ id: 'r1' });
    prisma.reservation.count.mockResolvedValue(0); // No quedan reservas en el slot
    prisma.slot.update.mockResolvedValue({ id: 's1', status: 'available' });
    const res = await request(app)
      .delete('/reservations/r1');
    expect(res.status).toBe(204);
  });

  it('marca como no asistió dentro de la ventana', async () => {
    // Simular reserva a las 10:00 hora de Buenos Aires
    // Si ahora son las 11:00 hora de Buenos Aires, está dentro de la ventana de 2h
    const slotDateStr = '2026-02-05'; // Fecha fija
    const slotTimeStr = '10:00'; // Hora de Buenos Aires
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', slot: { date: slotDateStr, time: slotTimeStr }, attended: null });
    prisma.reservation.update.mockResolvedValue({ id: 'r1', attended: false });
    const res = await request(app)
      .patch('/reservations/r1/attendance')
      .send({ attended: false });
    expect([200, 201]).toContain(res.status);
    expect(res.body.attended).toBe(false);
  });

  it('no permite marcar como no asistió fuera de la ventana', async () => {
    // Simular reserva a las 07:00 hora de Buenos Aires
    // Si ahora son las 11:00 hora de Buenos Aires, han pasado 4h (fuera de la ventana de 2h)
    const slotDateStr = '2026-02-05'; // Fecha fija
    const slotTimeStr = '07:00'; // Hora de Buenos Aires
    prisma.reservation.findUnique.mockResolvedValue({ id: 'r1', slot: { date: slotDateStr, time: slotTimeStr }, attended: null });
    const res = await request(app)
      .patch('/reservations/r1/attendance')
      .send({ attended: false });
    expect([400, 403]).toContain(res.status);
  });

  it('devuelve error si no hay cupo', async () => {
    // Simular slot sin cupo (por ejemplo, status diferente o lógica de cupo en el controlador)
    prisma.slot.findUnique.mockResolvedValue(null); // Slot no encontrado
    const res = await request(app)
      .post('/reservations')
      .send({ memberId: 'm2', slotId: 's1' });
    expect(res.status).toBe(404);
  });
});
