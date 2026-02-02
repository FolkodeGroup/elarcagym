import { Member, UserStatus } from '../types';

// Verifica si el miembro está al día en el pago
export function isCurrentOnPayment(member: Member): boolean {
  if (member.status !== UserStatus.ACTIVE) return false;
  
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Antes del 11, todos los activos están "al día" temporalmente (período de pago: 1-10)
  if (currentDay <= 10) {
    return true;
  }
  
  // Después del 10, verificar si hay pago en el mes actual
  if (!member.payments || member.payments.length === 0) return false;
  
  const paymentsThisMonth = member.payments.filter(p => {
    const pd = new Date(p.date);
    return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
  });
  
  return paymentsThisMonth.length > 0;
}

// Verifica si el miembro es moroso según la lógica de pagos
export function isDebtorByPayment(member: Member): boolean {
  // Los inactivos nunca son morosos
  if (member.status !== UserStatus.ACTIVE) return false;
  
  const today = new Date();
  const currentDay = today.getDate();
  // Antes del 11, ningún socio puede ser moroso, sin importar pagos o fecha de creación
  if (currentDay <= 10) {
    return false;
  }
  // Después del 10, aplicar lógica de pagos
  if (!member.payments || member.payments.length === 0) return true;
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const paymentsThisMonth = member.payments.filter(p => {
    const pd = new Date(p.date);
    return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
  });
  if (paymentsThisMonth.length > 0) {
    return false;
  }
  return true;
}

// Verifica si el pago está próximo a vencer (ejemplo: faltan menos de 5 días para los 30 días desde el último pago)
export function isPaymentDueSoon(member: Member): boolean {
  if (!member.payments || member.payments.length === 0) return false;
  const today = new Date();
  const paymentDates = member.payments.map(p => new Date(p.date));
  const lastPaymentDate = paymentDates.reduce((a, b) => (a > b ? a : b));
  const daysSinceLast = (today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLast >= 25 && daysSinceLast < 30;
}
