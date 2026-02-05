import { describe, it, expect, vi } from 'vitest';
import { sendNotification } from '../src/utils/notificationService';

describe('sendNotification', () => {
  it('lanza error si Prisma no está inicializado', async () => {
    await expect(sendNotification({
      userId: '1',
      title: 'Test',
      message: 'Mensaje',
    })).rejects.toThrow('Prisma instance not initialized');
  });
});
