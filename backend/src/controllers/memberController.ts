import { Router } from 'express';

export default function(prisma: any) {
  const router = Router();

  // Obtener todos los miembros
  router.get('/', async (req, res) => {
    const members = await prisma.member.findMany();
    res.json(members);
  });

  // Obtener un miembro por ID
  router.get('/:id', async (req, res) => {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  });

  // Crear un nuevo miembro
  router.post('/', async (req, res) => {
    try {
      const member = await prisma.member.create({ data: req.body });
      res.status(201).json(member);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Actualizar un miembro
  router.put('/:id', async (req, res) => {
    try {
      const member = await prisma.member.update({ where: { id: req.params.id }, data: req.body });
      res.json(member);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  // Eliminar un miembro
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.member.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return router;
}
