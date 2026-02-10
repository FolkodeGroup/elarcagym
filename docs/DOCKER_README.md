# Guía de Dockerización - El Arca Gym Manager

## 🏁 Primeros pasos para desarrolladores (Setup desde cero)

Sigue este orden para levantar el entorno y tener datos de ejemplo:

1. **Clona el repositorio y entra a la carpeta del proyecto**
   ```bash
   git clone <repo-url>
   cd elarcagym
   ```

2. **Crea los archivos `.env` si no existen**
   - Copia los ejemplos si están disponibles, o crea manualmente:
     - `backend/.env` (ver ejemplo más abajo)
     - `frontend/.env` (ver ejemplo más abajo)

3. **Descarga y levanta los servicios**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Ejecuta las migraciones de base de datos**
   Esto crea las tablas necesarias:
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

5. **Carga datos de ejemplo (usuarios y ejercicios)**
   Ejecuta los scripts de seed dentro del backend:
   ```bash
   docker-compose exec backend npx ts-node src/seed-users.ts
   docker-compose exec backend npx ts-node src/seed-exercises.ts
   ```

6. **Accede a la app**
   - Frontend: http://localhost:4173
   - Backend API: http://localhost:4000

---

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

### Opción 1: Usando Imágenes Pre-construidas de Docker Hub (Recomendado)

Esta opción es ideal para desarrollo rápido o deployments. Las imágenes ya están construidas y listas para usar.

```bash
# Descargar las últimas imágenes
docker-compose pull

# Levantar todos los servicios
docker-compose up -d
```

**Ventajas:**
- ✅ No necesitas construir nada localmente
- ✅ Más rápido - solo descarga las imágenes
- ✅ Todos los devs usan la misma versión
- ✅ Ideal para CI/CD y deployments

**Nota:** Asegúrate de tener acceso a las imágenes en Docker Hub o que sean públicas.

### Opción 2: Construyendo Localmente

Si necesitas construir las imágenes localmente (por ejemplo, para desarrollo con cambios no versionados):

```bash
# Construir y levantar
docker-compose up -d --build
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

### ¿Y si falta el archivo .env?

Por seguridad, los archivos `.env` no se suben al repositorio ni a Docker Hub. Si no existen, créalos manualmente siguiendo los ejemplos de abajo. Si hay un archivo `.env.example`, puedes copiarlo:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```


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

### Errores comunes y soluciones rápidas

- **El backend entra en bucle de reinicio y ves `Cannot find module '/app/dist/index.js'`:**
   - Solución: Asegúrate de que el build de backend se realiza correctamente. Si construyes localmente, ejecuta `npm install && npm run build` en la carpeta backend antes de construir la imagen. Si usas imágenes de Docker Hub, reporta el error.

- **Al ejecutar seed sale error `table ... does not exist`:**
   - Solución: Ejecuta primero las migraciones con `docker-compose exec backend npx prisma migrate deploy` y luego los scripts de seed.

- **No se suben los datos de la base de datos a Docker Hub:**
   - Docker solo sube la imagen, no los datos. Los datos de PostgreSQL se guardan en un volumen local. Si necesitas migrar datos reales entre entornos, haz un backup con `pg_dump` y restáuralo en el nuevo entorno.

- **Faltan archivos .env:**
   - Crea los archivos `.env` siguiendo los ejemplos de este documento.

- **El frontend o backend no responde:**
   - Verifica los logs con `docker-compose logs frontend` o `docker-compose logs backend`.


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

### Migrar datos reales de la base de datos

Si necesitas mover datos reales de un entorno a otro (por ejemplo, de una PC a otra):

1. Haz un backup en la PC original:
   ```bash
   docker-compose exec postgres pg_dump -U elarcagym_user -d elarcagym -F c -f /tmp/backup.dump
   docker cp elarca-postgres:/tmp/backup.dump ./backup_local.dump
   ```
2. Copia el archivo `backup_local.dump` a la nueva PC.
3. Restaura en la nueva base de datos:
   ```bash
   docker cp ./backup_local.dump elarca-postgres:/tmp/backup_local.dump
   docker-compose exec postgres pg_restore -U elarcagym_user -d elarcagym /tmp/backup_local.dump
   ```

---

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

## Workflow de Actualización de Imágenes

### Actualización Manual

Si necesitas actualizar las imágenes manualmente:

1. **Construir las imágenes localmente:**
   ```bash
   docker build -t dgimenezdeveloper/el-arca-gym-manager-backend:latest ./backend
   docker build -t dgimenezdeveloper/el-arca-gym-manager-frontend:latest ./frontend
   ```

2. **Login a Docker Hub:**
   ```bash
   docker login
   ```

3. **Push a Docker Hub:**
   ```bash
   docker push dgimenezdeveloper/el-arca-gym-manager-backend:latest
   docker push dgimenezdeveloper/el-arca-gym-manager-frontend:latest
   ```

4. **Actualizar en otros entornos:**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

### Actualización Automática con CI/CD

El proyecto está configurado con GitHub Actions para construir y subir imágenes automáticamente al hacer push a la rama `main` o `docker-setup`.

**📋 Para configurar CI/CD completo, consulta:** [CICD_SETUP.md](CICD_SETUP.md)

**Resumen rápido:**

1. **Configurar Secrets en GitHub:**
   - Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions
   - Agrega `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN`

2. **Cada vez que hagas push a main/docker-setup:**
   - GitHub Actions construye las imágenes automáticamente
   - Las sube a Docker Hub con el tag `latest`
   - Cualquier dev puede hacer `docker-compose pull` para obtener la última versión

3. **Ver el progreso:**
   - Ve a la pestaña **Actions** en GitHub
   - Monitorea el build en tiempo real

### Versionado de Imágenes

Para versionar tus imágenes (recomendado para producción):

```bash
# Tag con versión específica
docker tag dgimenezdeveloper/el-arca-gym-manager-backend:latest dgimenezdeveloper/el-arca-gym-manager-backend:v1.0.0
docker tag dgimenezdeveloper/el-arca-gym-manager-frontend:latest dgimenezdeveloper/el-arca-gym-manager-frontend:v1.0.0

# Push de ambas versiones
docker push dgimenezdeveloper/el-arca-gym-manager-backend:latest
docker push dgimenezdeveloper/el-arca-gym-manager-backend:v1.0.0
docker push dgimenezdeveloper/el-arca-gym-manager-frontend:latest
docker push dgimenezdeveloper/el-arca-gym-manager-frontend:v1.0.0
```

### Uso de Imágenes Versionadas

Modifica `docker-compose.yml` para usar una versión específica:

```yaml
backend:
  image: dgimenezdeveloper/el-arca-gym-manager-backend:v1.0.0
  # ...resto de config
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
