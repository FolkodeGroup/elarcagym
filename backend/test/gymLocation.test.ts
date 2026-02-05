import { describe, it, expect } from 'vitest';
import { calculateDistance, isWithinGymRadius, GYM_LOCATION } from '../src/config/gymLocation';

describe('calculateDistance', () => {
  it('devuelve 0 si las coordenadas son iguales', () => {
    const d = calculateDistance(-34.76, -58.34, -34.76, -58.34);
    expect(d).toBeCloseTo(0, 2);
  });

  it('devuelve una distancia positiva para puntos distintos', () => {
    const d = calculateDistance(-34.76, -58.34, -34.761, -58.341);
    expect(d).toBeGreaterThan(0);
  });
});

describe('isWithinGymRadius', () => {
  it('devuelve true si el usuario está dentro del radio', () => {
    const lat = GYM_LOCATION.latitude + 0.0001;
    const lon = GYM_LOCATION.longitude + 0.0001;
    expect(isWithinGymRadius(lat, lon)).toBe(true);
  });

  it('devuelve false si el usuario está fuera del radio', () => {
    // ~200 metros fuera
    const lat = GYM_LOCATION.latitude + 0.002;
    const lon = GYM_LOCATION.longitude + 0.002;
    expect(isWithinGymRadius(lat, lon)).toBe(false);
  });
});
