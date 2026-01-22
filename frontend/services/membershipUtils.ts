import { Member, UserStatus } from '../types';

// Verifica si el miembro está al día en el pago
export function isCurrentOnPayment(member: Member): boolean {
  if (member.status !== UserStatus.ACTIVE) return false;
  if (!member.payments || member.payments.length === 0) return false;
  const today = new Date();
  return member.payments.some(p => {
    const pd = new Date(p.date);
    const days = (today.getTime() - pd.getTime()) / (1000 * 60 * 60 * 24);
    return days < 30;
  });
}

// Verifica si el miembro es moroso según la lógica de pagos
export function isDebtorByPayment(member: Member): boolean {
  if (!member.payments || member.payments.length === 0) return true;
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const paymentsThisMonth = member.payments.filter(p => {
    const pd = new Date(p.date);
    return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
  });
  if (paymentsThisMonth.length > 0) {
    return false;
  }
  const paymentDates = member.payments.map(p => new Date(p.date));
  const lastPaymentDate = paymentDates.reduce((a, b) => (a > b ? a : b));
  if (
    lastPaymentDate.getFullYear() === currentYear &&
    lastPaymentDate.getMonth() === currentMonth &&
    lastPaymentDate.getDate() >= 1 &&
    lastPaymentDate.getDate() <= 10
  ) {
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
