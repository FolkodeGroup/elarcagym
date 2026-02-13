/**
 * Utilidades para manejar horarios habituales y generar reservas virtuales
 */

// Mapeo de días de semana (español -> número de día)
const DAY_MAP: Record<string, number> = {
  'domingo': 0,
  'lunes': 1,
  'martes': 2,
  'miercoles': 3,
  'miércoles': 3,
  'jueves': 4,
  'viernes': 5,
  'sabado': 6,
  'sábado': 6
};

// Mapeo inverso: número -> nombre en español
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Obtiene el nombre del día de la semana en español
 */
export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()] || 'domingo';
}

/**
 * Verifica si un socio tiene horario habitual para un día específico
 */
export function hasHabitualScheduleForDay(
  member: any, 
  dayName: string
): boolean {
  if (!member.habitualSchedules || member.habitualSchedules.length === 0) {
    return false;
  }
  
  return member.habitualSchedules.some((schedule: any) => 
    schedule.day.toLowerCase() === dayName.toLowerCase()
  );
}

/**
 * Obtiene los horarios habituales de un socio para un día específico
 */
export function getHabitualSchedulesForDay(
  member: any,
  dayName: string
): Array<{ day: string; start: string; end: string }> {
  if (!member.habitualSchedules || member.habitualSchedules.length === 0) {
    return [];
  }
  
  return member.habitualSchedules.filter((schedule: any) => 
    schedule.day.toLowerCase() === dayName.toLowerCase()
  );
}

/**
 * Verifica si una fecha tiene una excepción de horario para un socio
 */
export function hasScheduleException(
  member: any,
  date: string
): boolean {
  if (!member.scheduleExceptions || member.scheduleExceptions.length === 0) {
    return false;
  }
  
  return member.scheduleExceptions.some((exception: any) => {
    const exceptionDate = typeof exception.date === 'string' 
      ? exception.date.split('T')[0] 
      : new Date(exception.date).toISOString().split('T')[0];
    return exceptionDate === date;
  });
}

/**
 * Genera reservas virtuales basadas en horarios habituales para una fecha específica
 * 
 * @param members Lista de socios con sus horarios habituales
 * @param date Fecha en formato YYYY-MM-DD
 * @param existingReservations Reservas manuales existentes para evitar duplicados
 * @returns Array de reservas virtuales
 */
export function generateVirtualReservations(
  members: any[],
  date: string,
  existingReservations: any[] = []
): Array<{
  id: string;
  memberId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  time: string;
  start: string;
  end: string;
  isVirtual: true;
  source: 'habitual';
  attended?: boolean;
}> {
  const virtualReservations: any[] = [];
  const dateObj = new Date(date + 'T00:00:00');
  const dayName = getDayName(dateObj);
  
  // Crear un Set con los IDs de socios que ya tienen reserva manual para este día
  const existingReservationsByMember = new Set(
    existingReservations
      .filter(r => r.memberId)
      .map(r => r.memberId)
  );
  
  for (const member of members) {
    // Solo procesar socios activos
    if (member.status !== 'ACTIVE') {
      continue;
    }
    
    // Verificar si hay una excepción de horario para esta fecha
    if (hasScheduleException(member, date)) {
      continue;
    }
    
    // Verificar si el socio ya tiene una reserva manual para este día
    if (existingReservationsByMember.has(member.id)) {
      continue;
    }
    
    // Obtener horarios habituales para este día
    const schedules = getHabitualSchedulesForDay(member, dayName);
    
    for (const schedule of schedules) {
      virtualReservations.push({
        id: `virtual-${member.id}-${date}-${schedule.start}`,
        memberId: member.id,
        clientName: `${member.firstName} ${member.lastName}`,
        clientPhone: member.phone || null,
        clientEmail: member.email || null,
        time: schedule.start,
        start: schedule.start,
        end: schedule.end,
        isVirtual: true,
        source: 'habitual',
        attended: null,
        member: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email,
          photoUrl: member.photoUrl
        }
      });
    }
  }
  
  return virtualReservations;
}

/**
 * Combina reservas manuales con reservas virtuales generadas desde horarios habituales
 * 
 * @param manualReservations Reservas manuales existentes
 * @param members Lista de socios con horarios habituales
 * @param date Fecha para generar reservas virtuales (YYYY-MM-DD)
 * @returns Array combinado de reservas manuales y virtuales
 */
export function combineReservationsWithHabitual(
  manualReservations: any[],
  members: any[],
  date: string
): any[] {
  const virtualReservations = generateVirtualReservations(
    members,
    date,
    manualReservations
  );
  
  return [...manualReservations, ...virtualReservations];
}
