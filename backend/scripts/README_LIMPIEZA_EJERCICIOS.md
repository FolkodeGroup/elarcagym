# 🧹 Limpieza de Ejercicios Duplicados

Este directorio contiene scripts para limpiar y normalizar la base de datos de ejercicios del sistema.

## 📋 Problema que Resuelve

Con el tiempo, la base de datos puede acumular ejercicios duplicados debido a:
- Inconsistencias en mayúsculas/minúsculas ("Sentadilla" vs "SENTADILLA" vs "sentadilla")
- Variaciones con tildes ("Abdominales" vs "Abdominales")
- Nombres similares ingresados manualmente

Esto causa:
- ❌ Visualización inconsistente en la interfaz
- ❌ Dificultad para buscar ejercicios
- ❌ Confusión al asignar rutinas

## ✅ Solución

Los scripts en este directorio:
1. ✅ Convierten todos los nombres de ejercicios a **MAYÚSCULAS**
2. ✅ Detectan duplicados ignorando mayúsculas/minúsculas y tildes
3. ✅ Conservan un ejercicio por grupo y eliminan los demás
4. ✅ Actualizan automáticamente las referencias en rutinas
5. ✅ Proceso atómico (todo o nada) para evitar inconsistencias

## 🛠️ Scripts Disponibles

### 1. Script TypeScript (Recomendado) ⭐

**Archivo:** `clean_exercise_duplicates.ts`

**Ventajas:**
- ✅ Más legible y mantenible
- ✅ Usa Prisma (coherente con el resto del proyecto)
- ✅ Mensajes detallados y coloridos
- ✅ Validación automática post-limpieza

**Uso:**
```bash
cd backend
npx tsx scripts/clean_exercise_duplicates.ts
```

**Salida de ejemplo:**
```
🔄 Iniciando limpieza de ejercicios duplicados...

📊 Obteniendo todos los ejercicios...
   ✓ Total de ejercicios en BD: 120

🔍 Agrupando ejercicios duplicados...
   ✓ Grupos únicos: 80
   ✓ Grupos con duplicados: 15

📋 Ejercicios duplicados encontrados:
────────────────────────────────────────────────────────────

SENTADILLA (3 variantes):
   1. "Sentadilla" (ID: a1b2c3d4...)
   2. "SENTADILLA" (ID: e5f6g7h8...)
   3. "sentadilla" (ID: i9j0k1l2...)

PRESS DE BANCA (2 variantes):
   1. "Press de Banca" (ID: m3n4o5p6...)
   2. "PRESS DE BANCA" (ID: q7r8s9t0...)
...

🚀 Ejecutando limpieza en transacción atómica...

✅ Limpieza completada exitosamente!

📊 Resumen de cambios:
────────────────────────────────────────────────────────────
   • Ejercicios maestros actualizados: 80
   • Ejercicios duplicados eliminados: 40
   • Referencias en rutinas actualizadas: 156
────────────────────────────────────────────────────────────
```

### 2. Script SQL

**Archivo:** `clean_exercise_duplicates.sql`

**Ventajas:**
- ✅ Puede ejecutarse directamente en PostgreSQL
- ✅ Útil para administradores de base de datos
- ✅ No requiere dependencias de Node.js

**Uso:**
```bash
# Opción 1: Desde la línea de comandos
psql -U usuario -d nombre_base < scripts/clean_exercise_duplicates.sql

# Opción 2: Desde psql interactivo
psql -U usuario -d nombre_base
\i scripts/clean_exercise_duplicates.sql
```

**⚠️ IMPORTANTE:** El script SQL hace `ROLLBACK` por defecto para mayor seguridad.

Para aplicar los cambios permanentemente:
1. Revisa la salida del script
2. Si todo es correcto, edita el archivo y cambia la última línea:
   ```sql
   -- Cambia esto:
   ROLLBACK;
   
   -- Por esto:
   COMMIT;
   ```
3. Ejecuta nuevamente el script

## 🔄 Flujo del Proceso

