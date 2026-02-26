#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# import-alumnos-vps.sh
#
# Abre un túnel SSH hacia la VPS y ejecuta la importación de socios
# desde ALUMNOS-ARCAGYM.csv apuntando a la base de datos de producción.
#
# Lee la configuración de la VPS desde el archivo .env en la raíz del proyecto.
#
# Uso (desde backend/ o desde la raíz):
#   bash backend/scripts/import-alumnos-vps.sh
#   bash scripts/import-alumnos-vps.sh       # si ya estás en backend/
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
echo "  IMPORTACIÓN DE SOCIOS ALUMNOS-ARCAGYM → VPS CLOUD"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  Host VPS  : ${VPS_USER}@${VPS_HOST}:${VPS_PORT}"
echo "  DB        : ${DB_NAME}@localhost:${LOCAL_TUNNEL_PORT}"
echo ""

# ── Abrir túnel SSH ────────────────────────────────────────────────────────────
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

echo ""
echo "🚀 Ejecutando importación de socios..."
echo ""

# Cambiar al directorio backend para que las rutas relativas funcionen
cd "${SCRIPT_DIR}/.."

DATABASE_URL="$DB_URL" npx tsx scripts/import_alumnos_arcagym.ts
