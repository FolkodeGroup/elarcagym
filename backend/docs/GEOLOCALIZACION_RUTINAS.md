# Geolocalización y Control de Tiempo de Acceso a Rutinas

## Cambios Implementados

### 1. Corrección del Tiempo de Acceso (Bug Fix)
- **Archivo modificado**: `backend/src/controllers/routineAccessController.ts`
- **Cambio**: Se corrigió la ventana de tiempo de acceso de 90 minutos a **2 horas** (120 minutos)
- **Comportamiento**: El socio puede acceder a su rutina durante 2 horas desde el primer acceso del día

### 2. Validación de Geolocalización
Se implementó la restricción por cercanía física al gimnasio.

#### Backend
- **Nuevo archivo**: `backend/src/config/gymLocation.ts`
  - Contiene las coordenadas del gimnasio
  - Función para calcular distancia usando fórmula de Haversine
  - Función para validar si el usuario está dentro del radio permitido

- **Modificado**: `backend/src/controllers/routineAccessController.ts`
  - El endpoint `/routine-access/selfservice` ahora requiere `latitude` y `longitude`
  - Valida la ubicación antes de permitir acceso a la rutina
  - Retorna errores específicos si el usuario está fuera del área

#### Frontend
- **Modificado**: `frontend/services/api.ts`
  - `validateRoutineAccessByDni` ahora acepta coordenadas opcionales

- **Modificado**: `frontend/pages/RoutineSelfService.tsx`
  - Solicita permiso de geolocalización al usuario
  - Muestra indicador visual mientras se obtiene la ubicación
  - Envía las coordenadas al backend para validación
  - Maneja errores de geolocalización (permiso denegado, no disponible, etc.)

## Configuración

### Actualizar Coordenadas del Gimnasio

Editar el archivo `backend/src/config/gymLocation.ts`:

```typescript
export const GYM_LOCATION = {
  latitude: -34.6037,  // Reemplazar con latitud real del gimnasio
  longitude: -58.3816, // Reemplazar con longitud real del gimnasio
  radiusMeters: 100    // Ajustar el radio permitido en metros
};
```

### Obtener Coordenadas del Gimnasio

1. Visitar [Google Maps](https://www.google.com/maps)
2. Buscar la dirección del gimnasio
3. Click derecho en la ubicación exacta
4. Seleccionar las coordenadas que aparecen (formato: latitud, longitud)
5. Actualizar el archivo de configuración

### Radio Permitido

El radio está configurado en **100 metros** por defecto. Esto significa que el usuario debe estar dentro de 100 metros del gimnasio para acceder a su rutina.

Ajustar según necesidades:
- **50 metros**: Muy restrictivo, solo dentro del edificio
- **100 metros**: Recomendado, permite estar cerca del gimnasio
- **200 metros**: Más permisivo, incluye área circundante

## Flujo de Uso

1. El socio ingresa su DNI en la página de autoconsulta
2. El navegador solicita permiso para acceder a la ubicación
3. Si el usuario concede permiso:
   - Se obtienen las coordenadas GPS
   - Se envían al backend junto con el DNI
   - El backend valida la distancia al gimnasio
   - Si está dentro del radio: muestra la rutina
   - Si está fuera: muestra mensaje de restricción
4. Si el usuario rechaza el permiso:
   - Se muestra un mensaje indicando que se requiere la ubicación

## Mensajes de Error

- **"Debes permitir el acceso a tu ubicación para ver tu rutina"**: El usuario rechazó el permiso de geolocalización
- **"Tu ubicación no está disponible en este momento"**: El GPS no pudo determinar la ubicación
- **"Debes estar en el gimnasio para acceder a tu rutina"**: El usuario está fuera del radio permitido
- **"El acceso ha expirado o no tienes turno activo"**: Han pasado más de 2 horas desde el primer acceso

## Consideraciones de Seguridad

1. **HTTPS Requerido**: La API de geolocalización del navegador requiere que la aplicación esté servida mediante HTTPS (excepto en localhost para desarrollo)

2. **Privacidad**: Las coordenadas del usuario solo se envían al backend para validación y no se almacenan

3. **Precisión**: La precisión de GPS puede variar según:
   - Disponibilidad de señal GPS
   - Si el usuario está en interior o exterior
   - Tipo de dispositivo
   - Configuración del navegador

## Testing

### Desarrollo Local
Para pruebas en desarrollo, se puede:
1. Usar un dispositivo móvil real
2. Usar herramientas de simulación de ubicación del navegador:
   - Chrome DevTools → Sensores → Location
   - Firefox Developer Tools → Responsive Design Mode

### Producción
Asegurarse de que:
1. El sitio está servido mediante HTTPS
2. Las coordenadas del gimnasio están correctamente configuradas
3. El radio es apropiado para el entorno

## Compilación

Después de modificar `backend/src/config/gymLocation.ts`, compilar el backend:

```bash
cd backend
npm run build
```

O reiniciar el servidor de desarrollo:

```bash
cd backend
npm run dev
```
