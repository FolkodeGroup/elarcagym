import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import memberController from '../src/controllers/memberController';

describe('Integración: pago de membresía y cambio de estado', () => {
  let app, prisma;

  beforeEach(() => {
    prisma = {
      paymentLog: {
        create: vi.fn().mockResolvedValue({ id: 'pay1', amount: 1000, memberId: 'm1', date: new Date() })
      },
      member: {
        findUnique: vi.fn(),
        update: vi.fn()
      }
    };
    app = express();
    app.use(express.json());
    app.use('/members', memberController(prisma));
  });

  it('actualiza el estado a ACTIVE si estaba INACTIVE', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: 'INACTIVE' });
    prisma.member.update.mockResolvedValue({ id: 'm1', status: 'ACTIVE' });
    const res = await request(app)
      .post('/members/m1/payments')
      .send({ amount: 1000 });
    expect(res.status).toBe(201);
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'ACTIVE' }
    });
  });

  it('actualiza el estado a ACTIVE si estaba DEBTOR', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: 'DEBTOR' });
    prisma.member.update.mockResolvedValue({ id: 'm1', status: 'ACTIVE' });
    const res = await request(app)
      .post('/members/m1/payments')
      .send({ amount: 1000 });
    expect(res.status).toBe(201);
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'ACTIVE' }
    });
  });

  it('no actualiza el estado si ya era ACTIVE', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: 'ACTIVE' });
    const res = await request(app)
      .post('/members/m1/payments')
      .send({ amount: 1000 });
    expect(res.status).toBe(201);
    expect(prisma.member.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'ACTIVE' } }));
  });

  it('devuelve error si el miembro no existe', async () => {
    prisma.member.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/members/m1/payments')
      .send({ amount: 1000 });
    expect(res.status).toBe(400);
  });

  it('devuelve error si falla el pago', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'm1', status: 'INACTIVE' });
    prisma.paymentLog.create.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .post('/members/m1/payments')
      .send({ amount: 1000 });
    expect(res.status).toBe(400);
  });
});
