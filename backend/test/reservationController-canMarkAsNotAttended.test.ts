import { describe, it, expect } from 'vitest';
import { canMarkAsNotAttended } from '../src/controllers/reservationController';

describe('canMarkAsNotAttended', () => {
  // Usar fechas ISO completas para asegurar la zona horaria
  const baseSlot = { date: '2026-02-05T10:00:00-03:00', time: '10:00' };

  it('no permite marcar si el turno aún no comenzó', () => {
    // 1 hora antes del turno
    const now = new Date('2026-02-05T09:00:00-03:00');
    const result = canMarkAsNotAttended(baseSlot, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/no ha comenzado/);
  });

  it('permite marcar dentro de las 2 horas', () => {
    // 1 hora después del turno
    const now = new Date('2026-02-05T11:00:00-03:00');
    const result = canMarkAsNotAttended(baseSlot, now);
    expect(result.allowed).toBe(true);
  });

  it('no permite marcar si pasaron más de 2 horas', () => {
    // 2 horas y 1 minuto después del turno
    const now = new Date('2026-02-05T12:01:00-03:00');
    const result = canMarkAsNotAttended(baseSlot, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/m[aá]s de 2 horas/);
  });
});
