// Configuración de la ubicación del gimnasio
export const GYM_LOCATION = {
  // Coordenadas del gimnasio El Arca
  latitude: -34.76058070354081,  // Ajustar con coordenadas reales
  longitude: -58.345231758538894, // Ajustar con coordenadas reales
  // Radio permitido en metros (por ejemplo, 100 metros)
  radiusMeters: 100
};
/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param lat1 Latitud del punto 1
 * @param lon1 Longitud del punto 1
 * @param lat2 Latitud del punto 2
 * @param lon2 Longitud del punto 2
 * @returns Distancia en metros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

/**
 * Verifica si las coordenadas del usuario están dentro del radio permitido del gimnasio
 * @param userLat Latitud del usuario
 * @param userLon Longitud del usuario
 * @returns true si el usuario está dentro del radio, false si no
 */
export function isWithinGymRadius(userLat: number, userLon: number): boolean {
  const distance = calculateDistance(
    GYM_LOCATION.latitude,
    GYM_LOCATION.longitude,
    userLat,
    userLon
  );
  console.log(`[GEOLOCATION] Distancia al gimnasio: ${distance.toFixed(2)} metros`);
  return distance <= GYM_LOCATION.radiusMeters;
}

