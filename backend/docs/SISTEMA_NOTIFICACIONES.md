# Sistema de Notificaciones Nativas

## Descripción General

El sistema de notificaciones nativas permite enviar notificaciones en tiempo real a los usuarios de la aplicación sin depender de servicios externos. Las notificaciones se almacenan en la base de datos y se entregan mediante WebSocket (Socket.io) cuando el usuario está conectado.

## Características Implementadas

✅ **Notificaciones en tiempo real** - Usando Socket.io
✅ **Almacenamiento persistente** - Base de datos PostgreSQL
✅ **Contador de no leídas** - Badge en el ícono de notificaciones
✅ **Marcar como leídas** - Individual o todas a la vez
✅ **Navegación inteligente** - Click en notificación navega a la sección relevante
✅ **Tipos de notificación** - info, success, warning, error
✅ **Eliminación** - Los usuarios pueden eliminar notificaciones
✅ **Sin servicios externos** - 100% autogestionado

## Arquitectura

### Backend

#### 1. Modelo de Base de Datos

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  type      String   // info, success, warning, error
  link      String?  // URL relativa para navegar
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  @@index([userId, read])
  @@index([createdAt])
}
```

#### 2. Endpoints REST

Ubicación: `/backend/src/routes/notificationRoutes.ts`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/notifications` | Obtener todas las notificaciones del usuario |
| GET | `/notifications/unread-count` | Obtener contador de no leídas |
| PUT | `/notifications/:id/read` | Marcar una notificación como leída |
| PUT | `/notifications/mark-all-read` | Marcar todas como leídas |
| POST | `/notifications` | Crear nueva notificación (admin) |
| DELETE | `/notifications/:id` | Eliminar notificación |

#### 3. WebSocket (Socket.io)

**Configuración en** `/backend/src/index.ts`:

```typescript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  // Autenticación del socket
  socket.on('authenticate', (userId: string) => {
    socket.join(`user_${userId}`);
  });
});
```

**Eventos:**
- `authenticate` - Cliente se identifica con su userId
- `new_notification` - Servidor envía nueva notificación al cliente

#### 4. Servicio de Notificaciones

Ubicación: `/backend/src/utils/notificationService.ts`

Funciones auxiliares para enviar notificaciones:

```typescript
// Enviar a un usuario
await sendNotification({
  userId: 'user-id',
  title: 'Título de la notificación',
  message: 'Mensaje descriptivo',
  type: 'info',
  link: 'members' // página a la que navegar
});

// Enviar a todos los admins
await sendNotificationToAdmins({
  title: 'Nuevo socio',
  message: 'Juan Pérez se registró',
  type: 'success',
  link: 'members'
});
```

### Frontend

#### 1. API Service

Ubicación: `/frontend/services/api.ts`

```typescript
export const NotificationsAPI = {
  list: () => apiFetch('/notifications'),
  getUnreadCount: () => apiFetch('/notifications/unread-count'),
  markAsRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => apiFetch('/notifications/mark-all-read', { method: 'PUT' }),
  delete: (id: string) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
};
```

#### 2. Componente NotificationBell

Ubicación: `/frontend/components/NotificationBell.tsx`

**Características:**
- Ícono de campana con contador badge
- Dropdown con lista de notificaciones
- Conexión automática a Socket.io
- Soporte para notificaciones del navegador
- Formateo inteligente de fechas
- Colores según tipo de notificación
- Acciones inline (marcar leída, eliminar)

**Props:**
```typescript
interface NotificationBellProps {
  onNavigate?: (page: string) => void;
}
```

#### 3. Integración en Layout

Ubicación: `/frontend/components/Layout.tsx`

```tsx
import NotificationBell from './NotificationBell';

// En el header:
<NotificationBell onNavigate={onNavigate} />
```

## Uso

### Crear Notificaciones desde el Backend

#### Opción 1: Usando el Controlador

```typescript
import { sendNotification } from '../utils/notificationService.js';

// En cualquier controlador o middleware
await sendNotification({
  userId: user.id,
  title: 'Pago registrado',
  message: 'Tu pago de $5000 ha sido confirmado',
  type: 'success',
  link: 'members'
});
```

#### Opción 2: Usando Prisma directamente

```typescript
const notification = await prisma.notification.create({
  data: {
    userId: 'user-id',
    title: 'Título',
    message: 'Mensaje',
    type: 'info',
    link: 'dashboard',
  },
});

// Emitir via WebSocket manualmente
const io = (global as any).io;
if (io) {
  io.to(`user_${userId}`).emit('new_notification', notification);
}
```