```
┌─────────────────────────────────────────┐
│  1. Obtener ejercicios de ExerciseMaster│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Normalizar nombres para comparación │
│     (ignorar mayúsculas y tildes)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Agrupar duplicados                  │
│     Ej: "Sentadilla", "SENTADILLA"      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Para cada grupo:                    │
│     - Convertir nombre a MAYÚSCULAS     │
│     - Conservar el primero              │
│     - Marcar los demás para eliminar    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. Actualizar ExerciseDetail (rutinas) │
│     con los nuevos nombres              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. Actualizar nombre del ejercicio     │
│     que se conserva                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  7. Eliminar ejercicios duplicados      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  8. Verificar que no queden duplicados  │
└─────────────────────────────────────────┘
```

## 📊 Antes y Después

### Antes
```
ExerciseMaster:
- ID: 1, Nombre: "Sentadilla"
- ID: 2, Nombre: "SENTADILLA"
- ID: 3, Nombre: "sentadilla"
- ID: 4, Nombre: "Press de Banca"
- ID: 5, Nombre: "PRESS DE BANCA"

ExerciseDetail (rutinas):
- "Sentadilla"   (en rutina de Juan)
- "SENTADILLA"   (en rutina de María)
- "sentadilla"   (en rutina de Pedro)
- "Press de Banca" (en rutina de Ana)
```

### Después
```
ExerciseMaster:
- ID: 1, Nombre: "SENTADILLA"
- ID: 4, Nombre: "PRESS DE BANCA"

ExerciseDetail (rutinas):
- "SENTADILLA"   (en rutina de Juan)
- "SENTADILLA"   (en rutina de María)
- "SENTADILLA"   (en rutina de Pedro)
- "PRESS DE BANCA" (en rutina de Ana)
```

## 🔒 Seguridad

### Script TypeScript
- ✅ Usa transacciones de Prisma
- ✅ Si hay error, se revierten TODOS los cambios
- ✅ Validación post-limpieza automática

### Script SQL
- ✅ Todo dentro de un bloque `BEGIN; ... END;`
- ✅ `ROLLBACK` por defecto (debes cambiarlo manualmente a `COMMIT`)
- ✅ Usa tablas temporales que se eliminan al final

## 🧪 Testing

Para probar sin afectar producción:

1. **Backup de la base de datos:**
   ```bash
   pg_dump -U usuario nombre_base > backup_pre_limpieza.sql
   ```

2. **Ejecutar el script TypeScript:**
   ```bash
   npx tsx scripts/clean_exercise_duplicates.ts
   ```

3. **Verificar en la aplicación:**
   - Navega a la página de ejercicios
   - Verifica que no haya duplicados
   - Verifica que las rutinas existentes sigan funcionando

4. **Si algo sale mal:**
   ```bash
   psql -U usuario nombre_base < backup_pre_limpieza.sql
   ```

## ⚡ Recomendaciones

1. **Ejecutar en horario de bajo tráfico** (madrugada)
2. **Hacer backup** antes de ejecutar
3. **Usar el script TypeScript** (más seguro y con mejor feedback)
4. **Revisar la salida** antes de confirmar que todo está OK
5. **Verificar en la app** que todo funciona correctamente

## 📝 Logs

El script TypeScript genera logs detallados con:
- ✅ Total de ejercicios antes y después
- ✅ Lista de duplicados encontrados
- ✅ Cantidad de actualizaciones realizadas
- ✅ Verificación final de integridad

## 🐛 Troubleshooting

### Error: "PrismaClient needs to be constructed"
**Solución:** Asegúrate de tener la variable `DATABASE_URL` en `.env`

### Error: "Cannot find module '@prisma/client'"
**Solución:** 
```bash
cd backend
npm install
npx prisma generate
```

### Los cambios no se ven reflejados
**Solución:** Verifica que ejecutaste el script en el entorno correcto (dev/prod)

### El script encuentra 0 duplicados pero sé que existen
**Solución:** Verifica la normalización. El script ignora tildes y mayúsculas, pero NO espacios extras al inicio/final.

## 📞 Soporte

Si tienes problemas:
1. Revisa este README completo
2. Verifica los logs del script
3. Haz backup antes de cualquier ejecución
4. Contacta al equipo de desarrollo

---

**Última actualización:** Febrero 2026
