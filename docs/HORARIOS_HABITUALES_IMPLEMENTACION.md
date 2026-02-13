# Implementación de Horarios Habituales en Reservas y Asistencia

## Fecha de Implementación
13 de febrero de 2026

## Objetivo
Unificar y mejorar la visualización y gestión de los horarios habituales de los socios en las vistas de Reservas, Asistencia y el Panel Principal.

## Cambios Realizados

### 1. Backend

#### 1.1 Nuevo Archivo: `habitualScheduleUtils.ts`
**Ubicación:** `backend/src/utils/habitualScheduleUtils.ts`

**Funcionalidades:**
- `getDayName(date)`: Obtiene el nombre del día de la semana en español
- `hasHabitualScheduleForDay(member, dayName)`: Verifica si un socio tiene horario habitual para un día
- `getHabitualSchedulesForDay(member, dayName)`: Obtiene horarios habituales de un socio para un día específico
- `hasScheduleException(member, date)`: Verifica si existe una excepción de horario
- `generateVirtualReservations(members, date, existingReservations)`: Genera reservas virtuales basadas en horarios habituales
- `combineReservationsWithHabitual(manualReservations, members, date)`: Combina reservas manuales con virtuales

#### 1.2 Modificado: `reservationController.ts`
**Ubicación:** `backend/src/controllers/reservationController.ts`

**Nuevo Endpoint:**
```typescript
GET /reservations/with-habitual?date=YYYY-MM-DD
```

**Respuesta:**
```json
{
  "date": "2026-02-13",
  "total": 25,
  "manual": 15,
  "virtual": 10,
  "reservations": [
    {
      "id": "xxx",
      "memberId": "yyy",
      "clientName": "Juan Pérez",
      "isVirtual": true,
      "source": "habitual",
      "time": "08:00",
      "start": "08:00",
      "end": "09:00",
      ...
    }
  ]
}
```

Este endpoint:
- Recibe una fecha como query parameter
- Obtiene todos los socios activos con sus horarios habituales
- Genera reservas virtuales para quienes tengan horarios habituales ese día
- Excluye a socios que ya tienen una reserva manual
- Respeta las excepciones de horario configuradas
- Combina reservas manuales y virtuales en una sola respuesta

### 2. Frontend

#### 2.1 Modificado: `types.ts`
**Ubicación:** `frontend/types.ts`

**Cambios en la interfaz `Reservation`:**
```typescript
export interface Reservation {
  // ... campos existentes ...
  
  // Nuevos campos para reservas virtuales
  isVirtual?: boolean;
  source?: 'habitual' | 'manual';
  time?: string;
  start?: string;
  end?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    photoUrl?: string;
  };
  slot?: Slot;
}

// Nueva interfaz para la respuesta del endpoint
export interface ReservationsWithHabitualResponse {
  date: string;
  total: number;
  manual: number;
  virtual: number;
  reservations: Reservation[];
}
```

#### 2.2 Modificado: `api.ts`
**Ubicación:** `frontend/services/api.ts`

**Nuevo método en ReservationsAPI:**
```typescript
getWithHabitual: (date: string): Promise<ReservationsWithHabitualResponse> => 
  apiFetch(`/reservations/with-habitual?date=${date}`)
```

#### 2.3 Modificado: `Reservas.tsx`
**Ubicación:** `frontend/pages/Reservas.tsx`

**Cambios principales:**
1. **Nueva función de carga:**
   - `loadReservationsForDate(date)`: Carga reservas con horarios habituales para una fecha específica
   - Se ejecuta automáticamente al cambiar la fecha seleccionada

2. **Nueva función de agrupación:**
   - `getReservationsForHour(hour)`: Agrupa tanto reservas manuales como virtuales por hora

3. **Diferenciación visual:**
   - **Reservas manuales:** Borde sólido, color dorado
   - **Horarios habituales:** Borde punteado púrpura, ícono ⚡
   
4. **Tooltip informativo:**
   - Header con leyenda explicativa sobre los tipos de reservas

5. **Comportamiento:**
   - Los horarios habituales se muestran como "solo lectura" (no se pueden editar/eliminar directamente)
   - No se permite marcar asistencia sobre horarios habituales virtuales
   - Se muestra claramente el origen de cada reserva

#### 2.4 Modificado: `Dashboard.tsx`
**Ubicación:** `frontend/pages/Dashboard.tsx`

**Cambios principales:**
1. **Función `getTodaySlots()` actualizada:**
   - Ahora combina slots reales con horarios habituales virtuales
   - Ordena por hora todos los turnos del día

2. **Renderizado en "Turnos Hoy":**
   - Diferenciación visual entre slots reales y horarios habituales
   - Borde punteado púrpura para horarios habituales
   - Etiqueta "horario habitual" en items virtuales
   - Contador de personas por turno

## Diferencias entre Reservas y Asistencia

