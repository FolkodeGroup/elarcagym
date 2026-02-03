# Sistema de Notificaciones - Guía Rápida

## ✅ Implementación Completada

Se ha implementado exitosamente un sistema de notificaciones nativas 100% autogestionado para la aplicación El Arca Gym Manager.

## 🎯 Características

- ✅ Notificaciones en tiempo real (Socket.io)
- ✅ Sin servicios externos
- ✅ Persistencia en base de datos
- ✅ Contador de no leídas
- ✅ Marcar como leídas (individual/todas)
- ✅ Navegación a secciones relevantes
- ✅ Tipos: info, success, warning, error
- ✅ Notificaciones del navegador

## 🚀 Cómo Usar

### Ver Notificaciones

1. Hacer login en la aplicación
2. Buscar el ícono de campana 🔔 en el header (esquina superior derecha)
3. El badge rojo muestra el número de notificaciones no leídas
4. Click en la campana para ver el panel de notificaciones

### Crear Notificaciones (Backend)

```typescript
import { sendNotification, sendNotificationToAdmins } from './utils/notificationService.js';

// Enviar a un usuario específico
await sendNotification({
  userId: 'user-id',
  title: 'Título de la notificación',
  message: 'Mensaje descriptivo',
  type: 'success', // info | success | warning | error
  link: 'members' // página a navegar (opcional)
});

// Enviar a todos los administradores
await sendNotificationToAdmins({
  title: 'Nuevo socio registrado',
  message: 'Juan Pérez se ha registrado en el gimnasio',
  type: 'success',
  link: 'members'
});
```

### Probar el Sistema

```bash
# 1. Iniciar backend
cd backend
npm run dev

# 2. En otra terminal, iniciar frontend
cd frontend
npm run dev

# 3. En otra terminal, crear notificaciones de prueba
cd backend
npx tsx test-notifications.ts
```

## 📁 Archivos Importantes

### Backend
- `src/controllers/notificationController.ts` - Endpoints REST
- `src/routes/notificationRoutes.ts` - Rutas
- `src/utils/notificationService.ts` - Funciones helper
- `src/index.ts` - Configuración Socket.io
- `test-notifications.ts` - Script de prueba

### Frontend
- `components/NotificationBell.tsx` - Componente principal
- `services/api.ts` - API de notificaciones
- `components/Layout.tsx` - Integración

### Base de Datos
- `prisma/schema.prisma` - Modelo Notification
- `prisma/migrations/20260203192325_add_notifications/` - Migración

## 📚 Documentación Completa

Ver: `backend/docs/SISTEMA_NOTIFICACIONES.md`

## 🔧 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/notifications` | Listar notificaciones |
| GET | `/notifications/unread-count` | Contador de no leídas |
| PUT | `/notifications/:id/read` | Marcar como leída |
| PUT | `/notifications/mark-all-read` | Marcar todas como leídas |
| DELETE | `/notifications/:id` | Eliminar notificación |

## 💡 Ejemplos de Uso

### Notificar nuevo socio
```typescript
await sendNotificationToAdmins({
  title: 'Nuevo socio',
  message: `${member.firstName} ${member.lastName} se registró`,
  type: 'success',
  link: 'members'
});
```

### Notificar pago pendiente
```typescript
await sendNotification({
  userId: adminId,
  title: 'Pago vencido',
  message: 'Hay 5 socios con pagos pendientes',
  type: 'warning',
  link: 'members'
});
```

### Notificar error del sistema
```typescript
await sendNotificationToAdmins({
  title: 'Error en backup',
  message: 'No se pudo completar el backup automático',
  type: 'error'
});
```

## ✨ Cambios Realizados

1. ❌ Eliminada opción "Notificaciones por email" del panel de preferencias
2. ✅ Creado modelo de notificaciones en la base de datos
3. ✅ Implementados endpoints REST para notificaciones
4. ✅ Configurado WebSocket con Socket.io
5. ✅ Creado componente NotificationBell con dropdown
6. ✅ Integrado en el header de la aplicación
7. ✅ Probado y funcionando correctamente

## 🎨 UI/UX

- Ícono de campana en el header
- Badge rojo con contador de no leídas
- Dropdown con lista de notificaciones
- Colores según tipo (azul, verde, amarillo, rojo)
- Fechas en formato relativo ("Hace 5m", "Hace 2h")
- Botones para marcar como leída/eliminar
- Click en notificación navega a la sección
- Notificaciones del navegador (con permiso)

## 📦 Dependencias

```bash
# Backend
npm install socket.io

# Frontend
npm install socket.io-client
```

## 🐛 Troubleshooting

**No aparecen notificaciones:**
- Verificar que el backend está corriendo
- Abrir consola del navegador y buscar errores
- Verificar conexión Socket.io (debe aparecer "Socket.io conectado")

**No se reciben en tiempo real:**
- Verificar que Socket.io está conectado
- Revisar CORS en el backend
- Verificar que el userId se está enviando correctamente

**Badge no actualiza:**
- Refrescar la página
- Verificar que el endpoint `/notifications/unread-count` funciona

## 👨‍💻 Autor

Sistema implementado por GitHub Copilot usando Claude Sonnet 4.5

Fecha: 3 de febrero de 2026
