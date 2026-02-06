# Guía de Dockerización - El Arca Gym Manager

Esta guía explica cómo usar Docker y Docker Compose para ejecutar la aplicación El Arca Gym Manager.

## Requisitos Previos

- Docker instalado (versión 20.10 o superior)
- Docker Compose instalado (versión 2.0 o superior)

## Estructura de Docker

El proyecto incluye:
- `docker-compose.yml`: Orquestación de todos los servicios
- `backend/Dockerfile`: Imagen del backend (Node.js + Express + Prisma)
- `frontend/Dockerfile`: Imagen del frontend (Vite + React)

## Servicios Incluidos

1. **PostgreSQL** (puerto 5433)
   - Base de datos principal
   - Usuario: `elarcagym_user`
   - Base de datos: `elarcagym`
   - Volumen persistente para datos

2. **Backend** (puerto 4000)
   - API Node.js con Express
   - Prisma ORM
   - WebSocket para notificaciones

3. **Frontend** (puerto 4173)
   - Interfaz React con Vite
   - Modo preview (producción)

## Uso Rápido

### Levantar todos los servicios

```bash
docker-compose up -d
```

### Ejecutar migraciones de base de datos

```bash
docker-compose exec backend npx prisma migrate deploy
```

### Ver logs de los servicios

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Solo PostgreSQL
docker-compose logs -f postgres
```

### Ver estado de los contenedores

```bash
docker-compose ps
```

### Detener los servicios

```bash
docker-compose down
```

### Detener y eliminar volúmenes (¡cuidado, elimina datos!)

```bash
docker-compose down -v
```

## Construir las Imágenes Manualmente

### Backend

```bash
docker build -t elarca-backend ./backend
```

### Frontend

```bash
docker build -t elarca-frontend ./frontend
```

## Ejecutar Contenedores Individuales

### Backend

```bash
docker run -d \
  --name elarca-backend \
  -p 4000:4000 \
  --env-file ./backend/.env \
  elarca-backend
```

### Frontend

```bash
docker run -d \
  --name elarca-frontend \
  -p 4173:4173 \
  --env-file ./frontend/.env \
  elarca-frontend
```

## Acceso a los Servicios

- **Frontend**: http://localhost:4173
- **Backend API**: http://localhost:4000
- **PostgreSQL**: http://localhost:5433

## Configuración de Variables de Entorno

### Backend (.env)

Asegúrate de tener un archivo `backend/.env` con:

```env
DATABASE_URL=postgresql://elarcagym_user:***REMOVED***@postgres:5432/elarcagym
NODE_ENV=production
FRONTEND_URL=http://localhost:4173
# ... otras variables necesarias
```

### Frontend (.env)

Asegúrate de tener un archivo `frontend/.env` con:

```env
VITE_API_URL=http://localhost:4000
# ... otras variables necesarias
```

## Troubleshooting

### El backend no se conecta a la base de datos

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker-compose ps postgres
   ```

2. Verifica las variables de entorno del backend:
   ```bash
   docker-compose exec backend env | grep DATABASE_URL
   ```

3. Reinicia el backend:
   ```bash
   docker-compose restart backend
   ```

### Las tablas no existen en la base de datos

Ejecuta las migraciones:
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Puerto 5432 ya está en uso

El docker-compose.yml está configurado para usar el puerto 5433 en el host para evitar conflictos con PostgreSQL local. Si aún tienes problemas, cambia el puerto en `docker-compose.yml`.

### Reconstruir imágenes tras cambios en el código

```bash
docker-compose up -d --build
```

## Comandos Útiles de Mantenimiento

### Entrar al contenedor del backend

```bash
docker-compose exec backend sh
```

### Entrar al contenedor del frontend

```bash
docker-compose exec frontend sh
```

### Conectarse a PostgreSQL

```bash
docker-compose exec postgres psql -U elarcagym_user -d elarcagym
```

### Ver volúmenes de Docker

```bash
docker volume ls | grep elarca
```

### Limpiar todo (contenedores, imágenes, volúmenes)

```bash
docker-compose down -v --rmi all
```

## Notas Importantes

1. **Persistencia de Datos**: Los datos de PostgreSQL se almacenan en un volumen Docker persistente (`postgres_data`). Si eliminas el volumen, perderás todos los datos.

2. **Archivos .env**: No se incluyen en la imagen Docker por seguridad. Debes tenerlos localmente.

3. **Prisma Client**: Se genera automáticamente durante el build de la imagen. Si cambias el schema de Prisma, deberás reconstruir la imagen.

4. **Migraciones**: Las migraciones NO se ejecutan automáticamente al iniciar los contenedores. Debes ejecutarlas manualmente con `docker-compose exec backend npx prisma migrate deploy`.

## Despliegue en Producción

Para despliegue en producción, considera:

1. Usar variables de entorno secretas gestionadas por tu plataforma de hosting
2. Configurar un dominio y HTTPS
3. Ajustar las URLs de frontend/backend según tu configuración
4. Revisar y optimizar los recursos de los contenedores
5. Configurar backups automáticos de la base de datos

## Subida a Docker Hub

### Login

```bash
docker login
```

### Tag de imágenes

```bash
docker tag elarca-backend tu-usuario/elarca-backend:latest
docker tag elarca-frontend tu-usuario/elarca-frontend:latest
```

### Push a Docker Hub

```bash
docker push tu-usuario/elarca-backend:latest
docker push tu-usuario/elarca-frontend:latest
```

## GitHub Container Registry (GHCR)

Alternativamente, puedes usar GitHub Container Registry:

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag
docker tag elarca-backend ghcr.io/tu-usuario/elarca-backend:latest
docker tag elarca-frontend ghcr.io/tu-usuario/elarca-frontend:latest

# Push
docker push ghcr.io/tu-usuario/elarca-backend:latest
docker push ghcr.io/tu-usuario/elarca-frontend:latest
```
