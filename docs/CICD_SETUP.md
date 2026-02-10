# Configuración de CI/CD para Docker Hub

Este documento explica cómo configurar la automatización completa para que cada push a las ramas `main` o `docker-setup` construya y suba automáticamente las imágenes a Docker Hub.

## Requisitos Previos

1. Cuenta en Docker Hub (https://hub.docker.com)
2. Repositorio en GitHub con permisos de administrador

## Paso 1: Crear Access Token en Docker Hub

1. Ve a Docker Hub y haz login
2. Click en tu avatar → **Account Settings**
3. Ve a **Security** → **New Access Token**
4. Dale un nombre descriptivo: `github-actions-elarca`
5. Permisos: Selecciona **Read, Write, Delete**
6. Click en **Generate**
7. **⚠️ IMPORTANTE**: Copia el token generado (solo se muestra una vez)

## Paso 2: Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (pestaña superior)
3. En el menú lateral: **Secrets and variables** → **Actions**
4. Click en **New repository secret**
5. Agrega los siguientes secrets:

### Secret 1: DOCKERHUB_USERNAME
- **Name**: `DOCKERHUB_USERNAME`
- **Value**: `dgimenezdeveloper` (tu usuario de Docker Hub)

### Secret 2: DOCKERHUB_TOKEN
- **Name**: `DOCKERHUB_TOKEN`
- **Value**: El token que copiaste en el Paso 1

## Paso 3: Verificar el Workflow

El archivo `.github/workflows/docker-publish.yml` ya está configurado y listo para usar.

**Triggers (cuándo se ejecuta):**
- Push a rama `main`
- Push a rama `docker-setup`
- Cuando cambian archivos en `backend/`, `frontend/`, `docker-compose.yml`, o el workflow mismo
- Manualmente desde GitHub (pestaña Actions)

**Qué hace el workflow:**
1. Construye la imagen del backend
2. Construye la imagen del frontend
3. Las sube a Docker Hub con el tag `latest`
4. También crea tags adicionales con el SHA del commit y el nombre de la rama
5. Usa cache para acelerar builds futuros

## Paso 4: Probar el Workflow

### Opción 1: Push a la rama
```bash
git add .
git commit -m "Test CI/CD workflow"
git push origin docker-setup
```

### Opción 2: Ejecución manual
1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Selecciona el workflow "Docker Build and Push"
4. Click en **Run workflow**
5. Selecciona la rama y click en **Run workflow**

## Paso 5: Monitorear la Ejecución

1. Ve a la pestaña **Actions** en GitHub
2. Verás el workflow en ejecución
3. Click en el workflow para ver los detalles y logs
4. Cuando termine (✅ checkmark verde), las imágenes estarán disponibles en Docker Hub

## Verificar las Imágenes en Docker Hub

1. Ve a https://hub.docker.com/u/dgimenezdeveloper
2. Deberías ver:
   - `el-arca-gym-manager-backend:latest`
   - `el-arca-gym-manager-frontend:latest`
3. También verás tags adicionales como `main-abc1234` (basados en el commit SHA)

## Uso Diario para Desarrolladores

### Cuando trabajes en código:

1. Haz tus cambios de código normalmente
2. Commit y push a `main` o `docker-setup`:
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push origin docker-setup
   ```
3. GitHub Actions construye y sube las imágenes automáticamente (tarda 3-5 minutos)
4. Otros devs pueden actualizar con:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

### Para usar la última versión en tu máquina:

```bash
# Descargar las últimas imágenes
docker-compose pull

# Reiniciar servicios con las nuevas imágenes
docker-compose up -d
```

## Versionado Semántico (Opcional pero Recomendado)

Para crear releases versionadas:

```bash
# Crear un tag de versión
git tag v1.0.0
git push origin v1.0.0
```

Para usar esto en el workflow, puedes agregar un trigger para tags en el archivo de workflow:

```yaml
on:
  push:
    branches:
      - main
      - docker-setup
    tags:
      - 'v*.*.*'
```

Y modificar los tags de las imágenes para incluir la versión del tag de git.

## Troubleshooting

### Error: "denied: requested access to the resource is denied"
- Verifica que el secret `DOCKERHUB_TOKEN` esté configurado correctamente
- Asegúrate de que el token tenga permisos de Write
- Verifica que el usuario sea correcto

### Error: "no basic auth credentials"
- El secret `DOCKERHUB_TOKEN` no está configurado o tiene un nombre incorrecto
- Debe llamarse exactamente `DOCKERHUB_TOKEN` (sensible a mayúsculas)

### El workflow no se ejecuta
- Verifica que el archivo esté en `.github/workflows/docker-publish.yml`
- Asegúrate de hacer push a `main` o `docker-setup`
- Revisa que modificaste archivos en `backend/` o `frontend/`

### Las imágenes no se suben
- Revisa los logs en la pestaña Actions
- Verifica que Docker Hub esté accesible
- Confirma que los nombres de las imágenes en el workflow coincidan con tu namespace en Docker Hub

## Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
