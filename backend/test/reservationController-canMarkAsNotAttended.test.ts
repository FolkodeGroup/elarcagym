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

  it('permite marcar dentro de las 24 horas', () => {
    // 23 horas después del turno
    const now = new Date('2026-02-06T09:00:00-03:00');
    const result = canMarkAsNotAttended(baseSlot, now);
    expect(result.allowed).toBe(true);
  });

  it('no permite marcar si pasaron más de 24 horas', () => {
    // 24 horas y 1 minuto después del turno
    const now = new Date('2026-02-06T10:01:00-03:00');
    const result = canMarkAsNotAttended(baseSlot, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/m[aá]s de 24 horas/);
  });
});
