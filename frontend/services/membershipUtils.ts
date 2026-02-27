import { Member, UserStatus } from '../types';

/**
 * Calcula la fecha de cobro del CICLO ACTUAL.
 *
 * Regla:
 * - El día de cobro mensual es el mismo día en que ingresó el socio (joinDay).
 * - Si hoy ya pasó el día de cobro de ESTE mes → el ciclo activo es el de este mes.
 * - Si hoy NO llegó al día de cobro de este mes → el ciclo activo es el del mes pasado.
 *
 * Esto garantiza que siempre hay un "ciclo activo" al que se le verifica el pago.
 */
function getCurrentCycleBillingDate(member: Member): Date {
  if (!member.joinDate) return new Date();
  const joinDay = new Date(member.joinDate).getDate();
  const today = new Date();

  // Fecha de cobro del mes en curso
  let billingDate = new Date(today.getFullYear(), today.getMonth(), joinDay);

  // Si joinDay excede los días del mes actual, usar el último día del mes
  if (billingDate.getMonth() !== today.getMonth()) {
    billingDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  // Si hoy todavía no llegó al día de cobro de este mes, el ciclo activo es el del mes pasado
  if (today < billingDate) {
    let prevBilling = new Date(today.getFullYear(), today.getMonth() - 1, joinDay);
    // Ajuste si joinDay excede los días del mes anterior
    if (prevBilling.getMonth() !== (today.getMonth() - 1 + 12) % 12) {
      prevBilling = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    billingDate = prevBilling;
  }

  return billingDate;
}

/**
 * Verifica si el miembro está al día: pagó en el ciclo de cobro actual.
 *
 * Un socio con joinDate posterior al ciclo actual NO está "al día" todavía
 * (su primer ciclo aún no comenzó), pero tampoco es moroso.
 */
export function isCurrentOnPayment(member: Member): boolean {
  if (member.status !== UserStatus.ACTIVE) return false;

  const currentBillingDate = getCurrentCycleBillingDate(member);
  const joinDate = new Date(member.joinDate);

  // Si el socio ingresó DESPUÉS de la fecha de cobro del ciclo actual,
  // su primer ciclo empieza en el futuro → no ha "pagado" este ciclo (pendiente)
  if (joinDate > currentBillingDate) return false;

  // Verificar si hay algún pago desde la fecha de cobro del ciclo actual
  if (!member.payments || member.payments.length === 0) return false;
  return member.payments.some(p => new Date(p.date) >= currentBillingDate);
}

/**
 * Verifica si el miembro es MOROSO.
 *
 * Un socio es moroso SOLO cuando:
 * 1. Su joinDate es anterior o igual a la fecha de cobro del ciclo actual (ya debería haber pagado).
 * 2. Ya pasó el límite (fecha de cobro + 5 días de gracia).
 * 3. No tiene ningún pago registrado desde la fecha de cobro del ciclo actual.
 *
 * Esto reemplaza la antigua lógica del "día 10 del mes".
 */
export function isDebtorByPayment(member: Member): boolean {
  // Inactivos nunca son morosos
  if (member.status !== UserStatus.ACTIVE) return false;

  const currentBillingDate = getCurrentCycleBillingDate(member);
  const joinDate = new Date(member.joinDate);

  // Si el socio ingresó DESPUÉS del ciclo actual, aún no está obligado a pagar este ciclo
  if (joinDate > currentBillingDate) return false;

  // Calcular fecha límite (billing date + 5 días de gracia)
  const deadline = new Date(currentBillingDate);
  deadline.setDate(deadline.getDate() + 5);

  const today = new Date();

  // Si todavía no venció el plazo, no es moroso (está "pendiente")
  if (today <= deadline) return false;

  // Plazo vencido: verificar si pagó en este ciclo
  if (!member.payments || member.payments.length === 0) return true;
  const hasPaid = member.payments.some(p => new Date(p.date) >= currentBillingDate);
  return !hasPaid;
}

/**
 * Verifica si el pago está "próximo a vencer":
 * - El día de cobro se acerca en los próximos 5 días, ó
 * - Ya llegó el día de cobro y estamos dentro del período de gracia (aún no pagó).
 */
export function isPaymentDueSoon(member: Member): boolean {
  if (member.status !== UserStatus.ACTIVE) return false;

  const today = new Date();
  const currentBillingDate = getCurrentCycleBillingDate(member);
  const joinDate = new Date(member.joinDate);

  // Socio nuevo: su primer cobro es su joinDate
  if (joinDate > currentBillingDate) {
    const daysUntilFirst = (joinDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilFirst >= 0 && daysUntilFirst <= 5;
  }

  const deadline = new Date(currentBillingDate);
  deadline.setDate(deadline.getDate() + 5);

  const hasPaid = member.payments?.some(p => new Date(p.date) >= currentBillingDate);

  // Si ya pagó este ciclo: verificar si el PRÓXIMO cobro se acerca
  if (hasPaid) {
    const nextBilling = new Date(
      currentBillingDate.getFullYear(),
      currentBillingDate.getMonth() + 1,
      new Date(member.joinDate).getDate()
    );
    const daysUntilNext = (nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilNext >= 0 && daysUntilNext <= 5;
  }

  // Si no pagó y estamos dentro del período de gracia (billing date llegó pero plazo no vencido)
  if (today >= currentBillingDate && today <= deadline) return true;

  return false;
}

/**
 * Calcula la próxima fecha de cobro para MOSTRAR en la UI.
 *
 * - Si el socio ingresó después del ciclo actual: su primera fecha de cobro = su joinDate.
 * - Si ya pagó el ciclo actual: muestra el cobro del mes siguiente.
 * - Si no pagó: muestra la fecha de cobro del ciclo actual (pendiente o vencida).
 */
export function getNextPaymentDate(member: Member): Date | null {
  if (!member.joinDate) return null;

  const joinDate = new Date(member.joinDate);
  const joinDay = joinDate.getDate();
  const currentBillingDate = getCurrentCycleBillingDate(member);

  // Socio nuevo: su primer ciclo de cobro aún no llegó
  if (joinDate > currentBillingDate) {
    return joinDate;
  }

  // Verificar si pagó en el ciclo actual
  const hasPaidCurrentCycle = member.payments?.some(p => new Date(p.date) >= currentBillingDate);

  if (hasPaidCurrentCycle) {
    // Pagó: próximo cobro = mes siguiente
    let next = new Date(
      currentBillingDate.getFullYear(),
      currentBillingDate.getMonth() + 1,
      joinDay
    );
    // Ajuste si joinDay excede los días del mes siguiente
    if (next.getDate() !== joinDay) {
      next = new Date(currentBillingDate.getFullYear(), currentBillingDate.getMonth() + 2, 0);
    }
    return next;
  }

  // No pagó: mostrar la fecha de cobro del ciclo actual (pendiente/vencida)
  return currentBillingDate;
}

/**
 * Calcula la fecha límite de pago (fecha de cobro + 5 días de gracia).
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
