import { WaitlistService } from '../services/waitlistService';
import { Request, Response } from 'express';

export const WaitlistController = {
  async create(req: Request, res: Response) {
    try {
      const waitlist = await WaitlistService.create(req.body);
      res.status(201).json(waitlist);
    } catch (error) {
      console.error('Error en WaitlistController.create:', error);
      res.status(500).json({ error: 'Error al crear registro en lista de espera', details: error });
    }
  },
  async list(req: Request, res: Response) {
    try {
      const waitlist = await WaitlistService.list();
      // Siempre devolver un array
      res.json(Array.isArray(waitlist) ? waitlist : []);
    } catch (error) {
      res.json([]); // En caso de error, devolver array vacío
    }
  },
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const idString = Array.isArray(id) ? id[0] : id;
      if (!idString) {
        res.status(400).json({ error: 'ID is required' });
        return;
      }
      const waitlist = await WaitlistService.update(idString, req.body);
      res.json(waitlist);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar registro', details: error });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const idString = Array.isArray(id) ? id[0] : id;
      if (!idString) {
        res.status(400).json({ error: 'ID is required' });
        return;
      }
      await WaitlistService.remove(idString);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar registro', details: error });
    }
  },
  async convertToMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const idString = Array.isArray(id) ? id[0] : id;
      if (!idString) {
        res.status(400).json({ error: 'ID is required' });
        return;
      }
      const member = await WaitlistService.convertToMember(idString);
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: 'Error al convertir en socio', details: error });
    }
  }
};
