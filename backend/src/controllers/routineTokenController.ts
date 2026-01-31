import { Router } from 'express';
import { generateRoutineToken } from '../utils/routineToken.js';

const router = Router();

// Endpoint para generar token temporal para rutina
router.post('/generate-routine-token', async (req, res) => {
  try {
    const { memberId, slotId, expiresIn } = req.body;
    if (!memberId || !slotId) {
      return res.status(400).json({ error: 'memberId y slotId requeridos' });
    }
    // expiresIn puede ser '5m', '10m', etc. (por defecto 5 minutos)
    const token = generateRoutineToken({ memberId, slotId }, expiresIn || '5m');
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
