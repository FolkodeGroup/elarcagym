import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlistController.js';

const router = Router();

router.post('/', WaitlistController.create);
router.get('/', WaitlistController.list);
router.put('/:id', WaitlistController.update);
router.delete('/:id', WaitlistController.remove);
router.post('/:id/convert', WaitlistController.convertToMember);

export default router;
