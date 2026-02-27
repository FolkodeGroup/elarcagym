#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# reset-and-import-members-vps.sh
#
# Flujo completo:
#   1. Abre túnel SSH hacia la VPS
#   2. Hace un backup de la base de datos (pg_dump)
#   3. Limpia TODOS los socios (DELETE FROM "Member" CASCADE)
#   4. Importa el nuevo CSV ALUMNOS-ARCAGYM-1.csv
#   5. Muestra conteo final para verificación
#
# Uso:
#   cd backend
#   bash scripts/reset-and-import-members-vps.sh
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

DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${LOCAL_TUNNEL_PORT}/${DB_NAME}"

BACKUP_DIR="${REPO_ROOT}/backend/backups"
BACKUP_FILE="${BACKUP_DIR}/backup_antes_reset_$(date +%Y%m%d_%H%M%S).sql"
TUNNEL_PID=""

# ── Limpieza al salir ─────────────────────────────────────────────────────────
cleanup_tunnel() {
  if [[ -n "$TUNNEL_PID" ]]; then
    echo ""
    echo "🔌 Cerrando túnel SSH (PID $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup_tunnel EXIT

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  RESET + IMPORTACIÓN DE SOCIOS — EL ARCA GYM"
echo "  CSV: ALUMNOS-ARCAGYM-1.csv  |  Mes: Marzo 2026"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  Host VPS  : ${VPS_USER}@${VPS_HOST}:${VPS_PORT}"
echo "  DB        : ${DB_NAME}@localhost:${LOCAL_TUNNEL_PORT}"
echo "  Backup    : ${BACKUP_FILE}"
echo ""

# ── Advertencia ───────────────────────────────────────────────────────────────
echo "⚠️  ATENCIÓN: Este script eliminará TODOS los socios de la base de datos."
echo "   El backup se guardará en: ${BACKUP_FILE}"
echo ""
read -r -p "   ¿Confirmar? Escribí 'SI' para continuar: " CONFIRM
if [[ "$CONFIRM" != "SI" ]]; then
  echo "❌ Cancelado."
  exit 0
fi
echo ""

# ── Abrir túnel SSH ───────────────────────────────────────────────────────────
echo "🔗 Abriendo túnel SSH: localhost:${LOCAL_TUNNEL_PORT} → ${VPS_HOST}:${REMOTE_POSTGRES_PORT}"

# Matar cualquier túnel previo en ese puerto
pkill -f "ssh.*${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" 2>/dev/null || true
sleep 1

ssh -p "$VPS_PORT" \
    -L "${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" \
    -N -f \
    -o StrictHostKeyChecking=accept-new \
    -o ExitOnForwardFailure=yes \
    "${VPS_USER}@${VPS_HOST}"

TUNNEL_PID=$(pgrep -n -f "ssh.*${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" 2>/dev/null || true)
[[ -z "$TUNNEL_PID" ]] && echo "⚠️  No se pudo capturar PID del túnel."

echo "⏳ Esperando que el túnel esté listo..."
for i in $(seq 1 12); do
  if PGPASSWORD="$DB_PASS" psql -h localhost -p "$LOCAL_TUNNEL_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" -q > /dev/null 2>&1; then
    echo "✅ Conexión PostgreSQL establecida."
    break
  fi
  [[ $i -eq 12 ]] && { echo "❌ No se pudo conectar al PostgreSQL. Verificá el túnel."; exit 1; }
  sleep 1
done
echo ""

# ── PASO 1: Backup ────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "  PASO 1/4 — Backup de la base de datos"
echo "════════════════════════════════════════════════════════════════"

mkdir -p "$BACKUP_DIR"

PGPASSWORD="$DB_PASS" pg_dump \
  -h localhost \
  -p "$LOCAL_TUNNEL_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  -f "$BACKUP_FILE"

echo "✅ Backup guardado: ${BACKUP_FILE}"
ls -lh "$BACKUP_FILE"
echo ""

# ── PASO 2: Contar socios actuales ────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "  PASO 2/4 — Conteo previo a la limpieza"
echo "════════════════════════════════════════════════════════════════"

PREV_COUNT=$(PGPASSWORD="$DB_PASS" psql \
  -h localhost -p "$LOCAL_TUNNEL_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -t -c 'SELECT COUNT(*) FROM "Member";' | tr -d '[:space:]')

echo "  Socios en DB ahora : ${PREV_COUNT}"
echo ""

# ── PASO 3: Limpiar socios ────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "  PASO 3/4 — Limpieza de socios (CASCADE)"
echo "════════════════════════════════════════════════════════════════"

PGPASSWORD="$DB_PASS" psql \
  -h localhost -p "$LOCAL_TUNNEL_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -c 'DELETE FROM "Member";' \
  -c 'SELECT COUNT(*) AS socios_restantes FROM "Member";'

echo "✅ Tabla Member limpiada."
echo ""

# ── PASO 4: Importar nuevo CSV ────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo "  PASO 4/4 — Importación desde ALUMNOS-ARCAGYM-1.csv"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd "${SCRIPT_DIR}/.."

DATABASE_URL="$DB_URL" npx tsx scripts/import_alumnos_arcagym.ts

# ── Verificación final ────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  VERIFICACIÓN FINAL"
echo "════════════════════════════════════════════════════════════════"

PGPASSWORD="$DB_PASS" psql \
  -h localhost -p "$LOCAL_TUNNEL_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -c 'SELECT
        COUNT(*) AS total_socios,
        COUNT(*) FILTER (WHERE status = '"'"'ACTIVE'"'"')   AS activos,
        COUNT(*) FILTER (WHERE phase = '"'"'DATOS_INCOMPLETOS'"'"') AS incompletos
      FROM "Member";'

echo ""
echo "🎉 Proceso completado exitosamente."
echo "   Socios previos eliminados : ${PREV_COUNT}"
echo "   Backup disponible en      : ${BACKUP_FILE}"
echo ""
