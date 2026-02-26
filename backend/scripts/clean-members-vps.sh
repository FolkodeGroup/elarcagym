#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# clean-members-vps.sh
#
# Limpia TODOS los datos de socios de la base de datos en la VPS.
# Conserva: Users, Config, ExerciseCategories, ExerciseMaster, Products, NutritionTemplates.
#
# Lee la configuración de la VPS desde el archivo .env en la raíz del proyecto.
#
# Uso (desde la raíz del repositorio o desde backend/):
#   bash backend/scripts/clean-members-vps.sh
#   bash scripts/clean-members-vps.sh       # si ya estás en backend/
#
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Localizar el .env raíz ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ No se encontró el archivo .env en: ${ENV_FILE}"
  exit 1
fi

# Cargar variables del .env (solo las que nos interesan)
# shellcheck disable=SC2046
export $(grep -E '^(VPS_HOST|VPS_PORT|VPS_USER|LOCAL_TUNNEL_PORT|REMOTE_POSTGRES_PORT|DB_USER|DB_PASS|DB_NAME)=' "$ENV_FILE" | sed 's/#.*//' | xargs)

VPS_HOST="${VPS_HOST:?VPS_HOST no definido en .env}"
VPS_PORT="${VPS_PORT:-22}"
VPS_USER="${VPS_USER:-root}"
LOCAL_TUNNEL_PORT="${LOCAL_TUNNEL_PORT:-15432}"
REMOTE_POSTGRES_PORT="${REMOTE_POSTGRES_PORT:-5433}"
DB_USER="${DB_USER:?DB_USER no definido en .env}"
DB_PASS="${DB_PASS:?DB_PASS no definido en .env}"
DB_NAME="${DB_NAME:?DB_NAME no definido en .env}"

TUNNEL_PID=""

cleanup_tunnel() {
  if [[ -n "$TUNNEL_PID" ]]; then
    echo ""
    echo "🔌 Cerrando túnel SSH (PID $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup_tunnel EXIT

echo "════════════════════════════════════════════════════════════════"
echo "  LIMPIEZA DE SOCIOS → BASE DE DATOS VPS CLOUD"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  Host VPS  : ${VPS_USER}@${VPS_HOST}:${VPS_PORT}"
echo "  DB        : ${DB_NAME} (usuario: ${DB_USER})"
echo ""
echo "⚠️  ATENCIÓN: Esta operación eliminará TODOS los socios, pagos,"
echo "   horarios, rutinas, biométricos y reservas existentes."
echo ""
read -rp "¿Confirmar? Escribí 'si' para continuar: " CONFIRM
if [[ "$CONFIRM" != "si" ]]; then
  echo "❌ Operación cancelada."
  exit 0
fi

# ── Abrir túnel SSH ────────────────────────────────────────────────────────────
echo ""
echo "🔗 Abriendo túnel SSH: localhost:${LOCAL_TUNNEL_PORT} → ${VPS_HOST}:${REMOTE_POSTGRES_PORT}"

ssh -p "$VPS_PORT" \
    -L "${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" \
    -N -f \
    -o StrictHostKeyChecking=accept-new \
    -o ExitOnForwardFailure=yes \
    "${VPS_USER}@${VPS_HOST}"

TUNNEL_PID=$(pgrep -n -f "ssh.*${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" 2>/dev/null || true)
[[ -z "$TUNNEL_PID" ]] && echo "⚠️  No se pudo capturar el PID del túnel, continuando..."

echo "⏳ Esperando que el túnel esté listo..."
for i in $(seq 1 10); do
  if pg_isready -h localhost -p "$LOCAL_TUNNEL_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    echo "✅ Conexión PostgreSQL establecida."
    break
  fi
  [[ $i -eq 10 ]] && echo "⚠️  Continuando sin pg_isready..."
  sleep 1
done

# ── SQL de limpieza ───────────────────────────────────────────────────────────
SQL=$(cat <<'EOSQL'
DO $$
BEGIN
  RAISE NOTICE 'Iniciando limpieza de datos de socios...';

  -- Desvincular ventas de socios (memberId opcional → NULL)
  UPDATE "Sale" SET "memberId" = NULL WHERE "memberId" IS NOT NULL;
  RAISE NOTICE 'Sales desvinculadas: %', (SELECT COUNT(*) FROM "Sale" WHERE "memberId" IS NULL);

  -- Desvincular reservas de socios (memberId opcional → NULL)
  UPDATE "Reservation" SET "memberId" = NULL WHERE "memberId" IS NOT NULL;

  -- Eliminar reservas (también borra sus slots si quedan sin reservas)
  DELETE FROM "Reservation";
  DELETE FROM "Slot";
  RAISE NOTICE 'Reservas y slots eliminados.';

  -- Eliminar lista de espera
  DELETE FROM "Waitlist";

  -- Eliminar notificaciones de socios (las de usuarios admin se mantienen via User)
  -- (las notificaciones están vinculadas a User, no a Member, así que no aplica)

  -- Eliminar socios (cascadea: HabitualSchedule, ScheduleException, BiometricLog,
  --   Routine → RoutineDay → ExerciseDetail, Diet, PaymentLog)
  DELETE FROM "Member";
  RAISE NOTICE 'Todos los socios y datos relacionados eliminados.';

  RAISE NOTICE '✅ Limpieza completada.';
END$$;

-- Verificación
SELECT
  (SELECT COUNT(*) FROM "Member")           AS members,
  (SELECT COUNT(*) FROM "HabitualSchedule") AS schedules,
  (SELECT COUNT(*) FROM "PaymentLog")       AS payments,
  (SELECT COUNT(*) FROM "Routine")          AS routines,
  (SELECT COUNT(*) FROM "BiometricLog")     AS biometrics,
  (SELECT COUNT(*) FROM "Reservation")      AS reservations;
EOSQL
)

echo ""
echo "🗑️  Ejecutando limpieza de base de datos..."
PGPASSWORD="$DB_PASS" psql \
  -h localhost \
  -p "$LOCAL_TUNNEL_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "$SQL"

echo ""
echo "✅ Limpieza completada exitosamente."
echo "   La base de datos está lista para importar nuevos socios."
