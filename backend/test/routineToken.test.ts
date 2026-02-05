import { describe, it, expect } from 'vitest';
import { generateRoutineToken, verifyRoutineToken } from '../src/utils/routineToken';

describe('generateRoutineToken y verifyRoutineToken', () => {
  it('genera y verifica un token válido', () => {
    const payload = { memberId: 'abc123', slotId: 42 };
    const token = generateRoutineToken(payload, '1h');
    const decoded = verifyRoutineToken(token) as any;
    expect(decoded.memberId).toBe('abc123');
    expect(decoded.slotId).toBe(42);
  });

  it('devuelve null para un token inválido', () => {
    expect(verifyRoutineToken('token_invalido')).toBeNull();
  });
});
