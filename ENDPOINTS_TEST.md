# Test de Endpoints - El Arca Gym

Este documento prueba todos los endpoints del backend para verificar su correcto funcionamiento.

## Endpoints Verificados

### 1. Autenticación
- **POST** `/users/login` - Login de usuario
- **GET** `/users/me` - Obtener usuario actual

### 2. Notificaciones
- **GET** `/notifications` - Listar notificaciones
- **GET** `/notifications/unread-count` - Contador de no leídas
- **PUT** `/notifications/:id/read` - Marcar como leída
- **PUT** `/notifications/mark-all-read` - Marcar todas como leídas
- **POST** `/notifications` - Crear notificación
- **DELETE** `/notifications/:id` - Eliminar notificación

### 3. Configuración
- **GET** `/config` - Listar todas las configuraciones
- **GET** `/config/:key` - Obtener configuración específica
- **PUT** `/config/:key` - Crear/actualizar configuración
- **DELETE** `/config/:key` - Eliminar configuración

### 4. Plantillas de Nutrición
- **GET** `/nutrition-templates` - Listar todas
- **GET** `/nutrition-templates/active` - Obtener la activa
- **GET** `/nutrition-templates/:id` - Obtener por ID
- **POST** `/nutrition-templates` - Crear nueva
- **PUT** `/nutrition-templates/:id` - Actualizar
- **DELETE** `/nutrition-templates/:id` - Eliminar

### 5. Lista de Espera (Waitlist)
- **GET** `/waitlist` - Listar todos
- **POST** `/waitlist` - Agregar a lista
- **PUT** `/waitlist/:id` - Actualizar entrada
- **DELETE** `/waitlist/:id` - Eliminar de lista

### 6. Miembros
- **GET** `/members` - Listar todos los miembros
- **GET** `/members/:id` - Obtener miembro por ID
- **POST** `/members` - Crear miembro
- **PUT** `/members/:id` - Actualizar miembro
- **DELETE** `/members/:id` - Eliminar miembro

### 7. Categorías de Ejercicios
- **GET** `/exercise-categories` - Listar todas
- **GET** `/exercise-categories/:id` - Obtener por ID
- **POST** `/exercise-categories` - Crear categoría
- **PUT** `/exercise-categories/:id` - Actualizar
- **DELETE** `/exercise-categories/:id` - Eliminar

## Pruebas con curl

### Login y obtención de token
```bash
export TOKEN=$(curl -s -X POST http://localhost:4000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"***REMOVED***","password":"***REMOVED***"}' | \
  jq -r '.token')

echo "Token: $TOKEN"
```

### Verificar notificaciones
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/notifications | jq
```

### Verificar configuración
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/config/monthly_fee | jq
```

### Verificar plantillas de nutrición
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/nutrition-templates/active | jq
```

### Verificar lista de espera
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/waitlist | jq
```

### Verificar miembros
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/members | jq
```

### Verificar categorías de ejercicios
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/exercise-categories | jq
```

## Script de verificación automática

Ejecutar el script de verificación:
```bash
./verify-endpoints.sh
```

## Estado Actual (15 Feb 2026)

✅ Todos los endpoints funcionan correctamente  
✅ No hay errores 404  
✅ Base de datos poblada con datos de prueba  
✅ Autenticación JWT operativa  
✅ Notificaciones Socket.io activas

## Notas

- Todos los endpoints requieren autenticación (token JWT)
- El token se obtiene mediante `/users/login`
- El token debe incluirse en el header: `Authorization: Bearer <token>`
- Los endpoints que retornan arrays vacíos o null son normales si no hay datos
