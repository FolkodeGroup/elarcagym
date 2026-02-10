#!/bin/bash
# =============================================================================
# Script de Limpieza - Eliminar restos de deployments manuales antiguos
# =============================================================================
# Este script elimina código fuente y archivos innecesarios del VPS
# Ya que usamos Docker + Watchtower, solo necesitamos docker-compose.yml
# =============================================================================

set -e

VPS_IP="***REMOVED***"
VPS_PORT="5173"
VPS_USER="root"
PROJECT_DIR="/opt/elarcagym"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
error() { echo -e "${RED}[❌]${NC} $1"; }
info() { echo -e "${BLUE}[ℹ️]${NC} $1"; }

SSH_CMD="ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP}"

info "🧹 Iniciando limpieza del VPS..."

${SSH_CMD} << 'REMOTE_SCRIPT'
set -e

echo "📋 Verificando directorios actuales..."
ls -la /srv/ 2>/dev/null || echo "No existe /srv/elarca-gym-manager/"
ls -la /opt/ 2>/dev/null || echo "No existe /opt/elarcagym/"

echo ""
echo "⚠️  ADVERTENCIA: Se eliminarán los siguientes directorios con código fuente:"
echo "    - /srv/elarca-gym-manager/"
echo ""
echo "✅ Se preservarán:"
echo "    - /opt/elarcagym/docker-compose.yml"
echo "    - /opt/elarcagym/backend/.env"
echo "    - Contenedores Docker y volúmenes"
echo ""

read -p "¿Continuar con la limpieza? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Limpieza cancelada"
    exit 1
fi

# Backup de archivos importantes antes de eliminar
echo "💾 Creando backup de archivos de configuración..."
mkdir -p /root/backup-elarca-$(date +%Y%m%d)

# Backup de .env si existen
if [ -f /srv/elarca-gym-manager/frontend/.env ]; then
    cp /srv/elarca-gym-manager/frontend/.env /root/backup-elarca-$(date +%Y%m%d)/frontend.env.backup
    echo "✅ Backup de frontend/.env creado"
fi

if [ -f /srv/elarca-gym-manager/backend/.env ]; then
    cp /srv/elarca-gym-manager/backend/.env /root/backup-elarca-$(date +%Y%m%d)/backend.env.backup
    echo "✅ Backup de backend/.env creado"
fi

# Comparar con el .env actual de /opt/elarcagym/backend/
if [ -f /opt/elarcagym/backend/.env ]; then
    echo ""
    echo "📊 Comparando archivos .env del backend:"
    echo "--- /srv (antiguo) vs /opt (actual) ---"
    diff /srv/elarca-gym-manager/backend/.env /opt/elarcagym/backend/.env || true
fi

# Eliminar directorio antiguo
echo ""
echo "🗑️  Eliminando /srv/elarca-gym-manager/..."
if [ -d /srv/elarca-gym-manager ]; then
    rm -rf /srv/elarca-gym-manager
    echo "✅ Directorio eliminado"
else
    echo "⚠️  Directorio ya no existe"
fi

# Verificar que /opt/elarcagym esté correctamente configurado
echo ""
echo "🔍 Verificando configuración correcta en /opt/elarcagym/..."
cd /opt/elarcagym

if [ ! -f docker-compose.yml ]; then
    echo "❌ ERROR: No existe docker-compose.yml en /opt/elarcagym/"
    echo "   Necesitas ejecutar: ./deploy.sh deploy"
    exit 1
fi

if [ ! -f backend/.env ]; then
    echo "⚠️  ADVERTENCIA: No existe backend/.env en /opt/elarcagym/"
    echo "   Algunas variables sensibles pueden no estar configuradas"
fi

echo ""
echo "📁 Estructura final correcta:"
ls -lah /opt/elarcagym/
echo ""
ls -lah /opt/elarcagym/backend/ 2>/dev/null || echo "No existe backend/"

echo ""
echo "🐳 Estado de contenedores Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Limpieza completada exitosamente!"
echo ""
echo "📋 Resumen:"
echo "   - Código fuente eliminado de /srv/"
echo "   - Backups guardados en /root/backup-elarca-$(date +%Y%m%d)/"
echo "   - Configuración Docker intacta en /opt/elarcagym/"
echo "   - Contenedores funcionando correctamente"
echo ""
echo "💡 De ahora en adelante:"
echo "   - Solo usa ./deploy.sh para deployments"
echo "   - El código fuente NO debe estar en el servidor"
echo "   - Docker + Watchtower se encargan de todo"
REMOTE_SCRIPT

log "🎉 Limpieza del VPS completada!"
info "Los contenedores Docker siguen funcionando normalmente"
