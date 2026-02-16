import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

// Utilidad para normalizar a mayúsculas
function normalizeCategoryName(name: string): string {
  return name.trim().toUpperCase();
}

export default function(prisma: PrismaClient) {
  return {
    /**
     * @swagger
     * /exercise-categories:
     *   get:
     *     summary: Obtener todas las categorías de ejercicios
     *     tags:
     *       - ExerciseCategory
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de categorías
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: string
     *                   name:
     *                     type: string
     */
    async getAll(req: Request, res: Response) {
      const categories = await prisma.exerciseCategory.findMany({ orderBy: { name: 'asc' } });
      res.json(categories);
    },

    /**
     * @swagger
     * /exercise-categories:
     *   post:
     *     summary: Crear nueva categoría de ejercicio
     *     tags:
     *       - ExerciseCategory
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *     responses:
     *       201:
     *         description: Categoría creada
     *       409:
     *         description: Categoría ya existe
     */
    async create(req: Request, res: Response) {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Nombre requerido' });
      }
      const normalized = normalizeCategoryName(name);
      // Validar unicidad (case-insensitive)
      const exists = await prisma.exerciseCategory.findFirst({
        where: { name: normalized }
      });
      if (exists) {
        return res.status(409).json({ error: 'Categoría ya existe' });
      }
      const category = await prisma.exerciseCategory.create({ data: { name: normalized } });
      res.status(201).json(category);
    },

    /**
     * @swagger
     * /exercise-categories/{id}:
     *   put:
     *     summary: Actualizar categoría de ejercicio
     *     tags:
     *       - ExerciseCategory
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *     responses:
     *       200:
     *         description: Categoría actualizada
     *       409:
     *         description: Categoría ya existe
     */
    async update(req: Request, res: Response) {
      const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : undefined;
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !id) {
        return res.status(400).json({ error: 'Nombre e ID requeridos' });
      }
      const normalized = normalizeCategoryName(name);
      // Validar unicidad (case-insensitive)
      const exists = await prisma.exerciseCategory.findFirst({
        where: {
          name: normalized,
          id: { not: id }
        }
      });
      if (exists) {
        return res.status(409).json({ error: 'Categoría ya existe' });
      }
      const updated = await prisma.exerciseCategory.update({
        where: { id },
        data: { name: normalized }
      });
      res.json(updated);
    },

    /**
     * @swagger
     * /exercise-categories/{id}:
     *   delete:
     *     summary: Eliminar categoría de ejercicio
     *     tags:
     *       - ExerciseCategory
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       204:
     *         description: Categoría eliminada
     *       400:
     *         description: "No se puede eliminar: categoría en uso"
     */
    async delete(req: Request, res: Response) {
      const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : undefined;
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }
      // Validar que no tenga ejercicios asociados
      const count = await prisma.exerciseMaster.count({ where: { categoryId: id } });
      if (count > 0) {
        return res.status(400).json({ error: 'No se puede eliminar: categoría en uso' });
      }
      await prisma.exerciseCategory.delete({ where: { id } });
      res.status(204).send();
    },

    /**
     * @swagger
     * /exercise-categories/{id}:
     *   get:
     *     summary: Obtener una categoría de ejercicio
     *     tags:
     *       - ExerciseCategory
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Categoría encontrada
     *       404:
     *         description: No encontrada
     */
    async getOne(req: Request, res: Response) {
      const id = typeof req.params.id === 'string' ? req.params.id : Array.isArray(req.params.id) ? req.params.id[0] : undefined;
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }
      const category = await prisma.exerciseCategory.findUnique({ where: { id } });
      if (!category) return res.status(404).json({ error: 'No encontrada' });
      res.json(category);
    }
  };
}
