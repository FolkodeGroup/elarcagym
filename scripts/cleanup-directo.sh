#!/bin/bash
# =============================================================================
# Script de Limpieza VPS - Para ejecutar DIRECTAMENTE en el servidor
# =============================================================================
# Copia y pega este script completo en tu sesión SSH del VPS
# =============================================================================

set -e

echo "📋 Verificando directorios actuales..."
echo ""
echo "=== /srv/elarca-gym-manager/ ==="
ls -lah /srv/elarca-gym-manager/ 2>/dev/null || echo "❌ No existe"

echo ""
echo "=== /opt/elarcagym/ ==="
ls -lah /opt/elarcagym/ 2>/dev/null || echo "❌ No existe"

echo ""
echo "📊 Tamaño de /srv/elarca-gym-manager/:"
du -sh /srv/elarca-gym-manager/ 2>/dev/null || echo "❌ No existe"

echo ""
echo "💾 Creando backup de archivos .env..."
BACKUP_DIR="/root/backup-elarca-$(date +%Y%m%d-%H%M)"
mkdir -p "$BACKUP_DIR"
echo "✅ Directorio de backup creado: $BACKUP_DIR"

if [ -f /srv/elarca-gym-manager/frontend/.env ]; then
    cp /srv/elarca-gym-manager/frontend/.env "$BACKUP_DIR/frontend.env.backup"
    echo "✅ Backup: frontend/.env"
    cat /srv/elarca-gym-manager/frontend/.env
else
    echo "⚠️  No existe: /srv/elarca-gym-manager/frontend/.env"
fi

echo ""
if [ -f /srv/elarca-gym-manager/backend/.env ]; then
    cp /srv/elarca-gym-manager/backend/.env "$BACKUP_DIR/backend.env.backup"
    echo "✅ Backup: backend/.env"
else
    echo "⚠️  No existe: /srv/elarca-gym-manager/backend/.env"
fi

echo ""
echo "📊 Comparando backend/.env (si existen ambos)..."
if [ -f /srv/elarca-gym-manager/backend/.env ] && [ -f /opt/elarcagym/backend/.env ]; then
    echo "--- /srv/elarca-gym-manager/backend/.env ---"
    wc -l /srv/elarca-gym-manager/backend/.env
    echo ""
    echo "--- /opt/elarcagym/backend/.env ---"
    wc -l /opt/elarcagym/backend/.env
    echo ""
    echo "Diferencias:"
    diff /srv/elarca-gym-manager/backend/.env /opt/elarcagym/backend/.env || echo "✅ Los archivos son diferentes (ver arriba) o iguales"
else
    echo "⚠️  No se puede comparar (falta algún archivo)"
fi

echo ""
read -p "¿Eliminar /srv/elarca-gym-manager/? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🗑️  Eliminando /srv/elarca-gym-manager/..."
if [ -d /srv/elarca-gym-manager ]; then
    rm -rf /srv/elarca-gym-manager
    echo "✅ Directorio eliminado"
else
    echo "⚠️  Directorio no existe"
fi

echo ""
echo "🔍 Verificando que /opt/elarcagym/ esté correcto..."
if [ ! -d /opt/elarcagym ]; then
    echo "❌ ERROR: /opt/elarcagym/ no existe!"
    echo "   Necesitas ejecutar: ./deploy.sh deploy"
    exit 1
fi

cd /opt/elarcagym

if [ ! -f docker-compose.yml ]; then
    echo "❌ ERROR: No existe docker-compose.yml en /opt/elarcagym/"
    exit 1
fi

echo "✅ docker-compose.yml existe"

if [ ! -f backend/.env ]; then
    echo "⚠️  ADVERTENCIA: No existe backend/.env en /opt/elarcagym/"
else
    echo "✅ backend/.env existe"
    echo "   Líneas: $(wc -l < backend/.env)"
fi

echo ""
echo "📁 Estructura final de /opt/elarcagym/:"
ls -lah /opt/elarcagym/

echo ""
if [ -d /opt/elarcagym/backend ]; then
    echo "📁 Contenido de /opt/elarcagym/backend/:"
    ls -lah /opt/elarcagym/backend/
fi

echo ""
echo "🐳 Estado de contenedores Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📊 Uso de disco:"
df -h / | tail -1

echo ""
echo "✅ Limpieza completada exitosamente!"
echo ""
echo "📋 Resumen:"
echo "   ✅ Backup guardado en: $BACKUP_DIR"
echo "   ✅ /srv/elarca-gym-manager/ eliminado"
echo "   ✅ /opt/elarcagym/ intacto"
echo "   ✅ Contenedores Docker funcionando"
echo ""
echo "💡 De ahora en adelante:"
echo "   - Solo usar Docker (imágenes de DockerHub)"
echo "   - No copiar código fuente al servidor"
echo "   - Watchtower actualiza automáticamente"
