# ❌ Error: Cannot find module 'dist/index.js'

## 🔴 Error Completo

```
Error: Cannot find module '/opt/render/project/src/backend/dist/index.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    ...
Node.js v22.22.0
==> Exited with status 1
```

---

## 🎯 Causa del Problema

El **Build Command** en Render NO compiló el código TypeScript a JavaScript. 

Render solo ejecutó `npm install` pero faltó `npm run build`.

Sin `npm run build`, el directorio `dist/` nunca se crea, y cuando Render intenta ejecutar `npm start` (que ejecuta `node dist/index.js`), no encuentra el archivo.

---

## ✅ Solución (2 minutos)

### Paso 1: Corregir Build Command

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Selecciona tu servicio backend
3. Click en **"Settings"** (menú lateral)
4. Scroll hasta **"Build & Deploy"**
5. En **"Build Command"**, verifica que diga:

   ```bash
   npm install && npm run build
   ```

   **Si dice solo `npm install`, cámbialo a:**
   ```bash
   npm install && npm run build
   ```

6. Click **"Save Changes"**

### Paso 2: Redeploy con Cache Limpio

1. Ve a **"Manual Deploy"** (botón en la parte superior derecha)
2. Selecciona: **"Clear build cache & deploy"**
3. Click **"Deploy"**
4. Espera 5-10 minutos

---

## 🔍 Verificación

Una vez que termine el deploy, deberías ver en los logs:

```
==> Running build command 'npm install && npm run build'...
> backend@1.0.0 build
> npx prisma generate && tsc

✔ Generated Prisma Client...
==> Build successful 🎉
==> Running 'npm start'
> backend@1.0.0 start
> node dist/index.js

Servidor iniciado en puerto 10000
```

Si ves esto, ✅ **el problema está resuelto**.

---

## 📋 Comandos Correctos para Render

### Build Command (DEBE incluir ambos)
```bash
npm install && npm run build
```

Esto ejecuta:
1. `npm install` - Instala dependencias
2. Hook `postinstall` - Ejecuta `npx prisma generate` automáticamente
3. `npm run build` - Compila TypeScript → JavaScript en `dist/`

### Start Command
```bash
npm start
```

Esto ejecuta: `node dist/index.js`

---

## 🛠️ Verificar Localmente (Opcional)

Si quieres verificar que el build funciona antes de desplegar:

```bash
cd backend
rm -rf dist/
npm run build
ls -la dist/

# Deberías ver:
# dist/
#   index.js
#   controllers/
#   middleware/
#   routes/
#   etc.
```

---

## ⚠️ Otros Posibles Problemas Relacionados

### Si después de corregir aún falla:

**1. Verifica Root Directory**
- Debe ser: `backend`
- No debe ser: `.` (raíz) o `src`

**2. Verifica que package.json tenga:**
```json
{
  "scripts": {
    "build": "npx prisma generate && tsc",
    "start": "node dist/index.js",
    "postinstall": "npx prisma generate"
  }
}
```

**3. Verifica que tsconfig.json tenga:**
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

---

## 📞 ¿Sigue sin funcionar?

1. Revisa los **logs completos** en Render
2. Busca errores durante la compilación de TypeScript
3. Verifica que no haya errores de sintaxis en el código
4. Consulta [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md#troubleshooting)

---

## 🎯 Resumen

**Problema**: Falta compilación TypeScript  
**Causa**: Build Command incorrecto  
**Solución**: Build Command = `npm install && npm run build`  
**Tiempo**: 2 min para corregir + 5-10 min redeploy  

---

**Una vez corregido, tu backend debería iniciar correctamente! 🚀**

