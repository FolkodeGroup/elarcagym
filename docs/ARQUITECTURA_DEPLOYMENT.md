# Move to docs/

## 📊 **Arquitectura Actual (Correcta)**
# 🏗️ Arquitectura de Deployment - El Arca Gym

## 📊 **Arquitectura Actual (Correcta)**

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS Servidor                         │
│                    ***REMOVED***:5173                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📁 /opt/elarcagym/                                          │
│  ├── docker-compose.yml        ← Única configuración         │
│  └── backend/.env              ← Variables secretas          │
│                                                               │
│  🐳 Contenedores Docker:                                     │
│  ├── elarca-frontend (puerto 4173)                           │
│  │   └── Imagen: dgimenezdeveloper/...-frontend:latest       │
│  ├── elarca-backend (puerto 4000)                            │
│  │   └── Imagen: dgimenezdeveloper/...-backend:latest        │
│  ├── elarca-postgres (puerto 5433→5432)                      │
│  └── watchtower (auto-update cada 5 min)                     │
│                                                               │
│  🌐 Nginx (reverse proxy):                                   │
│  ├── 443 → frontend:4173 (HTTPS)                             │
│  ├── 443/api → backend:4000 (HTTPS)                          │
│  └── Certificado SSL (Let's Encrypt)                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Lo que DEBE estar en el servidor:**

### `/opt/elarcagym/` (directorio principal)
- **`docker-compose.yml`** - Configuración de los contenedores
- **`backend/.env`** - Variables secretas (DB passwords, JWT_SECRET, etc.)

### Nginx
- **`/etc/nginx/sites-available/elarcagym`** - Configuración del reverse proxy
- **`/etc/ssl/`** - Certificados SSL de Let's Encrypt

---

## ❌ **Lo que NO debe estar en el servidor:**

- ~~Código fuente (App.tsx, components/, pages/, etc.)~~
- ~~node_modules/~~
- ~~package.json~~
- ~~Dockerfile~~
- ~~tsconfig.json~~
- ~~.env.production~~ (este va en las imágenes Docker)

**¿Por qué?** Porque usamos **Docker con imágenes pre-construidas** de DockerHub. El código ya está **compilado dentro de las imágenes**.

---

## 🔄 **Flujo de Deployment:**

```
1. Developer hace push a GitHub
         ↓
2. GitHub Actions CI/CD se activa
         ↓
3. Se construyen las imágenes Docker
   - Frontend: npm run build + Vite Preview
   - Backend: npm run build + compilación TS
         ↓
4. Imágenes se suben a DockerHub
   - dgimenezdeveloper/el-arca-gym-manager-frontend:latest
   - dgimenezdeveloper/el-arca-gym-manager-backend:latest
         ↓
5. Watchtower detecta nuevas imágenes (cada 5 min)
         ↓
6. Watchtower descarga y reinicia contenedores
         ↓
7. 🎉 Deploy automático completado
```

---

## 🔧 **Variables de Entorno:**

### Backend (.env en servidor)
```bash
# /opt/elarcagym/backend/.env
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secreto-super-seguro
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password
# ... otras variables secretas
```

### Frontend (.env.production en código fuente)
```bash
# frontend/.env.production (va en la imagen Docker)
VITE_API_URL=https://elarcagym.com.ar/api
VITE_APP_NAME=El Arca Gym
```

**Diferencia clave:**
- **Backend `.env`**: Variables SECRETAS que NO deben ir en Git ni DockerHub
- **Frontend `.env.production`**: Variables públicas que se compilan en el código JS (no son secretas)

---

## 🚨 **Problema Detectado:**

Tienes archivos de código fuente en `/srv/elarca-gym-manager/`:

```bash
/srv/elarca-gym-manager/frontend/
├── App.tsx              ❌ No debería estar
├── components/          ❌ No debería estar
├── contexts/            ❌ No debería estar
├── dist/                ❌ No debería estar
├── node_modules/        ❌ No debería estar
├── .env                 ❌ No se está usando
└── ...
```

**Esto es un RESTO de un deployment manual antiguo.**

---

## 🧹 **Solución:**

### 1. **Ejecutar script de limpieza:**
```bash
./cleanup-vps.sh
```

Este script:
- ✅ Hace backup de los `.env` actuales
- ✅ Compara con la configuración actual
- ✅ Elimina `/srv/elarca-gym-manager/`
- ✅ Verifica que `/opt/elarcagym/` esté correcto
- ✅ Confirma que los contenedores sigan funcionando

### 2. **Verificar deployment:**
```bash
./deploy.sh status
```

### 3. **De ahora en adelante:**
- **Solo usa** `./deploy.sh` para deployments
- **No copies** código fuente al servidor
- **Deja que** Docker + Watchtower se encarguen de todo

---

## 📝 **Comandos Útiles:**

```bash
# Deploy completo
./deploy.sh deploy

# Solo actualizar contenedores
./deploy.sh docker

# Ver logs en tiempo real
./deploy.sh logs

# Ver estado del sistema
./deploy.sh status

# Ejecutar seed de DB
./deploy.sh seed
```

---

## 🔒 **Seguridad:**

### ✅ **Buenas prácticas:**
1. Variables secretas solo en `/opt/elarcagym/backend/.env` (no en Git)
2. Código fuente solo en imágenes Docker (no en servidor)
3. Certificados SSL auto-renovados por certbot
4. Firewall configurado (solo puertos 22, 80, 443, 5173)
5. Watchtower actualiza automáticamente (sin intervención manual)

### ❌ **Evitar:**
1. Código fuente en el servidor
2. Variables secretas en docker-compose.yml
3. node_modules/ en producción
4. Deployments manuales (rsync, scp, etc.)

---

## 🎯 **Resumen:**

| Aspecto | Antes (Manual) | Ahora (Docker) |
|---------|---------------|----------------|
| **Código** | En servidor | En imágenes Docker |
| **Deploy** | rsync/scp manual | Watchtower automático |
| **Updates** | Manual | Cada 5 minutos (auto) |
| **Rollback** | Difícil | `docker compose down && docker compose up` |
| **Consistencia** | ❌ Puede variar | ✅ Siempre igual |
| **Seguridad** | ❌ Código expuesto | ✅ Solo contenedores |

---

## 📚 **Referencias:**

- [DOCKER_README.md](DOCKER_README.md) - Configuración Docker
- [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Resumen de deployment
- [CICD_SETUP.md](CICD_SETUP.md) - Pipeline CI/CD
- [deploy.sh](deploy.sh) - Script de deployment

---

**¿Preguntas frecuentes?**

**Q: ¿Por qué Watchtower no actualiza inmediatamente?**  
A: Watchtower revisa cada 5 minutos (300 segundos). Puedes forzar con `docker restart watchtower`.

**Q: ¿Cómo hago rollback si algo falla?**  
A: `docker tag dgimenezdeveloper/...:latest dgimenezdeveloper/...:v1.0` y luego `docker compose up -d`.

**Q: ¿Puedo ver logs de deployments anteriores?**  
A: `docker logs watchtower -n 100` para ver los últimos 100 logs.