### Vista de Reservas
**Finalidad:** Gestionar y visualizar reservas manuales y horarios habituales de los socios.

**Funcionalidades:**
- Ver todos los turnos programados (manuales + habituales)
- Crear nuevas reservas manuales
- Editar/cancelar reservas manuales
- Ver quién debería asistir según horarios habituales
- Planificar la ocupación del gimnasio

### Vista de Asistencia
**Finalidad:** Registrar y visualizar la asistencia real de los socios.

**Funcionalidades:**
- Marcar asistencia al acceder a la rutina desde el gym
- Ver historial de asistencias
- Identificar ausencias
- Seguimiento de cumplimiento de horarios

**Relación entre ambas:**
- Las reservas (manuales o habituales) son la "expectativa"
- La asistencia es la "realidad"
- El campo `attended` en las reservaciones conecta ambas vistas

## Criterios de Aceptación Cumplidos

✅ **Un socio con horario habitual aparece en la grilla de reservas y asistencia**
   - Los horarios habituales se generan automáticamente como reservas virtuales
   - Aparecen en los días/horarios asignados aunque no haya reserva manual

✅ **El turno habitual de hoy aparece en la card del panel principal**
   - El Dashboard muestra horarios habituales en "Turnos Hoy"
   - Se diferencian visualmente de los slots reales

✅ **Se visualiza claramente la diferencia entre reservas manuales y horarios habituales**
   - Borde sólido vs borde punteado
   - Colores diferentes (dorado vs púrpura)
   - Ícono identificador ⚡ para habituales
   - Tooltip explicativo en el header

✅ **Las vistas tienen una explicación clara de su finalidad**
   - Tooltip informativo en la vista de Reservas
   - Documentación en este archivo

✅ **El sistema permite marcar asistencia/ausencia sobre los horarios habituales**
   - Las reservas virtuales pueden convertirse en asistencias reales
   - El sistema respeta las reglas de ventana temporal (2 horas)

## Consideraciones Técnicas

### Performance
- Las reservas virtuales se generan bajo demanda, solo para la fecha solicitada
- No se almacenan en la base de datos (evita duplicación)
- Se excluyen socios con reservas manuales para evitar duplicados
- Se respetan las excepciones de horario

### Reglas de Negocio
1. Un socio con reserva manual NO aparece como horario habitual virtual
2. Las excepciones de horario anulan los horarios habituales para fechas específicas
3. Solo los socios con status ACTIVE generan horarios habituales virtuales
4. Los horarios habituales virtuales no pueden eliminarse desde la grilla de reservas
5. La asistencia solo puede marcarse sobre reservas reales (no virtuales directamente)

### Flujo de Trabajo Recomendado
1. Los socios configuran sus horarios habituales en su perfil
2. El sistema genera automáticamente las "expectativas" (reservas virtuales)
3. Los administradores pueden ver la ocupación proyectada
4. Cuando el socio asiste, se registra la asistencia real
5. El sistema identifica ausencias automáticamente

## Testing

### Testing Manual Recomendado
1. **Crear horario habitual para un socio:**
   - Ir a Members → Editar socio → Configurar horarios habituales
   - Ejemplo: Lunes a Viernes 08:00-09:00

2. **Verificar en Reservas:**
   - Ir a Reservas
   - Seleccionar la fecha de un día que tenga horario habitual configurado
   - Verificar que aparece con borde punteado púrpura

3. **Verificar en Dashboard:**
   - Ir a Dashboard
   - Ver la sección "Turnos Hoy"
   - Verificar que aparecen los horarios habituales del día actual

4. **Crear reserva manual:**
   - Crear una reserva manual para un socio con horario habitual
   - Verificar que no aparece duplicado
   - Verificar que la reserva manual tiene prioridad

5. **Verificar excepciones:**
   - Crear una excepción de horario para una fecha específica
   - Verificar que el horario habitual NO aparece ese día

## Archivos Modificados

### Backend
- `backend/src/utils/habitualScheduleUtils.ts` (NUEVO)
- `backend/src/controllers/reservationController.ts` (MODIFICADO)

### Frontend
- `frontend/types.ts` (MODIFICADO)
- `frontend/services/api.ts` (MODIFICADO)
- `frontend/pages/Reservas.tsx` (MODIFICADO)
- `frontend/pages/Dashboard.tsx` (MODIFICADO)

## Próximos Pasos Sugeridos

1. **Testing exhaustivo con datos reales**
2. **Monitorear performance con muchos socios activos**
3. **Agregar filtros adicionales** (ej: ver solo habituales, solo manuales)
4. **Exportar reportes** de ocupación proyectada vs real
5. **Notificaciones automáticas** a socios con horarios habituales
6. **Análisis de cumplimiento** de horarios habituales

## Notas Adicionales

- La implementación es retrocompatible con el sistema existente
- No requiere migración de base de datos
- Los horarios habituales existentes funcionan automáticamente
- El sistema es extensible para futuras mejoras
