# 🚀 Guía de Deploy - El Arca Gym Manager

## Sistema Automático de Deploy

El proyecto cuenta con un sistema completamente automatizado de CI/CD que despliega cambios automáticamente a la VPS.

## 📋 Flujo de Deploy Automático

```
1. git push origin main
   ↓
2. GitHub Actions construye imágenes Docker
   ↓ (~3 minutos)
3. Push a Docker Hub
   ↓
4. Watchtower detecta nueva imagen
   ↓ (~5 minutos)
5. Actualización automática en VPS
   ✅ DEPLOY COMPLETO
```

## 🎯 Métodos de Deploy

### Opción 1: Deploy Automático Completo (Recomendado)

```bash
# Verificar configuración
./check-deploy.sh

# Deploy automático
./deploy-auto.sh
```

Este script:
- ✅ Hace commit y push a GitHub
- ✅ Espera a que GitHub Actions termine
- ✅ Fuerza actualización inmediata en VPS
- ✅ Verifica que todo funcione

### Opción 2: Deploy Manual Paso a Paso

```bash
# 1. Commitear y pushear cambios
git add .
git commit -m "tu mensaje"
git push origin main

# 2. Esperar ~3 minutos a que GitHub Actions construya las imágenes

# 3. Verificar en GitHub Actions
# https://github.com/FolkodeGroup/elarcagym/actions

# 4. Opción A: Esperar 5 minutos a que Watchtower actualice automáticamente

# 4. Opción B: Forzar actualización inmediata
ssh -p 5371 root@***REMOVED***
cd /opt/elarcagym
docker compose pull
docker compose up -d --force-recreate backend frontend
```

### Opción 3: Deploy Tradicional (Sin GitHub Actions)

```bash
# Ejecutar el script original
./deploy.sh
```
### Opción 4: Deploy actualización forzosa
# 1. Commitear cambios
git add .
git commit -m "tus cambios"

# 2. Push a GitHub
git push origin main

# 3. FORZAR actualización inmediata (sin esperar 5 min)
ssh -p 5371 root@***REMOVED*** 'cd /opt/elarcagym && docker compose pull && docker compose up -d --force-recreate'

## 🔧 Configuración Inicial

### Primera vez en una VPS nueva:

```bash
./deploy.sh setup
```

Esto configura:
- Docker y Docker Compose
- Nginx
- Firewall
- Estructura de directorios
- Certificados SSL

### Verificar configuración:

```bash
./check-deploy.sh
```

## 🐳 Docker Images

- **Backend**: `dgimenezdeveloper/el-arca-gym-manager-backend:latest`
- **Frontend**: `dgimenezdeveloper/el-arca-gym-manager-frontend:latest`

## 👀 Watchtower

Watchtower monitorea automáticamente las imágenes Docker y actualiza los contenedores cuando detecta nuevas versiones.

**Configuración**:
- 🔄 Intervalo de verificación: 5 minutos
- 🏷️ Solo actualiza contenedores con label `com.centurylinklabs.watchtower.enable=true`
- 🧹 Limpieza automática de imágenes antiguas
- 📊 Logs detallados

**Ver logs de Watchtower**:
```bash
ssh -p 5371 root@***REMOVED***
docker logs -f watchtower
```

## 🔐 GitHub Secrets Requeridos

Para que GitHub Actions funcione, configurar en:
`https://github.com/FolkodeGroup/elarcagym/settings/secrets/actions`

Secrets necesarios:
- `DOCKERHUB_USERNAME`: Usuario de Docker Hub
- `DOCKERHUB_TOKEN`: Token de acceso de Docker Hub

## 📊 Monitoreo

### Ver logs en producción:

```bash
# Conectar a VPS
ssh -p 5371 root@***REMOVED***

# Ver logs del backend
docker logs -f elarca-backend

# Ver logs del frontend
docker logs -f elarca-frontend

# Ver todos los contenedores
docker ps

# Ver uso de recursos
docker stats
```

### Verificar salud del sistema:

```bash
# Desde local
./check-deploy.sh

# En VPS
docker compose ps
curl http://localhost:4000/health
curl http://localhost:4173
```

## 🌐 URLs

- **Producción**: https://elarcagym.com.ar
- **GitHub Actions**: https://github.com/FolkodeGroup/elarcagym/actions
- **Docker Hub Backend**: https://hub.docker.com/r/dgimenezdeveloper/el-arca-gym-manager-backend
- **Docker Hub Frontend**: https://hub.docker.com/r/dgimenezdeveloper/el-arca-gym-manager-frontend

## 🐛 Troubleshooting

### Los cambios no se despliegan automáticamente

1. **Verificar que GitHub Actions se ejecutó**:
   ```bash
   # Si tienes gh CLI instalado:
   gh run list --workflow=docker-publish.yml --limit 5
   
   # O visitar: https://github.com/FolkodeGroup/elarcagym/actions
   ```

2. **Verificar que las imágenes se actualizaron**:
   - Backend: https://hub.docker.com/r/dgimenezdeveloper/el-arca-gym-manager-backend/tags
   - Frontend: https://hub.docker.com/r/dgimenezdeveloper/el-arca-gym-manager-frontend/tags

3. **Forzar actualización inmediata** :
   ```bash
   # Método 1: Usar el script
   ./deploy-auto.sh
   
   # Método 2: Manual en VPS
   ssh -p 5371 root@***REMOVED***
   cd /opt/elarcagym
   docker compose pull
   docker compose up -d --force-recreate
   ```

4. **Verificar logs de Watchtower**:
   ```bash
   ssh -p 5371 root@***REMOVED***
   docker logs watchtower --tail 50
   ```

### GitHub Actions falla

1. Verificar que los secretos estén configurados
2. Ver logs detallados en GitHub Actions
3. Verificar que las credenciales de Docker Hub sean válidas

### Watchtower no actualiza

1. Verificar que esté corriendo: `docker ps | grep watchtower`
2. Ver logs: `docker logs watchtower`
3. Reiniciar: `docker restart watchtower`

## 📝 Flujo de Trabajo Diario

```bash
# 1. Hacer cambios en el código
vim frontend/pages/MiComponente.tsx

# 2. Verificar configuración
./check-deploy.sh

# 3. Deploy automático
./deploy-auto.sh

# 4. Verificar en producción (después de 3-5 minutos)
curl https://elarcagym.com.ar
```

## ⚡ Comandos Rápidos

```bash
# Ver estado general
./check-deploy.sh

# Deploy completo automático
./deploy-auto.sh

# Ver logs del backend en producción
ssh -p 5371 root@***REMOVED*** 'docker logs -f --tail 100 elarca-backend'

# Ver logs del frontend en producción
ssh -p 5371 root@***REMOVED*** 'docker logs -f --tail 100 elarca-frontend'

# Reiniciar todos los servicios
ssh -p 5371 root@***REMOVED*** 'cd /opt/elarcagym && docker compose restart'

# Ver estado de contenedores
ssh -p 5371 root@***REMOVED*** 'docker ps'
```

## 🔄 Proceso de Rollback

Si necesitas volver a una versión anterior:

```bash
# En la VPS
ssh -p 5371 root@***REMOVED***
cd /opt/elarcagym

# Ver imágenes disponibles
docker images | grep el-arca-gym-manager

# Usar una versión específica (tag)
# Editar docker-compose.yml y cambiar :latest por :sha-xxxxxxx
# Luego:
docker compose up -d --force-recreate
```

## 📦 Estructura de Archivos de Deploy

```
.
├── deploy.sh              # Script original de deploy
├── deploy-auto.sh         # Deploy automático completo
├── check-deploy.sh        # Verificación de configuración
├── docker-compose.yml     # Configuración de contenedores
├── .github/
│   └── workflows/
│       └── docker-publish.yml  # CI/CD automatizado
└── DEPLOY.md             # Este archivo
```

---

**Última actualización**: 10 de febrero de 2026
