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

/**
 * Calcula la próxima fecha de cobro basada en la fecha de ingreso del socio.
 * La fecha de cobro es el mismo día del mes de ingreso, cada mes.
 * Si ya pagó el período actual, muestra la fecha del próximo mes.
 * Retorna null si no hay joinDate.
 */
export function getNextPaymentDate(member: Member): Date | null {
  if (!member.joinDate) return null;

  const joinDate = new Date(member.joinDate);
  const joinDay = joinDate.getDate();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Fecha de cobro del mes actual (mismo día que ingresó)
  let nextPayment = new Date(currentYear, currentMonth, joinDay);

  // Ajustar si el día de ingreso excede los días del mes actual
  if (nextPayment.getMonth() !== currentMonth) {
    // El mes actual no tiene suficientes días: usar el último día del mes
    nextPayment = new Date(currentYear, currentMonth + 1, 0);
  }

  // Si hoy ya pasó la fecha de cobro Y ya pagó este período, avanzar al mes siguiente
  const hasPaidCurrentPeriod = member.payments?.some((p: { date: string }) => {
    const pd = new Date(p.date);
    return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
  });

  if (today > nextPayment || hasPaidCurrentPeriod) {
    nextPayment = new Date(currentYear, currentMonth + 1, joinDay);
    // Ajustar si el día excede los días del mes siguiente
    if (nextPayment.getDate() !== joinDay) {
      nextPayment = new Date(currentYear, currentMonth + 2, 0);
    }
  }

  return nextPayment;
}

/**
 * Calcula la fecha límite de pago (fecha de cobro + 5 días).
 */
export function getPaymentDeadline(member: Member): Date | null {
  const nextPayment = getNextPaymentDate(member);
  if (!nextPayment) return null;
  const deadline = new Date(nextPayment);
  deadline.setDate(deadline.getDate() + 5);
  return deadline;
}

/**
 * Formatea una fecha para mostrar en formato DD/MM/YYYY.
 */
export function formatPaymentDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
