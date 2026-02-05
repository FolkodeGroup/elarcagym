import { describe, it, expect } from 'vitest';
import { getCriticalErrorEmail, getSensitiveConfigChangeEmail, getNewMemberEmail, getRoleChangeEmail } from '../src/utils/notificationTemplates';

describe('getCriticalErrorEmail', () => {
  it('genera correctamente el email de error crítico', () => {
    const result = getCriticalErrorEmail({ error: 'Fallo grave', module: 'auth', datetime: '2026-02-05 10:00' });
    expect(result.subject).toMatch(/crítico/);
    expect(result.text).toContain('Fallo grave');
    expect(result.text).toContain('auth');
    expect(result.text).toContain('2026-02-05 10:00');
  });
});

describe('getSensitiveConfigChangeEmail', () => {
  it('genera correctamente el email de cambio sensible', () => {
    const result = getSensitiveConfigChangeEmail({ param: 'JWT_SECRET', oldValue: 'a', newValue: 'b', user: 'admin', datetime: '2026-02-05 10:00' });
    expect(result.subject).toMatch(/configuración sensible/);
    expect(result.text).toContain('JWT_SECRET');
    expect(result.text).toContain('admin');
    expect(result.text).toContain('2026-02-05 10:00');
  });
});

describe('getNewMemberEmail', () => {
  it('genera correctamente el email de nuevo socio', () => {
    const result = getNewMemberEmail({ name: 'Ana', email: 'ana@example.com', datetime: '2026-02-05' });
    expect(result.subject).toMatch(/Nuevo socio/);
    expect(result.text).toContain('Ana');
    expect(result.text).toContain('ana@example.com');
    expect(result.text).toContain('2026-02-05');
  });
});

describe('getRoleChangeEmail', () => {
  it('genera correctamente el email de cambio de rol', () => {
    const result = getRoleChangeEmail({ affectedUser: 'Ana', oldRole: 'USER', newRole: 'ADMIN', changedBy: 'admin', datetime: '2026-02-05' });
    expect(result.subject).toMatch(/Cambio de rol/);
    expect(result.text).toContain('Ana');
    expect(result.text).toContain('USER');
    expect(result.text).toContain('ADMIN');
    expect(result.text).toContain('admin');
    expect(result.text).toContain('2026-02-05');
  });
});
