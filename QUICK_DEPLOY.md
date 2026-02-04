# 🚀 Despliegue Rápido - El Arca Gym

## 📦 Todo está listo para desplegar

### ✅ Verificación Completa
```bash
cd backend && ./check-deployment.sh
# ✓ Todo listo para desplegar
```

---

## 🎯 Pasos Inmediatos

### 1️⃣ Sube el código (2 minutos)

```bash
git add .
git commit -m "feat: configuración para despliegue en Render y Vercel"
git push origin deployment
```

### 2️⃣ Render - Base de Datos (5 minutos)

1. Ve a [Render](https://render.com) → New + → **PostgreSQL**
2. Configura:
   - Name: `el-arca-gym-db`
   - Region: **Oregon (US West)**
   - Plan: **Free**
3. Click "Create Database"
4. 📋 **COPIA la "Internal Database URL"**

### 3️⃣ Render - Backend (10 minutos)

1. Render → New + → **Web Service**
2. Conecta GitHub → Selecciona repo `elarcagym`
3. Configura:
   - Name: `el-arca-gym-backend`
   - Region: **Oregon (US West)**
   - Branch: `deployment`
   - Root Directory: `backend`
   - **Build Command**: `npm install && npm run build` ⚠️ IMPORTANTE
   - **Start Command**: `npm start`
   - Plan: **Free**

4. **Variables de Entorno**:
   ```
   DATABASE_URL = [pega la Internal Database URL]
   JWT_SECRET = [genera: openssl rand -base64 32]
   FRONTEND_URL = https://tu-app.vercel.app
   NODE_ENV = production
   ```

5. Click "Create Web Service"
6. Espera que termine el deploy
7. 📋 **COPIA la URL del backend**

### 4️⃣ Render - Migraciones (2 minutos)

1. En tu servicio → Click **Shell**
2. Ejecuta:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

### 5️⃣ Vercel - Frontend (3 minutos)

1. Ve a [Vercel](https://vercel.com/dashboard) → Tu proyecto
2. Settings → **Environment Variables**
3. Añade:
   ```
   VITE_API_URL = [URL del backend de Render]
   ```
   ⚠️ Sin barra final `/`

4. Deployments → ... → **Redeploy**

---

## ✅ Verificación (2 minutos)

### Backend
```bash
curl https://tu-backend.onrender.com/api-docs
```

### Frontend
Abre: `https://tu-app.vercel.app`
- Intenta login
- Verifica que carguen datos

---

## 📚 Si necesitas más detalles

- **Guía completa**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
- **Checklist detallado**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Config Vercel**: [VERCEL_CONFIG.md](./VERCEL_CONFIG.md)
- **Resumen completo**: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

---

## ⏱️ Tiempo Total: ~22 minutos

1. ⬆️ Git push: 2 min
2. 🗄️ Database: 5 min
3. 🚀 Backend: 10 min
4. 🔧 Migraciones: 2 min
5. 🌐 Frontend: 3 min

---

## 🎉 URLs Finales

- **Frontend**: `https://tu-app.vercel.app`
- **Backend**: `https://tu-backend.onrender.com`
- **API Docs**: `https://tu-backend.onrender.com/api-docs`

---

## 🆘 Problemas?

### Error: "Cannot find module '/opt/render/project/src/backend/dist/index.js'"
**Causa**: El Build Command no compiló TypeScript.

**Solución**:
1. Ve a Render → Tu servicio → Settings → Build & Deploy
2. Cambia **Build Command** a: `npm install && npm run build`
3. Click "Save Changes"
4. Manual Deploy → "Clear build cache & deploy"

### Otros problemas comunes:
1. Backend no inicia → Revisa logs en Render
2. Frontend no conecta → Verifica `VITE_API_URL` y `FRONTEND_URL`
3. CORS error → Verifica que las URLs coincidan exactamente

Ver [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md#troubleshooting) para más ayuda.

---

## ⚠️ Importante

- El backend se dormirá después de 15 min sin uso (plan free)
- Primera request puede tardar 30-60 segundos
- Database expira después de 90 días sin uso

---

**¡Éxito! 🚀**

