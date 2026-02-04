# El Arca Gym - Backend API

API REST para el sistema de gestión del gimnasio El Arca.

## 🚀 Despliegue

Para instrucciones detalladas de despliegue en Render y Vercel, consulta:
**[RENDER_DEPLOYMENT.md](../RENDER_DEPLOYMENT.md)**

## 🛠️ Tecnologías

- **Node.js** 20.x
- **Express** 5.x
- **TypeScript** 5.x
- **Prisma ORM** 7.x
- **PostgreSQL** (base de datos)
- **Socket.io** (notificaciones en tiempo real)
- **JWT** (autenticación)
- **Swagger** (documentación API)

## 📦 Instalación Local

### Requisitos previos

- Node.js 20.x o superior
- PostgreSQL 14 o superior
- npm o yarn

### Pasos

1. **Clona el repositorio**
```bash
git clone <tu-repo>
cd el-arca-gym-manager/backend
```

2. **Instala dependencias**
```bash
npm install
```

3. **Configura variables de entorno**
```bash
cp .env.example .env
```

Edita `.env` y configura:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/el_arca_gym"
JWT_SECRET="tu-secreto-jwt-seguro"
FRONTEND_URL="http://localhost:3000"
SENDGRID_API_KEY="tu-api-key" # Opcional
EMAIL_FROM="tu-email@dominio.com" # Opcional
```

4. **Ejecuta las migraciones**
```bash
npm run db:migrate
```

5. **Genera el cliente de Prisma**
```bash
npm run db:generate
```

6. **Opcional: Carga datos de prueba**
```bash
npm run seed
npm run seed:users
```

7. **Inicia el servidor de desarrollo**
```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:4000`

## 📚 Documentación de la API

Una vez iniciado el servidor, accede a la documentación interactiva de Swagger:

```
http://localhost:4000/api-docs
```

## 🔑 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo con hot-reload |
| `npm run build` | Compila TypeScript a JavaScript (dist/) |
| `npm start` | Inicia servidor en producción |
| `npm run db:migrate` | Aplica migraciones de base de datos |
| `npm run db:generate` | Genera cliente de Prisma |
| `npm run seed` | Carga datos de ejemplo |
| `npm run seed:users` | Carga usuarios de ejemplo |

## 🗄️ Base de Datos

### Esquema Principal

- **Members**: Miembros del gimnasio
- **Products**: Productos y membresías
- **Sales**: Ventas y pagos
- **Reservations**: Reservas de clases
- **Slots**: Horarios disponibles
- **Diets**: Planes nutricionales
- **ExerciseMaster**: Catálogo de ejercicios
- **Users**: Usuarios del sistema (admin, staff)
- **Roles**: Roles y permisos
- **Notifications**: Sistema de notificaciones

### Migraciones

Para crear una nueva migración:
```bash
npx prisma migrate dev --name descripcion_cambio
```

Para aplicar migraciones en producción:
```bash
npx prisma migrate deploy
```

## 🔐 Autenticación

La API usa JWT (JSON Web Tokens) para autenticación.

### Obtener token

```bash
POST /auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Usar token

Incluye el token en el header de las requests:
```
Authorization: Bearer <tu-token>
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests específicos
npm run test:auth
npm run test:notifications
```

## 📁 Estructura del Proyecto

```
backend/
├── prisma/
│   ├── schema.prisma       # Esquema de base de datos
│   └── migrations/         # Migraciones
├── src/
│   ├── controllers/        # Lógica de negocio
│   ├── middleware/         # Middleware (auth, etc.)
│   ├── routes/            # Rutas de la API
│   ├── utils/             # Utilidades
│   ├── config/            # Configuración
│   └── index.ts           # Punto de entrada
├── dist/                  # Código compilado (gitignored)
├── .env                   # Variables de entorno (gitignored)
├── .env.example           # Ejemplo de variables
├── package.json
└── tsconfig.json
```

## 🌐 Variables de Entorno

### Requeridas

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Secreto para firmar tokens JWT

### Opcionales

- `PORT`: Puerto del servidor (default: 4000)
- `FRONTEND_URL`: URL del frontend para CORS (default: http://localhost:3000)
- `SENDGRID_API_KEY`: API key de SendGrid para emails
- `EMAIL_FROM`: Email remitente para notificaciones
- `NODE_ENV`: Entorno (development/production)

## 🚨 Troubleshooting

### Error: "Cannot find module"

```bash
npm run db:generate
npm run build
```

### Error de conexión a la base de datos

Verifica que PostgreSQL esté corriendo y que `DATABASE_URL` sea correcta:
```bash
psql -d $DATABASE_URL
```

### Puerto 4000 ya en uso

Cambia el puerto en `.env`:
```env
PORT=5000
```

O mata el proceso que usa el puerto 4000:
```bash
# Linux/Mac
lsof -ti:4000 | xargs kill -9

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

## 📝 Notas de Desarrollo

### Hot Reload

El comando `npm run dev` usa `tsx` que soporta hot-reload automático.

### Prisma Studio

Para ver/editar la base de datos visualmente:
```bash
npx prisma studio
```

Abre el navegador en `http://localhost:5555`

### Logs

Los logs se muestran en consola. En producción, considera usar un servicio como:
- Datadog
- LogRocket
- Sentry

## 📄 Licencia

Propiedad de FolKode Group - El Arca Gym

## 👥 Equipo

Desarrollado por FolKode Group para El Arca Gym

