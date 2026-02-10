# ⚡ Configuración de Vercel para Frontend

## 📋 Configuración del Proyecto

### Variables de Entorno

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en **Settings** → **Environment Variables**
3. Añade la siguiente variable:

```
Variable name: VITE_API_URL
Value: https://tu-backend.onrender.com
```

**⚠️ Importante:**
- NO incluyas barra final `/` en la URL
- Usa `https://` (no `http://`)
- Esta variable debe apuntar a tu backend desplegado en Render

### Para los 3 Entornos

Puedes configurar la variable para diferentes entornos:

- **Production**: URL del backend en producción
- **Preview**: URL del backend de staging (si tienes)
- **Development**: `http://localhost:4000` (para desarrollo local)

O simplemente selecciona **todos los entornos** con la URL de producción.

---

## 🔧 Configuración del Build (Opcional)

Vercel detecta automáticamente que es un proyecto Vite, pero puedes verificar/configurar:

### Settings → General → Build & Development Settings

```
Framework Preset: Vite
Build Command: npm run build (o vite build)
Output Directory: dist
Install Command: npm install
```

### Root Directory

Si tu frontend no está en la raíz:
```
Root Directory: frontend
```

---

## 🚀 Redeploy Después de Cambios

Después de añadir/modificar variables de entorno:

1. Ve a **Deployments**
2. Click en `...` (tres puntos) del último deployment
3. Click en **Redeploy**
4. Espera ~2-3 minutos

---

## ✅ Verificación

### 1. Verifica que el frontend esté usando la variable

En la consola del navegador (F12), ejecuta:

```javascript
console.log(import.meta.env.VITE_API_URL);
```

Debería mostrar la URL de tu backend en Render.

### 2. Verifica la conexión con el backend

1. Abre tu app en Vercel
2. Abre las DevTools (F12) → Network
3. Intenta hacer login o cargar datos
4. Deberías ver requests a `https://tu-backend.onrender.com`

---

## 🔒 Dominios Personalizados (Opcional)

### Añadir tu propio dominio

1. Settings → Domains
2. Añade tu dominio (ej: `elarcagym.com`)
3. Sigue las instrucciones para configurar DNS
4. Vercel configurará HTTPS automáticamente

**Actualiza las variables de entorno:**
- Backend: `FRONTEND_URL` → `https://elarcagym.com`
- Vercel: `VITE_API_URL` permanece igual

---

## 🎨 Configuración Adicional

### Headers de Seguridad

Crea `vercel.json` en la raíz del frontend:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Redirects (si necesitas)

En `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "permanent": true
    }
  ]
}
```

---

## 📊 Monitoreo

### Analytics (Opcional)

1. Settings → Analytics
2. Habilita Vercel Analytics
3. Gratis hasta 100k page views/mes

### Logs

1. Ve a tu deployment
2. Click en **View Function Logs**
3. Verás logs en tiempo real

---

## 🔄 Despliegue Automático

Por defecto, Vercel despliega automáticamente cuando haces push a GitHub:

- **main/master** → Production
- **otras ramas** → Preview

### Desactivar auto-deploy (si quieres)

1. Settings → Git
2. Desmarca "Automatically deploy branches"

---

## 🆘 Troubleshooting

### El frontend no carga

**Verifica:**
1. Build exitoso en Vercel Dashboard
2. No hay errores en Function Logs
3. La ruta del output directory es correcta

### No conecta con el backend

**Verifica:**
1. `VITE_API_URL` está correctamente configurada
2. Backend está activo en Render
3. CORS configurado en el backend con la URL correcta de Vercel
4. No hay errores de red en la consola del navegador

### Cambios no se reflejan

1. Haz un hard refresh: `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac)
2. Verifica que se haya desplegado la versión correcta
3. Limpia la caché del navegador

---

## 📝 Ejemplo Completo

### Variables de Entorno en Vercel

```
VITE_API_URL=https://el-arca-gym-backend.onrender.com
```

### Variables de Entorno en Render (backend)

```
FRONTEND_URL=https://el-arca-gym.vercel.app
DATABASE_URL=[Internal Database URL]
JWT_SECRET=[generado con openssl rand -base64 32]
NODE_ENV=production
```

---

## ✨ ¡Todo Listo!

Tu frontend debería estar:
- ✅ Desplegado automáticamente desde GitHub
- ✅ Conectado al backend en Render
- ✅ Con HTTPS habilitado
- ✅ Distribución global via CDN

**URL:** `https://tu-app.vercel.app`

---

## 🔗 Enlaces Útiles

- [Vercel Docs](https://vercel.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel CLI](https://vercel.com/docs/cli)

