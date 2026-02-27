import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlistController.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.post('/', requirePermission('members.create'), WaitlistController.create);
router.get('/', requirePermission('members.view'), WaitlistController.list);
router.put('/:id', requirePermission('members.edit'), WaitlistController.update);
router.delete('/:id', requirePermission('members.delete'), WaitlistController.remove);
router.post('/:id/convert', requirePermission('members.create'), WaitlistController.convertToMember);

export default router;
