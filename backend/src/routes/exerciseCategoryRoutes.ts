import { Router } from 'express';
import { prisma } from '../prismaClient';
import exerciseCategoryController from '../controllers/exerciseCategoryController';
import { requireAdmin } from '../middleware/auth';

const controller = exerciseCategoryController(prisma);
const router = Router();

router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', requireAdmin, controller.create);
router.put('/:id', requireAdmin, controller.update);
router.delete('/:id', requireAdmin, controller.delete);

export default router;