### Tipos de Notificación

```typescript
type NotificationType = 'info' | 'success' | 'warning' | 'error';
```

**Colores en la UI:**
- `info` - Azul
- `success` - Verde
- `warning` - Amarillo
- `error` - Rojo

### Links de Navegación

El campo `link` acepta los IDs de las páginas de la aplicación:

- `dashboard` - Panel principal
- `members` - Socios
- `biometrics` - Seguimiento
- `operations` - Gestor de rutinas
- `nutrition` - Nutrición
- `reservas` - Reservas
- `admin` - Comercio
- `Ingresos` - Ingresos y ventas
- `users_management` - Gestión de usuarios (solo admin)

## Ejemplos de Uso Práctico

### Notificar cuando un socio se registra

```typescript
// En memberController.ts
export const createMember = async (req: Request, res: Response) => {
  // ... código de creación del socio
  
  await sendNotificationToAdmins({
    title: 'Nuevo socio registrado',
    message: `${newMember.firstName} ${newMember.lastName} se ha registrado`,
    type: 'success',
    link: 'members'
  });
};
```

### Notificar sobre pagos pendientes

```typescript
// En un job programado o tarea de verificación
const pendingPayments = await getPendingPayments();

if (pendingPayments.length > 0) {
  await sendNotificationToAdmins({
    title: 'Pagos pendientes',
    message: `Hay ${pendingPayments.length} pagos pendientes este mes`,
    type: 'warning',
    link: 'members'
  });
}
```

### Notificar sobre errores del sistema

```typescript
try {
  // operación crítica
} catch (error) {
  await sendNotificationToAdmins({
    title: 'Error en el sistema',
    message: `Error al procesar operación: ${error.message}`,
    type: 'error'
  });
}
```

## Testing

### Script de Prueba

Ubicación: `/backend/test-notifications.ts`

Ejecutar:
```bash
cd backend
npx tsx test-notifications.ts
```

Este script:
1. Busca el primer usuario admin
2. Crea 4 notificaciones de prueba
3. Muestra el contador total
4. Lista todas las notificaciones

### Probar en Vivo

1. Iniciar backend: `cd backend && npm run dev`
2. Iniciar frontend: `cd frontend && npm run dev`
3. Hacer login con usuario admin
4. Ejecutar `npx tsx test-notifications.ts`
5. Las notificaciones aparecerán en tiempo real en la UI

## Permisos del Navegador

El componente solicita permisos para mostrar notificaciones del navegador nativas. Esto permite que las notificaciones se muestren incluso cuando el usuario no está mirando la pestaña activamente.

```typescript
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

## Migraciones

La migración que crea la tabla de notificaciones:

```
prisma/migrations/20260203192325_add_notifications/
```

## Archivos Modificados/Creados

### Backend
- ✅ `prisma/schema.prisma` - Modelo Notification
- ✅ `src/controllers/notificationController.ts` - Nuevo
- ✅ `src/routes/notificationRoutes.ts` - Nuevo
- ✅ `src/utils/notificationService.ts` - Nuevo
- ✅ `src/index.ts` - Configuración Socket.io
- ✅ `test-notifications.ts` - Script de prueba

### Frontend
- ✅ `services/api.ts` - NotificationsAPI
- ✅ `components/NotificationBell.tsx` - Nuevo
- ✅ `components/Layout.tsx` - Integración

## Dependencias Agregadas

### Backend
```json
{
  "socket.io": "^4.x.x"
}
```

### Frontend
```json
{
  "socket.io-client": "^4.x.x"
}
```

## Configuración

No se requiere configuración adicional. El sistema usa las variables de entorno existentes:

- `DATABASE_URL` - Conexión a PostgreSQL
- `FRONTEND_URL` - URL del frontend para CORS (opcional)

## Escalabilidad

El sistema está preparado para:
- ✅ Múltiples usuarios conectados simultáneamente
- ✅ Alta frecuencia de notificaciones
- ✅ Persistencia de notificaciones
- ✅ Índices en la base de datos para consultas rápidas

## Próximas Mejoras (Opcionales)

- [ ] Paginación de notificaciones
- [ ] Filtros por tipo
- [ ] Notificaciones programadas
- [ ] Preferencias de notificación por usuario
- [ ] Sonidos personalizados
- [ ] Agrupación de notificaciones similares

## Soporte

Para preguntas o problemas:
1. Revisar los logs del backend
2. Verificar la consola del navegador
3. Comprobar que Socket.io está conectado
4. Verificar permisos de notificaciones del navegador
