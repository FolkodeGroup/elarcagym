/**
 * Utilidades para manejo de fechas en la zona horaria del gimnasio (Buenos Aires, Argentina)
 */

/**
 * Devuelve una fecha en formato YYYY-MM-DD ajustada a la zona horaria de Buenos Aires.
 * Útil para comparar con inputs de tipo date y para filtros de "hoy".
 */
export const getLocalISODate = (dateInput: string | Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(dateInput));
  } catch (e) {
    // Fallback básico en caso de error con Intl o Timezone
    const d = new Date(dateInput);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

/**
 * Formatea una fecha para visualización en Argentina (DD/MM/YYYY HH:mm).
 */
export const formatDisplayDate = (dateInput: string | Date): string => {
  return new Date(dateInput).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};


/**
 * Devuelve la fecha en formato YYYY-MM-DD desde un objeto Date (zona local Buenos Aires)
 */
export function getLocalDateString(date: Date): string {
  return getLocalISODate(date);
}
