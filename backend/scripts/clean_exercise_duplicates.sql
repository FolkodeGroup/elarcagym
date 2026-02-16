-- ============================================================================
-- Script SQL para limpiar ejercicios duplicados
-- ============================================================================
-- Este script:
-- 1. Convierte todos los nombres de ejercicios a MAYÚSCULAS
-- 2. Detecta y elimina duplicados (ignorando tildes y mayúsculas)
-- 3. Actualiza las referencias en ExerciseDetail (rutinas)
-- 4. Usa transacciones para mantener consistencia
--
-- IMPORTANTE: Ejecutar en PostgreSQL 12+
-- Uso: psql -U usuario -d nombre_base < clean_exercise_duplicates.sql
-- ============================================================================

BEGIN;

-- Crear función para normalizar strings (remover tildes)
CREATE OR REPLACE FUNCTION normalize_text(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      translate(
        text_input,
        'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
        'aaaaeeeeiiiiooooouuuunaaaaeeeeiiiiooooouuuun'
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PASO 1: Crear tabla temporal con ejercicios y su versión normalizada
-- ============================================================================

DROP TABLE IF EXISTS temp_exercise_normalized;

CREATE TEMP TABLE temp_exercise_normalized AS
SELECT 
  id,
  name,
  "categoryId",
  UPPER(TRIM(name)) as name_uppercase,
  normalize_text(name) as name_normalized
FROM "ExerciseMaster";

-- ============================================================================
-- PASO 2: Identificar duplicados y seleccionar cuál conservar
-- ============================================================================

DROP TABLE IF EXISTS temp_exercises_to_keep;

CREATE TEMP TABLE temp_exercises_to_keep AS
SELECT DISTINCT ON (name_normalized)
  id as keep_id,
  name_normalized,
  name_uppercase as final_name,
  "categoryId"
FROM temp_exercise_normalized
ORDER BY name_normalized, id;

-- ============================================================================
-- PASO 3: Crear tabla con mapeo de nombres antiguos -> nombres nuevos
-- ============================================================================

DROP TABLE IF EXISTS temp_name_mapping;

CREATE TEMP TABLE temp_name_mapping AS
SELECT 
  ten.name as old_name,
  tek.final_name as new_name,
  tek.keep_id,
  ten.id as old_id
FROM temp_exercise_normalized ten
JOIN temp_exercises_to_keep tek ON ten.name_normalized = tek.name_normalized;

-- ============================================================================
-- REPORTES PRE-LIMPIEZA
-- ============================================================================

-- Mostrar estadísticas
DO $$
DECLARE
  total_exercises INT;
  unique_exercises INT;
  duplicate_count INT;
  total_in_routines INT;
BEGIN
  SELECT COUNT(*) INTO total_exercises FROM "ExerciseMaster";
  SELECT COUNT(*) INTO unique_exercises FROM temp_exercises_to_keep;
  duplicate_count := total_exercises - unique_exercises;
  SELECT COUNT(*) INTO total_in_routines FROM "ExerciseDetail";
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'ANÁLISIS PRE-LIMPIEZA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de ejercicios en ExerciseMaster: %', total_exercises;
  RAISE NOTICE 'Ejercicios únicos (normalizados): %', unique_exercises;
  RAISE NOTICE 'Duplicados a eliminar: %', duplicate_count;
  RAISE NOTICE 'Total de ejercicios en rutinas: %', total_in_routines;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- Mostrar grupos de duplicados
DO $$
DECLARE
  rec RECORD;
  counter INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'GRUPOS DE DUPLICADOS ENCONTRADOS:';
  RAISE NOTICE '───────────────────────────────────────────────────────────────';
  
  FOR rec IN (
    SELECT 
      name_normalized,
      final_name,
      COUNT(*) as duplicate_count,
      STRING_AGG('"' || name || '" (ID: ' || SUBSTRING(id::TEXT, 1, 8) || '...)', ', ') as variants
    FROM temp_exercise_normalized
    GROUP BY name_normalized, final_name
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, final_name
  )
  LOOP
    counter := counter + 1;
    RAISE NOTICE '';
    RAISE NOTICE '%: % (% variantes)', counter, rec.final_name, rec.duplicate_count;
    RAISE NOTICE '   Variantes: %', rec.variants;
  END LOOP;
  
  IF counter = 0 THEN
    RAISE NOTICE 'No se encontraron duplicados.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '───────────────────────────────────────────────────────────────';
END $$;

-- ============================================================================
-- PASO 4: Actualizar ExerciseDetail (rutinas) con nuevos nombres
-- ============================================================================

UPDATE "ExerciseDetail" ed
SET name = tnm.new_name
FROM temp_name_mapping tnm
WHERE ed.name = tnm.old_name
  AND ed.name != tnm.new_name;

-- ============================================================================
-- PASO 5: Actualizar nombres en ExerciseMaster (los que se van a conservar)
-- ============================================================================

UPDATE "ExerciseMaster" em
SET name = tek.final_name
FROM temp_exercises_to_keep tek
WHERE em.id = tek.keep_id
  AND em.name != tek.final_name;

-- ============================================================================
-- PASO 6: Eliminar ejercicios duplicados
-- ============================================================================

DELETE FROM "ExerciseMaster"
WHERE id NOT IN (SELECT keep_id FROM temp_exercises_to_keep);

-- ============================================================================
-- REPORTES POST-LIMPIEZA
-- ============================================================================

DO $$
DECLARE
  total_exercises INT;
  total_in_routines INT;
  updated_routines INT;
  rec RECORD;
  counter INT := 0;
BEGIN
  SELECT COUNT(*) INTO total_exercises FROM "ExerciseMaster";
  SELECT COUNT(*) INTO total_in_routines FROM "ExerciseDetail";
  SELECT COUNT(*) INTO updated_routines 
  FROM temp_name_mapping 
  WHERE old_name != new_name;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'LIMPIEZA COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Ejercicios únicos finales: %', total_exercises;
  RAISE NOTICE 'Referencias actualizadas en rutinas: %', updated_routines;
  RAISE NOTICE 'Total de ejercicios en rutinas: %', total_in_routines;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'MUESTRA DE EJERCICIOS FINALES (primeros 10):';
  RAISE NOTICE '───────────────────────────────────────────────────────────────';
  
  FOR rec IN (
    SELECT name
    FROM "ExerciseMaster"
    ORDER BY name
    LIMIT 10
  )
  LOOP
    counter := counter + 1;
    RAISE NOTICE '%: %', counter, rec.name;
  END LOOP;
  
  IF total_exercises > 10 THEN
    RAISE NOTICE '... y % ejercicios más', total_exercises - 10;
  END IF;
  
  RAISE NOTICE '───────────────────────────────────────────────────────────────';
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL: Confirmar que no hay duplicados
-- ============================================================================

DO $$
DECLARE
  duplicate_check INT;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT normalize_text(name))
  INTO duplicate_check
  FROM "ExerciseMaster";
  
  RAISE NOTICE '';
  IF duplicate_check = 0 THEN
    RAISE NOTICE '✓ VERIFICACIÓN: No se encontraron duplicados';
  ELSE
    RAISE WARNING '⚠ ADVERTENCIA: Aún existen % duplicados', duplicate_check;
  END IF;
END $$;

-- ============================================================================
-- Limpiar tablas temporales
-- ============================================================================

DROP TABLE IF EXISTS temp_exercise_normalized;
DROP TABLE IF EXISTS temp_exercises_to_keep;
DROP TABLE IF EXISTS temp_name_mapping;

-- ============================================================================
-- IMPORTANTE: Revisar los cambios antes de hacer COMMIT
-- Si todo está correcto, ejecutar: COMMIT;
-- Si algo salió mal, ejecutar: ROLLBACK;
-- ============================================================================

-- DESCOMENTAR LA SIGUIENTE LÍNEA PARA CONFIRMAR LOS CAMBIOS:
-- COMMIT;

-- Por seguridad, el script hace ROLLBACK por defecto
-- Cambia esto a COMMIT cuando estés seguro
ROLLBACK;

RAISE NOTICE '';
RAISE NOTICE '⚠ IMPORTANTE: Los cambios NO se han guardado (ROLLBACK ejecutado)';
RAISE NOTICE 'Para aplicar los cambios permanentemente, edita el script y cambia ROLLBACK por COMMIT';
