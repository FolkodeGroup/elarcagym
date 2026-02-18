#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# import-members-vps.sh
#
# Abre un túnel SSH hacia la VPS, ejecuta el script de importación de socios
# apuntando a la base de datos de producción, y cierra el túnel al finalizar.
#
# Uso:
#   cd backend
#   bash scripts/import-members-vps.sh
#
# Requisitos:
#   - Acceso SSH a la VPS (clave en ~/.ssh/id_rsa o similar)
#   - npx / tsx disponibles en el PATH
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

VPS_HOST="***REMOVED***"
VPS_PORT="5371"
VPS_USER="root"

LOCAL_TUNNEL_PORT="15432"        # Puerto local libre para el túnel
REMOTE_POSTGRES_PORT="5433"      # Puerto expuesto por Docker en la VPS

DB_USER="elarcagym_user"
DB_PASS="***REMOVED***"
DB_NAME="elarcagym"

DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${LOCAL_TUNNEL_PORT}/${DB_NAME}"

TUNNEL_PID=""

cleanup() {
  if [[ -n "$TUNNEL_PID" ]]; then
    echo ""
    echo "🔌 Cerrando túnel SSH (PID $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "════════════════════════════════════════════════════════"
echo "  IMPORTACIÓN DE SOCIOS → BASE DE DATOS VPS CLOUD"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🔗 Abriendo túnel SSH: localhost:${LOCAL_TUNNEL_PORT} → ${VPS_HOST}:${REMOTE_POSTGRES_PORT}"

ssh -p "$VPS_PORT" \
    -L "${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" \
    -N -f \
    -o StrictHostKeyChecking=accept-new \
    -o ExitOnForwardFailure=yes \
    "${VPS_USER}@${VPS_HOST}"

# Capturar el PID del túnel recién creado
TUNNEL_PID=$(pgrep -n -f "ssh.*${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_POSTGRES_PORT}" 2>/dev/null || true)

if [[ -z "$TUNNEL_PID" ]]; then
  echo "❌ No se pudo determinar el PID del túnel. Comprobando conexión de todas formas..."
fi

# Esperar a que el túnel esté listo
echo "⏳ Esperando que el túnel esté listo..."
for i in $(seq 1 10); do
  if pg_isready -h localhost -p "$LOCAL_TUNNEL_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    echo "✅ Conexión a PostgreSQL establecida."
    break
  fi
  if [[ $i -eq 10 ]]; then
    echo "⚠️  pg_isready no está disponible o el puerto tarda en responder, continuando de todas formas..."
  fi
  sleep 1
done

echo ""
echo "🚀 Ejecutando script de importación..."
echo ""

DATABASE_URL="$DB_URL" npx tsx scripts/import_members_csv.ts

echo ""
echo "✅ Importación finalizada."
