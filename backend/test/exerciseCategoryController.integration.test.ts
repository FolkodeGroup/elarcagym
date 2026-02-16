import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import exerciseCategoryRoutes from '../src/routes/exerciseCategoryRoutes';

// Mock de auth middleware — no bloquea en tests
vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
  requirePermission: () => (req: any, res: any, next: any) => next(),
}));

describe('Integración: Exercise Categories CRUD', () => {
  let app: any;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      exerciseCategory: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      exerciseMaster: {
        count: vi.fn(),
      },
    };
    app = express();
    app.use(express.json());
    app.use('/exercise-categories', exerciseCategoryRoutes(prisma));
  });

  // ===== GET / =====
  describe('GET /', () => {
    it('devuelve todas las categorías ordenadas por nombre', async () => {
      const mockCategories = [
        { id: '1', name: 'ABDOMINALES' },
        { id: '2', name: 'PECHO' },
        { id: '3', name: 'PIERNAS' },
      ];
      prisma.exerciseCategory.findMany.mockResolvedValue(mockCategories);

      const res = await request(app).get('/exercise-categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockCategories);
      expect(prisma.exerciseCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('devuelve array vacío si no hay categorías', async () => {
      prisma.exerciseCategory.findMany.mockResolvedValue([]);

      const res = await request(app).get('/exercise-categories');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ===== GET /:id =====
  describe('GET /:id', () => {
    it('devuelve una categoría por ID', async () => {
      const cat = { id: 'cat-1', name: 'PECHO' };
      prisma.exerciseCategory.findUnique.mockResolvedValue(cat);

      const res = await request(app).get('/exercise-categories/cat-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(cat);
    });

    it('devuelve 404 si la categoría no existe', async () => {
      prisma.exerciseCategory.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/exercise-categories/no-existe');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No encontrada');
    });
  });

  // ===== POST / =====
  describe('POST /', () => {
    it('crea una categoría normalizando a mayúsculas', async () => {
      prisma.exerciseCategory.findFirst.mockResolvedValue(null);
      prisma.exerciseCategory.create.mockResolvedValue({ id: 'new-1', name: 'PIERNAS' });

      const res = await request(app)
        .post('/exercise-categories')
        .send({ name: 'piernas' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('PIERNAS');
      expect(prisma.exerciseCategory.create).toHaveBeenCalledWith({
        data: { name: 'PIERNAS' },
      });
    });

    it('rechaza nombre vacío', async () => {
      const res = await request(app)
        .post('/exercise-categories')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nombre requerido');
    });

    it('rechaza si falta el campo name', async () => {
      const res = await request(app)
        .post('/exercise-categories')
        .send({});

      expect(res.status).toBe(400);
    });

    it('rechaza duplicados (case-insensitive)', async () => {
      prisma.exerciseCategory.findFirst.mockResolvedValue({ id: 'existing', name: 'PECHO' });

      const res = await request(app)
        .post('/exercise-categories')
        .send({ name: 'Pecho' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Categoría ya existe');
    });

    it('maneja espacios en el nombre', async () => {
      prisma.exerciseCategory.findFirst.mockResolvedValue(null);
      prisma.exerciseCategory.create.mockResolvedValue({ id: 'new-2', name: 'TREN SUPERIOR' });

      const res = await request(app)
        .post('/exercise-categories')
        .send({ name: '  tren superior  ' });

      expect(res.status).toBe(201);
      expect(prisma.exerciseCategory.create).toHaveBeenCalledWith({
        data: { name: 'TREN SUPERIOR' },
      });
    });
  });

  // ===== PUT /:id =====
  describe('PUT /:id', () => {
    it('actualiza el nombre de una categoría', async () => {
      prisma.exerciseCategory.findFirst.mockResolvedValue(null);
      prisma.exerciseCategory.update.mockResolvedValue({ id: 'cat-1', name: 'ESPALDA ALTA' });

      const res = await request(app)
        .put('/exercise-categories/cat-1')
        .send({ name: 'espalda alta' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('ESPALDA ALTA');
    });

    it('rechaza nombre vacío', async () => {
      const res = await request(app)
        .put('/exercise-categories/cat-1')
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('rechaza si el nuevo nombre ya existe en otra categoría', async () => {
      prisma.exerciseCategory.findFirst.mockResolvedValue({ id: 'otro-id', name: 'PECHO' });

      const res = await request(app)
        .put('/exercise-categories/cat-1')
        .send({ name: 'pecho' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Categoría ya existe');
    });

    it('permite actualizar al mismo nombre (misma categoría)', async () => {
      prisma.exerciseCategory.findFirst.mockResolvedValue(null); // No encuentra otra con ese nombre
      prisma.exerciseCategory.update.mockResolvedValue({ id: 'cat-1', name: 'PECHO' });

      const res = await request(app)
        .put('/exercise-categories/cat-1')
        .send({ name: 'PECHO' });

      expect(res.status).toBe(200);
    });
  });

  // ===== DELETE /:id =====
  describe('DELETE /:id', () => {
    it('elimina una categoría sin ejercicios asociados', async () => {
      prisma.exerciseMaster.count.mockResolvedValue(0);
      prisma.exerciseCategory.delete.mockResolvedValue({ id: 'cat-1' });

      const res = await request(app).delete('/exercise-categories/cat-1');

      expect(res.status).toBe(204);
      expect(prisma.exerciseCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });

    it('rechaza eliminar categoría con ejercicios asociados', async () => {
      prisma.exerciseMaster.count.mockResolvedValue(3);

      const res = await request(app).delete('/exercise-categories/cat-1');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No se puede eliminar: categoría en uso');
    });
  });
});
