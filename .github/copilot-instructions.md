
# El Arca Gym Manager - Instrucciones para Agentes IA (Beast-Mode)

## Visión General
Sistema fullstack para gestión de gimnasio. Backend (Express + Prisma + PostgreSQL), Frontend (React + Vite). Deploy automatizado vía Docker/GitHub Actions/Watchtower.

## Arquitectura

### Backend (`/backend`)
- **Stack**: Node.js 20, Express 5, TypeScript 5, Prisma 7, PostgreSQL
- **Patrón**: Los controllers exportan una función que recibe `prisma` como parámetro: `export default function(prisma) { ... }`
- **Auth**: JWT con roles (`ADMIN`/`TRAINER`) y permisos granulares
- **Notificaciones**: Socket.io global `(global as any).io`
- **Swagger**: Documentación en `/api-docs`

### Frontend (`/frontend`)
- **Stack**: React 19, TypeScript, Vite, TailwindCSS
- **Estado**: Context API para auth, navegación, tema, idioma (`contexts/`)
- **API**: Centralizado en `services/api.ts` con `apiFetch()` que maneja JWT
- **Variables**: Prefijo `VITE_` (ej: `VITE_API_URL`)

## Flujos Críticos de Desarrollo

### Desarrollo
```bash
# Backend (puerto 4000)
cd backend && npm run dev
# Migraciones: npm run db:migrate
# Seed: npm run seed / npm run seed:users

# Frontend (puerto 5173)
cd frontend && npm run dev
```

### Testing
- Backend: Vitest + Supertest (mock de prisma, integración con supertest)
- Ejecutar: `npm test` en `/backend`

### Deploy
**Siempre usar la terminal activa y especificar el directorio antes de ejecutar comandos.**
**No abrir terminales nuevas automáticamente.**

1. **CI/CD Automático**: Push a `main` → GitHub Actions → Watchtower actualiza VPS (~5-8 min)
2. **Fast Deploy**: Ejecutar `./deploy-auto.sh` en raíz (hace commit, espera build y fuerza update VPS)
3. **Forzar update inmediato**: Ejecutar en terminal activa, estando en `/opt/elarcagym` en la VPS:
   ```bash
   ssh -p 5371 root@***REMOVED*** 'cd /opt/elarcagym && docker compose pull && docker compose up -d --force-recreate'
   ```

Ver detalles en [DEPLOY.md](../DEPLOY.md). **Nunca** abrir SSH manual para deploy sin usar scripts o CI/CD.

## Convenciones Específicas

### Backend
- Validación estricta de inputs (DNI: `^\d{1,8}$`, email termina en `.com`)
- Middlewares: `authenticateToken`, `requireAdmin`, `requirePermission('modulo.accion')`
- Notificaciones: `sendNotificationToAdmins()` en `utils/notificationService.js`
- Scripts de mantenimiento: `clean_duplicates.js` (ejecutar con tsx)

### Frontend
- Navegación: Context API (`NavigationContext`), chequear `canNavigate` antes de cambiar de página
- Modo self-service: `/rutina` (clientes sin login)
- Manejo de errores API: logout automático en error de token
- Permisos: usar `hasPermission()` antes de mostrar features admin

### Modelo de Datos
- Sistema dual: `User` (staff) vs `Member` (clientes)
- Rutinas: `Routine` → `RoutineDay` → `ExerciseDetail` (cascade delete)
- Horarios: `HabitualSchedule` (recurrente) + `ScheduleException` (excepción)
- Nutrición: campo JSON `nutritionPlan` en Member + plantillas

## Integraciones

- **Socket.io**: Notificaciones en tiempo real (ver `NotificationBell` en frontend)
- **SendGrid**: Emails (opcional, clave en .env)
- **Google Gemini**: Generación de planes de nutrición

## Archivos Clave
- Backend: [backend/src/index.ts](../backend/src/index.ts)
- Auth: [backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts)
- DB: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)
- Frontend: [frontend/App.tsx](../frontend/App.tsx)
- API: [frontend/services/api.ts](../frontend/services/api.ts)
- Deploy: [DEPLOY.md](../DEPLOY.md), [.github/workflows/docker-publish.yml](../.github/workflows/docker-publish.yml)

## Tareas Comunes

**Nuevo endpoint API:**
1. Agrega ruta en `backend/src/controllers/`
2. Monta el controller en `backend/src/index.ts` si es nuevo
3. Añade middleware de auth si aplica
4. Documenta en Swagger (JSDoc)
5. Agrega método en `frontend/services/api.ts`

**Nuevo campo en DB:**
1. Modifica `backend/prisma/schema.prisma`
2. Ejecuta migración: `npx prisma migrate dev --name descripcion`

**Nuevo permiso:**
1. Agrega en seed de permisos `backend/src/seed-users.ts`
2. Ejecuta `npm run seed:users`
3. Chequea en frontend con `hasPermission('modulo.accion')`

## Troubleshooting

- **"Prisma Client not initialized"**: Ejecuta `npm run db:generate` en backend
- **404 Frontend en producción**: Vite preview usa puerto 4173
- **Falla build Docker**: Chequea variables en `docker-compose.yml` y `.env`
- **Errores de auth**: JWT_SECRET debe coincidir backend/frontend, expira en 8h

---
*Última actualización: Feb 2026. Dudas: ver docs en `/docs` o los README de backend/frontend.*
