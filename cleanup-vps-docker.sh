#!/bin/bash
# Script de limpieza completa para VPS - El Arca Gym Manager
# Ejecutar en el VPS como root

echo "========================================="
echo "ANÁLISIS DE ESPACIO EN DISCO - INICIAL"
echo "========================================="
df -h | grep -E '(Filesystem|/$)'
echo ""

echo "========================================="
echo "Top 10 directorios más grandes"
echo "========================================="
du -sh /* 2>/dev/null | sort -hr | head -10
echo ""

echo "========================================="
echo "ESTADO ACTUAL DE DOCKER"
echo "========================================="
docker system df
echo ""

echo "========================================="
echo "IMÁGENES DOCKER"
echo "========================================="
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

echo "========================================="
echo "CONTENEDORES (incluyendo detenidos)"
echo "========================================="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

echo "========================================="
echo "LIMPIEZA: Parando contenedores"
echo "========================================="
cd /opt/elarcagym
docker compose down

echo ""
echo "========================================="
echo "LIMPIEZA: Eliminando contenedores detenidos"
echo "========================================="
docker container prune -f

echo ""
echo "========================================="
echo "LIMPIEZA: Eliminando imágenes sin usar"
echo "========================================="
docker image prune -a -f

echo ""
echo "========================================="
echo "LIMPIEZA: Eliminando volúmenes no utilizados"
echo "========================================="
docker volume prune -f

echo ""
echo "========================================="
echo "LIMPIEZA: Eliminando redes no utilizadas"
echo "========================================="
docker network prune -f

echo ""
echo "========================================="
echo "LIMPIEZA: Eliminando build cache"
echo "========================================="
docker builder prune -a -f

echo ""
echo "========================================="
echo "LIMPIEZA: Logs de Docker"
echo "========================================="
# Truncar logs de contenedores
truncate -s 0 /var/lib/docker/containers/**/*-json.log 2>/dev/null || true
echo "Logs de contenedores truncados"

# Limpiar logs del sistema
journalctl --vacuum-size=100M
echo "Logs del sistema limpiados"

echo ""
echo "========================================="
echo "LIMPIEZA: Archivos temporales en /opt/elarcagym"
echo "========================================="
cd /opt/elarcagym

# Eliminar node_modules si existen (no deberían estar en producción)
if [ -d "backend/node_modules" ]; then
    echo "Eliminando backend/node_modules (no necesario en Docker)..."
    rm -rf backend/node_modules
fi

if [ -d "frontend/node_modules" ]; then
    echo "Eliminando frontend/node_modules (no necesario en Docker)..."
    rm -rf frontend/node_modules
fi

# Eliminar archivos de build locales
if [ -d "frontend/dist" ]; then
    echo "Eliminando frontend/dist (no necesario con Docker)..."
    rm -rf frontend/dist
fi

if [ -d "backend/dist" ]; then
    echo "Eliminando backend/dist (no necesario con Docker)..."
    rm -rf backend/dist
fi

# Eliminar archivos .log antiguos
find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null
echo "Archivos .log antiguos eliminados"

# Eliminar cache de npm/yarn si existe
rm -rf ~/.npm 2>/dev/null || true
rm -rf ~/.yarn 2>/dev/null || true
echo "Cache de npm/yarn eliminado"

echo ""
echo "========================================="
echo "LIMPIEZA: Archivos APT (si aplica)"
echo "========================================="
if command -v apt-get &> /dev/null; then
    apt-get clean
    apt-get autoclean
    apt-get autoremove -y
    echo "Cache APT limpiado"
fi

echo ""
echo "========================================="
echo "REINICIANDO SERVICIOS"
echo "========================================="
cd /opt/elarcagym
# Pullear las imágenes más recientes
docker compose pull

# Levantar solo los servicios necesarios
docker compose up -d

echo ""
echo "========================================="
echo "ESTADO FINAL DE DOCKER"
echo "========================================="
docker system df
echo ""

echo "========================================="
echo "ESPACIO EN DISCO - FINAL"
echo "========================================="
df -h | grep -E '(Filesystem|/$)'
echo ""

echo "========================================="
echo "CONTENEDORES ACTIVOS"
echo "========================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""

echo "========================================="
echo "IMÁGENES ACTUALES"
echo "========================================="
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

echo "✅ Limpieza completada!"
echo ""
echo "Resumen:"
echo "- Contenedores, imágenes y volúmenes no utilizados eliminados"
echo "- Build cache limpiado"
echo "- Logs antiguos truncados"
echo "- Archivos temporales eliminados"
echo "- Servicios reiniciados con las últimas imágenes"
