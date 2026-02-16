# 🧹 Sistema de Limpieza de Ejercicios Duplicados

## 📋 Resumen Ejecutivo

Sistema completo para normalizar y limpiar ejercicios duplicados en la base de datos, asegurando que todos los nombres estén en **MAYÚSCULAS** y sin duplicados.

## 🎯 Problema

La base de datos puede acumular ejercicios duplicados debido a inconsistencias en:
- Mayúsculas/minúsculas: `"Sentadilla"`, `"SENTADILLA"`, `"sentadilla"`
- Tildes: `"Abdominales"`, `"Abdominales"`
- Entrada manual de datos sin validación

**Impacto:**
- ❌ Visualización inconsistente en la interfaz
- ❌ Dificultad para buscar y asignar ejercicios
- ❌ Confusión entre entrenadores
- ❌ Datos desordenados en reportes

## ✅ Solución Implementada

### Características

1. **Normalización a MAYÚSCULAS**
   - Todos los ejercicios se convierten a mayúsculas
   - Mantiene las tildes correctamente
   - Ejemplo: `"Sentadilla"` → `"SENTADILLA"`

2. **Detección Inteligente de Duplicados**
   - Ignora diferencias de mayúsculas/minúsculas
   - Ignora tildes para comparación
   - Agrupa variantes del mismo ejercicio

3. **Reasignación Automática**
   - Actualiza referencias en rutinas existentes
   - No se pierden datos
   - Mantiene integridad referencial

4. **Proceso Atómico**
   - Todo dentro de una transacción
   - Si hay error, se revierten TODOS los cambios
   - Seguro para ejecutar en producción

## 📁 Archivos Creados

### Scripts de Limpieza

```
backend/scripts/
├── clean_exercise_duplicates.ts      # Script TypeScript (RECOMENDADO)
├── clean_exercise_duplicates.sql     # Script SQL alternativo
├── clean-exercises.sh                # Utilidad de ejecución con validaciones
└── README_LIMPIEZA_EJERCICIOS.md     # Documentación detallada
```

### Script TypeScript (Principal)

**Ubicación:** [backend/scripts/clean_exercise_duplicates.ts](../backend/scripts/clean_exercise_duplicates.ts)

**Características:**
- ✅ Usa Prisma (coherente con el proyecto)
- ✅ Transacciones automáticas
- ✅ Mensajes detallados con emojis y colores
- ✅ Validación post-limpieza
- ✅ Reportes antes y después

**Ejecución:**
```bash
cd backend
npx tsx scripts/clean_exercise_duplicates.ts
```

### Script SQL (Alternativo)

**Ubicación:** [backend/scripts/clean_exercise_duplicates.sql](../backend/scripts/clean_exercise_duplicates.sql)

**Características:**
- ✅ Ejecutable directamente en PostgreSQL
- ✅ ROLLBACK por defecto (seguro)
- ✅ Reportes detallados con RAISE NOTICE
- ✅ No requiere Node.js

**Ejecución:**
```bash
psql "$DATABASE_URL" < backend/scripts/clean_exercise_duplicates.sql
```

### Script de Utilidad

**Ubicación:** [backend/scripts/clean-exercises.sh](../backend/scripts/clean-exercises.sh)

**Características:**
- ✅ Validaciones de entorno
- ✅ Backup automático opcional
- ✅ Modo dry-run (simulación)
- ✅ Confirmación interactiva

**Ejecución:**
```bash
cd backend

# Ejecución normal (con confirmación)
./scripts/clean-exercises.sh

# Con backup automático
./scripts/clean-exercises.sh --backup

# Modo simulación (solo muestra qué haría)
./scripts/clean-exercises.sh --dry-run

# Automático sin confirmación
./scripts/clean-exercises.sh --auto
```

## 🔄 Flujo del Proceso

```
┌─────────────────────────────────────────┐
│  Inicio: Base de datos con duplicados   │
│  Ej: "Sentadilla", "SENTADILLA"         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Obtener todos los ExerciseMaster    │
│     Total: 120 ejercicios               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Normalizar para comparación         │
│     "Sentadilla" → "sentadilla" (norm)  │
│     "SENTADILLA" → "sentadilla" (norm)  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Agrupar por nombre normalizado      │
│     Grupos únicos: 80                   │
│     Grupos con duplicados: 15           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Crear nombre final en MAYÚSCULAS   │
│     Grupo "sentadilla" → "SENTADILLA"   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. TRANSACCIÓN ATÓMICA                 │
│  ┌─────────────────────────────────┐   │
│  │ 5a. Actualizar ExerciseDetail   │   │
│  │     (rutinas)                   │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 5b. Actualizar ExerciseMaster   │   │
│  │     conservados                 │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 5c. Eliminar duplicados         │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. Verificar resultado                 │
│     No duplicados: ✓                    │
│     Ejercicios únicos: 80               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Fin: Base de datos limpia              │
│  Todos en MAYÚSCULAS, sin duplicados    │
└─────────────────────────────────────────┘
```

## 📊 Ejemplo de Ejecución

### Salida del Script TypeScript

