import { describe, it, expect } from 'vitest';

// Ejemplo de función de lógica de negocio: verifica si la membresía está activa
type Member = {
  status: 'ACTIVE' | 'INACTIVE' | 'DEBTOR';
  membershipExpiration: Date;
};

function isMembershipActive(member: Member, now: Date = new Date()): boolean {
  return member.status === 'ACTIVE' && member.membershipExpiration > now;
}

describe('isMembershipActive', () => {
  it('devuelve true si el miembro está activo y la membresía no ha vencido', () => {
    const member: Member = {
      status: 'ACTIVE',
      membershipExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24), // mañana
    };
    expect(isMembershipActive(member, new Date())).toBe(true);
  });

  it('devuelve false si el miembro está inactivo aunque la membresía no haya vencido', () => {
    const member: Member = {
      status: 'INACTIVE',
      membershipExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24),
    };
    expect(isMembershipActive(member, new Date())).toBe(false);
  });

  it('devuelve false si la membresía ya venció', () => {
    const member: Member = {
      status: 'ACTIVE',
      membershipExpiration: new Date(Date.now() - 1000 * 60 * 60), // hace 1 hora
    };
    expect(isMembershipActive(member, new Date())).toBe(false);
  });

  it('devuelve false si el miembro es deudor', () => {
    const member: Member = {
      status: 'DEBTOR',
      membershipExpiration: new Date(Date.now() + 1000 * 60 * 60 * 24),
    };
    expect(isMembershipActive(member, new Date())).toBe(false);
  });
});
