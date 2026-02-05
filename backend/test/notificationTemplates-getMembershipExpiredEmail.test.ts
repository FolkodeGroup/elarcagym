import { describe, it, expect } from 'vitest';
import { getMembershipExpiredEmail } from '../src/utils/notificationTemplates';

describe('getMembershipExpiredEmail', () => {
  it('genera correctamente el asunto y texto para membresía vencida', () => {
    const input = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      expiredAt: '2026-02-05',
    };
    const result = getMembershipExpiredEmail(input);
    expect(result.subject).toBe('⏰ Socio con membresía vencida');
    expect(result.text).toContain('Juan Pérez');
    expect(result.text).toContain('juan@example.com');
    expect(result.text).toContain('2026-02-05');
    expect(result.text).toMatch(/membresía vencida/);
  });
});
