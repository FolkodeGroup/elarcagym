# ✅ Checklist de Despliegue Rápido

Usa este checklist para desplegar tu app en Render + Vercel.

## 📋 Antes de empezar

- [ ] Código subido a GitHub
- [ ] Backend verificado con `./check-deployment.sh`
- [ ] Frontend funcionando localmente

---

## 🗄️ PASO 1: Base de Datos en Render

1. [ ] Ve a [Render Dashboard](https://dashboard.render.com/)
2. [ ] Click en "New +" → "PostgreSQL"
3. [ ] Configura:
   - Name: `el-arca-gym-db`
   - Database: `el_arca_gym`
   - Region: Oregon (US West)
   - Plan: **Free**
4. [ ] Click "Create Database"
5. [ ] ⏰ Espera 2-3 minutos
6. [ ] 📋 **COPIA la "Internal Database URL"** (la necesitarás en el siguiente paso)

---

## 🚀 PASO 2: Backend en Render

1. [ ] En Render, click "New +" → "Web Service"
2. [ ] Conecta tu repositorio GitHub
3. [ ] Selecciona el repo `elarcagym`
4. [ ] Configura:
   - Name: `el-arca-gym-backend`
   - Region: Oregon (US West) - **MISMO QUE LA DB**
   - Branch: `deployment` (o tu rama principal)
   - Root Directory: `backend`
   - Runtime: Node
   - **Build Command**: `npm install && npm run build` ⚠️ **CRÍTICO - No olvides esto**
   - **Start Command**: `npm start`
   - Plan: **Free**

5. [ ] **Configura Variables de Entorno** (Click "Advanced"):

   ```
   DATABASE_URL = [pega la Internal Database URL del paso anterior]
   JWT_SECRET = [genera uno con: openssl rand -base64 32]
   FRONTEND_URL = https://tu-app.vercel.app
   NODE_ENV = production
   ```

6. [ ] Click "Create Web Service"
7. [ ] ⏰ Espera 5-10 minutos (primera vez tarda más)
8. [ ] 📋 **COPIA la URL del backend** (ej: `https://el-arca-gym-backend.onrender.com`)

---

## 🔧 PASO 3: Aplicar Migraciones

1. [ ] En Render, ve a tu servicio backend
2. [ ] Click en "Shell" (menú lateral)
3. [ ] Ejecuta:
   ```bash
   npx prisma migrate deploy
   ```
4. [ ] Espera a que termine ✓
5. [ ] (Opcional) Carga datos de prueba:
   ```bash
   npm run seed
   npm run seed:users
   ```

---

## 🌐 PASO 4: Frontend en Vercel

1. [ ] Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. [ ] Selecciona tu proyecto
3. [ ] Ve a "Settings" → "Environment Variables"
4. [ ] Añade variable:
   ```
   VITE_API_URL = https://el-arca-gym-backend.onrender.com
   ```
   ⚠️ **SIN barra final `/`**

5. [ ] Ve a "Deployments"
6. [ ] Click en "..." del último deployment → "Redeploy"
7. [ ] ⏰ Espera 2-3 minutos

---

## ✅ PASO 5: Verificación

### Backend

1. [ ] Abre: `https://tu-backend.onrender.com/api-docs`
   - Deberías ver la documentación Swagger

2. [ ] Prueba el endpoint de salud:
   ```bash
   curl https://tu-backend.onrender.com/api/health
   ```

### Frontend

1. [ ] Abre: `https://tu-app.vercel.app`
2. [ ] Intenta hacer login
3. [ ] Verifica que se carguen datos

### Integración

- [ ] Login funciona
- [ ] Datos se cargan correctamente
- [ ] Puedes crear/editar datos
- [ ] Notificaciones funcionan (si las usas)

---

## 🎉 ¡COMPLETADO!

Tu app está desplegada en:
- **Backend:** `https://tu-backend.onrender.com`
- **Frontend:** `https://tu-app.vercel.app`
- **API Docs:** `https://tu-backend.onrender.com/api-docs`

---

## ⚠️ Nota Importante

**El backend se dormirá después de 15 minutos sin uso** (plan gratuito).
- Primera request puede tardar 30-60 segundos
- Considera el plan Starter ($7/mes) si necesitas disponibilidad 24/7

---

## 🆘 Problemas Comunes

### Backend no inicia
- [ ] Revisa los logs en Render Dashboard
- [ ] Verifica que todas las variables de entorno estén configuradas
- [ ] Verifica que usaste la "Internal Database URL"

### Frontend no conecta
- [ ] Verifica que `VITE_API_URL` apunte al backend correcto
- [ ] Verifica que `FRONTEND_URL` en backend apunte al frontend correcto
- [ ] Ambas URLs deben incluir `https://`

### Error de CORS
- [ ] Verifica que `FRONTEND_URL` en el backend coincida exactamente con la URL de Vercel

### Migraciones fallan
- [ ] Usa la Shell de Render (no tu terminal local)
- [ ] Si persiste, intenta: `npx prisma migrate reset --force` (⚠️ borra datos)

---

## 📚 Documentación Completa

Para más detalles, consulta: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