```bash
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

[... más duplicados ...]

────────────────────────────────────────────────────────────

📝 Obteniendo ejercicios en rutinas...
   ✓ Total de ejercicios en rutinas: 156

🚀 Ejecutando limpieza en transacción atómica...

✅ Limpieza completada exitosamente!

📊 Resumen de cambios:
────────────────────────────────────────────────────────────
   • Ejercicios maestros actualizados: 80
   • Ejercicios duplicados eliminados: 40
   • Referencias en rutinas actualizadas: 156
────────────────────────────────────────────────────────────

🔍 Verificando resultado final...
   ✓ No se encontraron duplicados
   ✓ Total de ejercicios únicos: 80

📝 Muestra de ejercicios finales (primeros 10):
────────────────────────────────────────────────────────────
   1. ABDOMINALES EN MÁQUINA
   2. ABDUCCIÓN DE CADERA
   3. ADDUCCIÓN DE CADERA
   4. APERTURAS CON MANCUERNAS
   5. BATTLE ROPE
   6. BICICLETA FIJA
   7. BURPEES
   8. PRESS DE BANCA
   9. SENTADILLA
   10. PESO MUERTO
   ... y 70 ejercicios más
────────────────────────────────────────────────────────────

🎉 Proceso completado con éxito!
```

## 🔒 Medidas de Seguridad

### 1. Backup Automático
```bash
# El script de utilidad puede crear backup automático
./scripts/clean-exercises.sh --backup

# O manualmente:
pg_dump "$DATABASE_URL" > backup_pre_limpieza.sql
```

### 2. Transacciones Atómicas
- Todo se ejecuta dentro de una transacción
- Si hay error, se revierten TODOS los cambios
- No quedan datos inconsistentes

### 3. Validación Post-Limpieza
- Verifica que no queden duplicados
- Cuenta ejercicios antes y después
- Muestra estadísticas detalladas

### 4. Modo Dry-Run
```bash
# Ver qué haría sin hacer cambios
./scripts/clean-exercises.sh --dry-run
```

### 5. Confirmación Interactiva
```bash
# Por defecto pide confirmación
./scripts/clean-exercises.sh

# Para automatizar (CI/CD)
./scripts/clean-exercises.sh --auto
```

## 📝 Casos de Uso

### 1. Limpieza Regular (Mantenimiento)

**Cuándo:** Después de importar datos masivos o periódicamente

```bash
cd backend
./scripts/clean-exercises.sh --backup
```

### 2. Pre-Producción (Testing)

**Cuándo:** Antes de desplegar a producción

```bash
cd backend
./scripts/clean-exercises.sh --dry-run  # Ver qué haría
./scripts/clean-exercises.sh --backup   # Ejecutar con backup
```

### 3. Automatización (CI/CD)

**Cuándo:** Como parte del proceso de deploy

```bash
cd backend
./scripts/clean-exercises.sh --auto --backup
```

### 4. Ejecución Directa en PostgreSQL

**Cuándo:** Mantenimiento de BD sin acceso a Node.js

```bash
psql "$DATABASE_URL" < backend/scripts/clean_exercise_duplicates.sql
# Revisar salida, luego editar el archivo y cambiar ROLLBACK por COMMIT
```

## 🧪 Testing

### Verificación Manual

1. **Ver estado actual:**
   ```sql
   SELECT name, COUNT(*) as count
   FROM "ExerciseMaster"
   GROUP BY LOWER(TRIM(name))
   HAVING COUNT(*) > 1;
   ```

2. **Ejecutar limpieza:**
   ```bash
   cd backend
   npx tsx scripts/clean_exercise_duplicates.ts
   ```

3. **Verificar resultado:**
   ```sql
   -- No debería retornar filas
   SELECT name, COUNT(*) as count
   FROM "ExerciseMaster"
   GROUP BY LOWER(TRIM(name))
   HAVING COUNT(*) > 1;
   
   -- Todos deberían estar en mayúsculas
   SELECT name
   FROM "ExerciseMaster"
   WHERE name != UPPER(name);
   ```

## 🛠️ Mantenimiento

### Prevenir Duplicados Futuros

**Backend:** Agregar validación en el controlador de ejercicios

```typescript
// Antes de crear un ejercicio
const normalizedName = name.toUpperCase().trim();
const existing = await prisma.exerciseMaster.findFirst({
  where: {
    name: normalizedName,
  },
});

if (existing) {
  throw new Error('El ejercicio ya existe');
}
```

**Frontend:** Convertir a mayúsculas en el formulario

```typescript
// En el componente de creación de ejercicios
<input
  value={exerciseName}
  onChange={(e) => setExerciseName(e.target.value.toUpperCase())}
/>
```

## 📚 Referencias

- [README Detallado](../backend/scripts/README_LIMPIEZA_EJERCICIOS.md)
- [Script TypeScript](../backend/scripts/clean_exercise_duplicates.ts)
- [Script SQL](../backend/scripts/clean_exercise_duplicates.sql)
- [Utilidad Shell](../backend/scripts/clean-exercises.sh)
- [Schema de Prisma](../backend/prisma/schema.prisma)

## 🤝 Contribuir

Para mejorar este sistema:

1. Probar el script en diferentes escenarios
2. Reportar bugs o casos edge
3. Sugerir mejoras en la normalización
4. Agregar más validaciones

## 📞 Soporte

Si encuentras problemas:
1. Revisa la [documentación detallada](../backend/scripts/README_LIMPIEZA_EJERCICIOS.md)
2. Verifica los logs del script
3. Haz backup antes de ejecutar
4. Contacta al equipo de desarrollo

---

**Creado:** Febrero 2026  
**Última actualización:** Febrero 2026  
**Versión:** 1.0.0
