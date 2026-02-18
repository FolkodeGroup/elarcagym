-- ============================================================
-- SCRIPT DE LIMPIEZA DE BASE DE DATOS - EL ARCA GYM
-- Conserva: ExerciseMaster, ExerciseCategory, User, Permission,
--           UserPermission, Config
-- Vacía: todos los demás modelos (socios, pagos, rutinas, ventas, etc.)
-- ============================================================
-- EJECUTAR PRIMERO UN BACKUP:
--   docker exec elarcagym-db-1 pg_dump -U postgres elarcagym > backup_antes_limpieza.sql
-- ============================================================

BEGIN;

-- 1. Tablas que dependen de Sale y Product (primero por FK)
TRUNCATE TABLE "SaleItem" CASCADE;
TRUNCATE TABLE "Sale" CASCADE;
TRUNCATE TABLE "Product" CASCADE;

-- 2. Tablas que dependen de Slot
TRUNCATE TABLE "Reservation" CASCADE;
TRUNCATE TABLE "Slot" CASCADE;

-- 3. Tablas que dependen de Routine/RoutineDay
TRUNCATE TABLE "ExerciseDetail" CASCADE;
TRUNCATE TABLE "RoutineDay" CASCADE;
TRUNCATE TABLE "Routine" CASCADE;

-- 4. Otras tablas dependientes de Member
TRUNCATE TABLE "HabitualSchedule" CASCADE;
TRUNCATE TABLE "ScheduleException" CASCADE;
TRUNCATE TABLE "BiometricLog" CASCADE;
TRUNCATE TABLE "Diet" CASCADE;
TRUNCATE TABLE "PaymentLog" CASCADE;

-- 5. Tabla Member (socios)
TRUNCATE TABLE "Member" CASCADE;

-- 6. Notificaciones de usuarios (no borra los Users)
TRUNCATE TABLE "Notification" CASCADE;

-- 7. Otras tablas independientes
TRUNCATE TABLE "Reminder" CASCADE;
TRUNCATE TABLE "Waitlist" CASCADE;
TRUNCATE TABLE "NutritionTemplate" CASCADE;

COMMIT;

-- Verificación: contar registros en tablas conservadas
SELECT 'ExerciseCategory' AS tabla, COUNT(*) AS registros FROM "ExerciseCategory"
UNION ALL
SELECT 'ExerciseMaster', COUNT(*) FROM "ExerciseMaster"
UNION ALL
SELECT 'User', COUNT(*) FROM "User"
UNION ALL
SELECT 'Permission', COUNT(*) FROM "Permission"
UNION ALL
SELECT 'UserPermission', COUNT(*) FROM "UserPermission"
UNION ALL
SELECT 'Config', COUNT(*) FROM "Config";
