# 🚀 Guía de Despliegue en Render

Esta guía te ayudará a desplegar tu backend de El Arca Gym en Render (con base de datos PostgreSQL gratuita) y el frontend en Vercel.

## 📋 Tabla de Contenidos

1. [Preparación del Código](#preparación-del-código)
2. [Desplegar Backend en Render](#desplegar-backend-en-render)
3. [Configurar Base de Datos PostgreSQL](#configurar-base-de-datos-postgresql)
4. [Variables de Entorno](#variables-de-entorno)
5. [Desplegar Frontend en Vercel](#desplegar-frontend-en-vercel)
6. [Verificación y Pruebas](#verificación-y-pruebas)
7. [Troubleshooting](#troubleshooting)

---

## 1. Preparación del Código

### Backend

Los archivos ya están preparados para el despliegue:

- ✅ `package.json` actualizado con scripts de build y postinstall
- ✅ `.node-version` creado (especifica Node 20.19.0)
- ✅ `render.yaml` creado (opcional, para Blueprint)

### Asegúrate de tener el código en GitHub

```bash
# Verifica que estés en la rama deployment
git branch

# Añade y commitea los cambios de configuración
git add backend/package.json backend/.node-version backend/render.yaml
git commit -m "feat: configuración para despliegue en Render"

# Sube los cambios
git push origin deployment
```

---

## 2. Desplegar Backend en Render

### Opción A: Usando la Interfaz Web (Recomendado para principiantes)

1. **Ve a [Render](https://render.com/) y regístrate/inicia sesión**

2. **Crea un nuevo servicio Web**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio `el-arca-gym-manager`

3. **Configura el servicio:**
   - **Name:** `el-arca-gym-backend` (o el nombre que prefieras)
   - **Region:** Oregon (US West) o el más cercano a tu ubicación
   - **Branch:** `deployment` (o la rama que estés usando)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. **NO hagas click en "Create Web Service" todavía** - primero necesitamos configurar la base de datos

---

## 3. Configurar Base de Datos PostgreSQL

### Crear la Base de Datos

1. **En Render Dashboard, click en "New +" → "PostgreSQL"**

2. **Configura la base de datos:**
   - **Name:** `el-arca-gym-db`
   - **Database:** `el_arca_gym`
   - **User:** `el_arca_user` (se genera automáticamente)
   - **Region:** Mismo que el backend (Oregon)
   - **Plan:** Free

3. **Click en "Create Database"**

4. **Espera a que se cree** (toma unos 2-3 minutos)

5. **Copia la "Internal Database URL"** - la necesitarás para el backend

---

## 4. Variables de Entorno

### Backend en Render

Vuelve a la configuración del Web Service y añade las siguientes variables de entorno:

**Variables Requeridas:**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | [Internal Database URL copiada] | URL de conexión a PostgreSQL |
| `JWT_SECRET` | [genera uno aleatorio seguro] | Secreto para JWT (mínimo 32 caracteres) |
| `FRONTEND_URL` | `https://tu-app.vercel.app` | URL de tu frontend en Vercel |
| `PORT` | `4000` | Puerto (Render lo sobreescribe automáticamente) |
| `NODE_ENV` | `production` | Entorno de producción |

**Variables Opcionales (si usas SendGrid para emails):**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `SENDGRID_API_KEY` | [tu API key de SendGrid] | Para envío de emails |
| `EMAIL_FROM` | `notificaciones@tu-dominio.com` | Email remitente |

### Generar JWT_SECRET seguro

```bash
# Opción 1: Usar OpenSSL
openssl rand -base64 32

# Opción 2: Usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: En línea
# Ve a: https://www.grc.com/passwords.htm
```

### Ahora sí, crea el Web Service

- Click en "Create Web Service"
- Render comenzará a construir y desplegar automáticamente

---

## 5. Aplicar Migraciones de Base de Datos

Una vez que el backend esté desplegado:

### Opción A: Desde la Shell de Render (Recomendado)

1. **Ve a tu servicio web en Render**
2. **Click en "Shell" en el menú lateral**
3. **Ejecuta las migraciones:**

```bash
npx prisma migrate deploy
```

4. **Opcional: Ejecutar el seed para datos iniciales:**

```bash
npm run seed
```

### Opción B: Desde tu máquina local

```bash
# Exporta la DATABASE_URL de Render
export DATABASE_URL="[Internal Database URL de Render]"

# Ejecuta las migraciones
cd backend
npx prisma migrate deploy

# Opcional: Seed
npm run seed
```

---

## 6. Desplegar Frontend en Vercel

Como ya tienes Vercel conectado, solo necesitas configurar las variables de entorno:

### Variables de Entorno en Vercel

1. **Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Settings → Environment Variables**
3. **Añade:**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `VITE_API_URL` | `https://tu-backend.onrender.com` | URL del backend en Render |

4. **Redeploy el frontend:**
   - Ve a "Deployments"
   - Click en los tres puntos del último deployment
   - Click en "Redeploy"

---

## 7. Verificación y Pruebas

### Verificar Backend

1. **Abre la URL de tu backend en Render** (ej: `https://el-arca-gym-backend.onrender.com`)

2. **Prueba el endpoint de salud:**
```bash
curl https://tu-backend.onrender.com/api/health
```

3. **Verifica Swagger (documentación API):**
```
https://tu-backend.onrender.com/api-docs
```

### Verificar Frontend

1. **Abre tu app en Vercel** (ej: `https://tu-app.vercel.app`)

2. **Prueba el login y funcionalidades básicas**

### Prueba de Integración Completa

1. Intenta hacer login desde el frontend
2. Verifica que se puedan cargar datos (miembros, reservas, etc.)
3. Prueba crear/editar datos
4. Verifica notificaciones en tiempo real (WebSockets)

---

## 🔧 Troubleshooting

### Backend no inicia

**Error: "Cannot find module '/opt/render/project/src/backend/dist/index.js'"**

**CAUSA**: El Build Command no está compilando TypeScript correctamente.

**SOLUCIÓN**:
1. Ve a Render Dashboard → Tu servicio backend
2. Settings → Build & Deploy
3. Verifica que **Build Command** sea: `npm install && npm run build`
4. Si está diferente, cámbialo y guarda
5. Manual Deploy → "Clear build cache & deploy"

**Error: "Cannot find module" (otros casos)**
- Verifica que el build command incluya `npx prisma generate`
- Revisa los logs en Render Dashboard
- Verifica que `Root Directory` sea `backend` (no raíz del proyecto)

**Error: "Database connection failed"**
- Verifica que `DATABASE_URL` esté correctamente configurada
- Usa la "Internal Database URL" (no la External)
- Verifica que la base de datos esté en la misma región

### Frontend no conecta con Backend

**Error de CORS**
- Verifica que `FRONTEND_URL` en el backend coincida con la URL de Vercel
- Incluye el protocolo `https://`

**Error: "Network Error" o "Failed to fetch"**
- Verifica que `VITE_API_URL` en Vercel apunte al backend correcto
- Incluye el protocolo `https://`
- NO incluyas barra final `/`

### Migraciones no se aplican

**Error: "Migration failed"**
```bash
# En Render Shell, resetea la base de datos (CUIDADO: borra todos los datos)
npx prisma migrate reset --force

# Luego aplica las migraciones
npx prisma migrate deploy
```

### Backend se duerme (Free Plan)

Los servicios gratuitos de Render se duermen después de 15 minutos de inactividad:

- Primera request puede tardar 30-60 segundos
- Considera usar un servicio de ping (ej: UptimeRobot) para mantenerlo activo
- O actualiza al plan Starter ($7/mes)

---

## 📝 Notas Importantes

### Limitaciones del Plan Gratuito de Render

- ✅ 750 horas/mes (suficiente para 1 servicio 24/7)
- ⚠️ Se duerme después de 15 min de inactividad
- ✅ 100 GB de ancho de banda/mes
- ✅ PostgreSQL con 1 GB de almacenamiento
- ⚠️ Base de datos expira después de 90 días sin uso

### Limitaciones de Vercel (Free Plan)

- ✅ 100 GB de ancho de banda/mes
- ✅ Despliegues ilimitados
- ✅ HTTPS automático
- ✅ CDN global

### Costos si necesitas escalar

**Render:**
- Starter Plan: $7/mes (sin sleep, más recursos)
- PostgreSQL Starter: $7/mes (sin expiración)

**Vercel:**
- Pro Plan: $20/mes (más ancho de banda y funciones)

---

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando en:
- **Backend:** `https://tu-backend.onrender.com`
- **Frontend:** `https://tu-app.vercel.app`
- **API Docs:** `https://tu-backend.onrender.com/api-docs`

Si tienes problemas, revisa la sección de [Troubleshooting](#troubleshooting) o los logs en Render/Vercel.

---

## 🔗 Enlaces Útiles

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [PostgreSQL en Render](https://render.com/docs/databases)

