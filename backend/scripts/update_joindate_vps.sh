#!/usr/bin/env bash
# =============================================================================
# Script: Genera SQL de actualización de joinDate desde ALUMNOS-ARCAGYM.csv
# y lo ejecuta directamente en la VPS via SSH + docker exec
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CSV_FILE="$ROOT_DIR/docs/ALUMNOS-ARCAGYM.csv"

# Cargar .env
if [[ -f "$ROOT_DIR/../.env" ]]; then
  set -a; source "$ROOT_DIR/../.env"; set +a
fi

VPS_HOST="${VPS_HOST:?VPS_HOST no definido en .env}"
VPS_PORT="${VPS_PORT:-5371}"
DB_USER="${DB_USER:-elarcagym_user}"
DB_NAME="${DB_NAME:-elarcagym}"

echo "📂 CSV: $CSV_FILE"
echo "🌐 VPS: $VPS_HOST:$VPS_PORT"

if [[ ! -f "$CSV_FILE" ]]; then
  echo "❌ CSV no encontrado: $CSV_FILE"
  exit 1
fi

# Generar SQL
SQL_FILE="/tmp/update_joindate.sql"
cat > "$SQL_FILE" << 'SQLHEADER'
-- Auto-generated: Update joinDate from ALUMNOS-ARCAGYM.csv
-- Matches by phone number
BEGIN;

SQLHEADER

echo "📋 Procesando CSV..."

UPDATED=0
SKIPPED=0
WARNINGS=""

# Leer CSV (saltar header)
tail -n +2 "$CSV_FILE" | while IFS=',' read -r hora numero nombre febrero fecha_raw rest; do
  # Limpiar campos
  numero=$(echo "$numero" | tr -dc '0-9')
  nombre=$(echo "$nombre" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  fecha_raw=$(echo "$fecha_raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  
  # Saltar filas vacías
  if [[ -z "$numero" || -z "$nombre" ]]; then
    continue
  fi
  
  # Parsear fecha DD-MMM a 2026-MM-DD
  if [[ -z "$fecha_raw" ]]; then
    continue
  fi
  
  dia=$(echo "$fecha_raw" | sed 's/-.*//' | tr -dc '0-9')
  mes_str=$(echo "$fecha_raw" | sed 's/.*-//' | tr '[:upper:]' '[:lower:]')
  
  case "$mes_str" in
    ene) mes=01 ;;
    feb) mes=02 ;;
    mar) mes=03 ;;
    abr) mes=04 ;;
    may) mes=05 ;;
    jun) mes=06 ;;
    jul) mes=07 ;;
    ago) mes=08 ;;
    sep) mes=09 ;;
    oct) mes=10 ;;
    nov) mes=11 ;;
    dic) mes=12 ;;
    *) continue ;;
  esac
  
  # Quitar leading zeros para evitar interpretación octal
  dia=$((10#$dia))
  
  # Validar día (Feb 2026 tiene 28 días)
  if [[ "$mes" == "02" && "$dia" -gt 28 ]]; then
    dia=28
  fi
  
  # Pad day with zero
  dia=$(printf "%02d" "$dia")
  
  fecha="2026-${mes}-${dia}"
  
  # Generar UPDATE SQL matcheando por phone
  echo "UPDATE \"Member\" SET \"joinDate\" = '${fecha} 12:00:00' WHERE phone = '${numero}' AND \"joinDate\" > '2026-02-18 00:00:00';" >> "$SQL_FILE"
  
done

cat >> "$SQL_FILE" << 'SQLFOOTER'

-- Mostrar resultados
SELECT "firstName", "lastName", phone, "joinDate" FROM "Member" WHERE "joinDate" != '2026-02-18 21:58:40.95' ORDER BY "joinDate", "lastName";

COMMIT;
SQLFOOTER

echo ""
echo "📄 SQL generado en: $SQL_FILE"
echo "---"
head -30 "$SQL_FILE"
echo "..."
echo "---"
echo ""
echo "🚀 Ejecutando en VPS..."

# Copiar y ejecutar SQL en VPS
cat "$SQL_FILE" | ssh -p "$VPS_PORT" "root@${VPS_HOST}" \
  "docker exec -i elarca-postgres psql -U $DB_USER -d $DB_NAME"

echo ""
echo "✅ Actualización completada"
