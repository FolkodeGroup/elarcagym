# Sistema de Roles y Permisos - El Arca Gym

## Descripción General

El sistema implementa una gestión completa de usuarios con roles y permisos configurables para administradores y profesores del gimnasio. Los usuarios del sistema (admin/profesores) están completamente separados de los socios del gimnasio.

## Arquitectura

### Entidades

#### 1. User (Usuario del Sistema)
Representa a los administradores y profesores que operan la aplicación.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| email | String | Email único para login |
| password | String | Contraseña hasheada (bcrypt) |
| firstName | String | Nombre |
| lastName | String | Apellido |
| dni | String | DNI único |
| phone | String? | Teléfono (opcional) |
| role | UserRole | ADMIN o TRAINER |
| isActive | Boolean | Estado del usuario |
| photoUrl | String? | URL de foto de perfil |
| createdAt | DateTime | Fecha de creación |
| updatedAt | DateTime | Última actualización |
| lastLoginAt | DateTime? | Último acceso |

#### 2. Permission (Permiso)
Define los permisos disponibles en el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| code | String | Código único (ej: "members.view") |
| name | String | Nombre legible |
| description | String? | Descripción del permiso |
| module | String | Módulo al que pertenece |

#### 3. UserPermission (Permiso de Usuario)
Relación muchos-a-muchos entre usuarios y permisos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| userId | UUID | ID del usuario |
| permissionId | UUID | ID del permiso |
| granted | Boolean | Si está concedido (true) o denegado (false) |

### Roles

#### ADMIN (Administrador)
- Acceso completo a todas las funciones
- Puede gestionar usuarios y roles
- Puede modificar permisos de otros usuarios

#### TRAINER (Profesor/Entrenador)
- Acceso limitado según permisos asignados
- No puede gestionar usuarios ni roles
- Permisos por defecto:
  - Ver socios
  - Gestión completa de rutinas
  - Gestión de biometría
  - Ver/crear nutrición
  - Ver/crear reservas
  - Ver ejercicios
  - Ver dashboard

## Módulos de Permisos

| Módulo | Permisos Disponibles |
|--------|---------------------|
| members | view, create, edit, delete |
| routines | view, create, edit, delete |
| biometrics | view, create, edit, delete |
| nutrition | view, create, edit, delete |
| reservations | view, create, edit, delete |
| products | view, create, edit, delete |
| sales | view, create, delete |
| payments | view, create, edit, delete |
| reminders | view, create, edit, delete |
| exercises | view, create, edit, delete |
| config | view, edit |
| users | view, create, edit, delete |
| dashboard | view |
| reports | view, export |

## Endpoints API

### Autenticación
```
POST /users/login
Body: { email: string, password: string }
Response: { token: string, user: User }
```

### Gestión de Usuarios (requiere ADMIN)
```
GET /users                     - Listar usuarios
GET /users/:id                 - Obtener usuario por ID
POST /users                    - Crear usuario
PUT /users/:id                 - Actualizar usuario
DELETE /users/:id              - Eliminar usuario
```

### Permisos
```
GET /users/permissions/all     - Listar todos los permisos
PUT /users/:id/permissions     - Actualizar permisos de usuario
```

### Perfil
```
GET /users/me/profile          - Obtener perfil actual
PUT /users/me/password         - Cambiar contraseña
```

## Credenciales Iniciales

### Administrador Principal
- **Nombre:** Verónica Analia Requena
- **Email:** veronicarequena2@gmail.com
- **Contraseña inicial:** Elarca2026
- **DNI:** 30108930
- **Teléfono:** 11240209461

⚠️ **IMPORTANTE:** Cambiar la contraseña después del primer login.


### Entrenador Demo
- **Nombre:** Emmanuel Fernando Paredes
- **Email:** ariel_ale75@hotmail.com
- **Contraseña:** Entrenador123
- **DNI:** 31282905
- **Teléfono:** 1139244649

### Profesora
- **Nombre:** Florencia Solange Ceballos
- **Email:** florenciaceballos295@gmail.com
- **Contraseña:** Entrenador123
- **DNI:** 36916483
- **Teléfono:** 1123474373

## Flujo de Autenticación

1. El usuario ingresa email y contraseña en el login
2. El sistema busca primero en la tabla `User`
3. Si encuentra al usuario, verifica la contraseña y genera un JWT
4. El JWT contiene: id, email, name, role, permissions
5. El frontend almacena el token y lo usa para todas las peticiones
6. El middleware `authenticateToken` verifica el token en cada petición protegida

## Middleware de Autorización

### authenticateToken
Verifica que el usuario esté autenticado (token válido).

### requireAdmin
Verifica que el usuario tenga rol ADMIN.

### requirePermission(permission)
Verifica que el usuario tenga un permiso específico (o sea ADMIN).

### requireAnyPermission(permissions[])
Verifica que el usuario tenga al menos uno de los permisos.

### requireAllPermissions(permissions[])
Verifica que el usuario tenga todos los permisos especificados.

## Frontend

### Componentes Nuevos

1. **UsersManagement** - Gestión de usuarios (solo admin)
   - Lista de usuarios
   - Crear/editar usuarios
   - Gestionar permisos individuales

2. **UserProfile** - Perfil del usuario actual
   - Ver información personal
   - Editar datos básicos
   - Cambiar contraseña

### Integración en Layout

- Menú de usuario en el header con nombre y rol
- Opción "Mi Perfil" en dropdown
- Opción "Usuarios" en sidebar (solo admin)

### AuthContext

Provee:
- `user` - Usuario actual
- `isAuthenticated` - Si está autenticado
- `isAdmin` - Si es administrador
- `isTrainer` - Si es entrenador
- `hasPermission(permission)` - Verificar permiso
- `hasAnyPermission(permissions[])` - Verificar algún permiso

## Comandos

```bash
# Ejecutar migración
npm run db:migrate

# Generar cliente Prisma
npm run db:generate

# Ejecutar seed de usuarios y permisos
npm run seed:users
```

## Notas de Implementación

1. **Separación de entidades:** Los usuarios (User) y socios (Member) son entidades completamente separadas. Los usuarios operan la app, los socios son los clientes del gimnasio.

2. **Seguridad:** Las contraseñas se hashean con bcrypt (10 rounds). Los tokens JWT expiran en 12 horas.

3. **Permisos configurables:** El administrador puede personalizar los permisos de cada usuario entrenador desde la interfaz.

4. **Escalabilidad:** El sistema de permisos permite agregar nuevos permisos fácilmente modificando el seed.
