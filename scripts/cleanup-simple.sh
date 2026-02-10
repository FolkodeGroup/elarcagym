#!/bin/bash
# Script de limpieza rápida del VPS

set -e

VPS_IP="***REMOVED***"
VPS_PORT="5173"
VPS_USER="root"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✅]${NC} $1"; }
info() { echo -e "${BLUE}[ℹ️]${NC} $1"; }

SSH_CMD="ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP}"

info "🧹 Ejecutando limpieza del VPS..."

${SSH_CMD} << 'ENDSSH'
set -e

echo "📋 Verificando directorios..."
echo ""
echo "=== /srv/elarca-gym-manager/ ==="
ls -lah /srv/elarca-gym-manager/ 2>/dev/null || echo "No existe"

echo ""
echo "=== /opt/elarcagym/ ==="
ls -lah /opt/elarcagym/ 2>/dev/null || echo "No existe"

echo ""
echo "💾 Creando backup..."
BACKUP_DIR="/root/backup-elarca-$(date +%Y%m%d-%H%M)"
mkdir -p "$BACKUP_DIR"

if [ -f /srv/elarca-gym-manager/frontend/.env ]; then
    cp /srv/elarca-gym-manager/frontend/.env "$BACKUP_DIR/frontend.env.backup"
    echo "✅ Backup de frontend/.env creado"
fi

if [ -f /srv/elarca-gym-manager/backend/.env ]; then
    cp /srv/elarca-gym-manager/backend/.env "$BACKUP_DIR/backend.env.backup"
    echo "✅ Backup de backend/.env creado"
    
    if [ -f /opt/elarcagym/backend/.env ]; then
        echo ""
        echo "📊 Comparando backend/.env:"
        diff "$BACKUP_DIR/backend.env.backup" /opt/elarcagym/backend/.env || echo "(Archivos diferentes o iguales)"
    fi
fi

echo ""
echo "🗑️  Eliminando /srv/elarca-gym-manager/..."
if [ -d /srv/elarca-gym-manager ]; then
    echo "Tamaño: $(du -sh /srv/elarca-gym-manager | cut -f1)"
    rm -rf /srv/elarca-gym-manager
    echo "✅ Directorio eliminado"
else
    echo "⚠️  Ya no existe"
fi

echo ""
echo "✅ Limpieza completada!"
echo "📦 Backup guardado en: $BACKUP_DIR"

echo ""
echo "📁 Contenido final de /opt/elarcagym/:"
ls -lah /opt/elarcagym/ 2>/dev/null || echo "No existe"

echo ""
echo "🐳 Contenedores Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker no disponible"
ENDSSH

log "🎉 Limpieza del VPS completada!"
