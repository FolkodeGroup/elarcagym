import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import exerciseCategoryController from '../controllers/exerciseCategoryController';
import { requireAdmin } from '../middleware/auth';

export default function exerciseCategoryRoutes(prisma: PrismaClient) {
  const controller = exerciseCategoryController(prisma);
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:id', controller.getOne);
  router.post('/', requireAdmin, controller.create);
  router.put('/:id', requireAdmin, controller.update);
  router.delete('/:id', requireAdmin, controller.delete);

  return router;
}
