import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export default function(prisma: any) {
  const router = Router();

  // Registro de usuario (miembro)
  router.post('/register', async (req, res) => {
    try {
      const { email, password, ...rest } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
      const existing = await prisma.member.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'El email ya está registrado' });
      const hashedPassword = await bcrypt.hash(password, 10);
      const member = await prisma.member.create({ data: { email, password: hashedPassword, ...rest } });
      res.status(201).json({ id: member.id, email: member.email });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Login de usuario (miembro)
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
      const member = await prisma.member.findUnique({ where: { email } });
      if (!member) return res.status(401).json({ error: 'Credenciales inválidas' });
      const valid = await bcrypt.compare(password, member.password);
      if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
      const token = jwt.sign({ id: member.id, email: member.email }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
