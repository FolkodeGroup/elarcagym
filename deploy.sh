#!/bin/bash
# =============================================================================
# Script de Deploy para El Arca Gym - VPS
# =============================================================================
# Uso:
#   Primera vez:   ./deploy.sh setup
#   Deploy normal: ./deploy.sh
#   Solo Nginx:    ./deploy.sh nginx
#   Solo Docker:   ./deploy.sh docker
#   Seed DB:       ./deploy.sh seed
#   Logs:          ./deploy.sh logs
# =============================================================================

set -e

# Configuración
VPS_IP="168.197.49.120"
VPS_PORT="5173"
VPS_USER="root"
PROJECT_DIR="/opt/elarcagym"
DOMAIN="elarcagym.com.ar"

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
SCP_CMD="scp -P ${VPS_PORT}"

# =============================================================================
# Funciones
# =============================================================================

check_connection() {
    info "Verificando conexión con VPS..."
    if ${SSH_CMD} "echo 'OK'" &>/dev/null; then
        log "Conexión con VPS establecida"
    else
        error "No se puede conectar con el VPS. Verifica SSH."
        exit 1
    fi
}

setup_vps() {
    info "Configurando VPS por primera vez..."

    ${SSH_CMD} << 'REMOTE_SCRIPT'
    set -e
    
    echo "📦 Actualizando sistema..."
    apt update && apt upgrade -y
    
    echo "🐳 Instalando Docker..."
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    fi
    
    echo "🔧 Instalando Docker Compose..."
    if ! command -v docker compose &> /dev/null; then
        apt install -y docker-compose-plugin
    fi
    
    echo "🌐 Instalando Nginx..."
    apt install -y nginx certbot python3-certbot-nginx
    
    echo "🔥 Configurando firewall..."
    ufw allow 22/tcp
    ufw allow 5173/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    echo "📁 Creando directorio del proyecto..."
    mkdir -p /opt/elarcagym/backend
    mkdir -p /opt/elarcagym/frontend
    mkdir -p /opt/elarcagym/nginx
    
    echo "✅ VPS configurada correctamente"
REMOTE_SCRIPT

    log "Setup de VPS completado"
}

deploy_nginx() {
    info "Desplegando configuración de Nginx..."
    
    # Copiar configuración de Nginx
    ${SCP_CMD} nginx/elarcagym.conf ${VPS_USER}@${VPS_IP}:/etc/nginx/sites-available/elarcagym
    
    ${SSH_CMD} << 'REMOTE_SCRIPT'
    set -e
    
    # Activar la configuración
    ln -sf /etc/nginx/sites-available/elarcagym /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Verificar sintaxis
    if nginx -t; then
        systemctl reload nginx
        echo "✅ Nginx recargado correctamente"
    else
        echo "❌ Error en la configuración de Nginx"
        exit 1
    fi
REMOTE_SCRIPT
    
    log "Nginx desplegado correctamente"
}

deploy_ssl() {
    info "Obteniendo certificado SSL..."
    
    ${SSH_CMD} << REMOTE_SCRIPT
    set -e
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
    systemctl enable certbot.timer
    systemctl start certbot.timer
    echo "✅ SSL configurado"
REMOTE_SCRIPT

    log "SSL configurado correctamente"
}

deploy_docker() {
    info "Desplegando contenedores Docker..."
    
    # Copiar archivos necesarios
    ${SCP_CMD} docker-compose.yml ${VPS_USER}@${VPS_IP}:${PROJECT_DIR}/
    ${SCP_CMD} backend/.env ${VPS_USER}@${VPS_IP}:${PROJECT_DIR}/backend/.env 2>/dev/null || warn "backend/.env no encontrado (se usarán las variables de docker-compose)"
    
    ${SSH_CMD} << REMOTE_SCRIPT
    set -e
    cd ${PROJECT_DIR}
    
    echo "📥 Descargando últimas imágenes..."
    docker compose pull
    
    echo "🔄 Reiniciando contenedores..."
    docker compose up -d --force-recreate
    
    echo "⏳ Esperando a que los servicios estén listos..."
    sleep 10
    
    echo "📊 Estado de los contenedores:"
    docker compose ps
    
    echo ""
    echo "📋 Logs del backend (últimas 20 líneas):"
    docker logs elarca-backend --tail 20 2>&1 || true
    
    echo ""
    echo "📋 Logs del frontend (últimas 10 líneas):"
    docker logs elarca-frontend --tail 10 2>&1 || true
REMOTE_SCRIPT

    log "Contenedores Docker desplegados"
}

run_seed() {
    info "Ejecutando seed de la base de datos..."
    
    ${SSH_CMD} << REMOTE_SCRIPT
    set -e
    cd ${PROJECT_DIR}
    
    echo "🌱 Ejecutando migraciones..."
    docker exec elarca-backend npx prisma migrate deploy
    
    echo "👤 Ejecutando seed de usuarios..."
    docker exec elarca-backend node dist/seed-users.js 2>/dev/null || \
    docker exec elarca-backend npx tsx src/seed-users.ts 2>/dev/null || \
    echo "⚠️ No se pudo ejecutar seed de usuarios"
    
    echo "🏋️ Ejecutando seed de ejercicios..."
    docker exec elarca-backend node dist/seed-exercises.js 2>/dev/null || \
    docker exec elarca-backend npx tsx src/seed-exercises.ts 2>/dev/null || \
    echo "⚠️ No se pudo ejecutar seed de ejercicios"
    
    echo "✅ Seed completado"
REMOTE_SCRIPT

    log "Seed de base de datos completado"
}

show_logs() {
    info "Mostrando logs..."
    ${SSH_CMD} "cd ${PROJECT_DIR} && docker compose logs --tail 50 -f"
}

show_status() {
    info "Estado del sistema..."
    
    ${SSH_CMD} << REMOTE_SCRIPT
    echo "=== Docker Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "=== Nginx Status ==="
    systemctl status nginx --no-pager -l | head -5
    
    echo ""
    echo "=== Disk Usage ==="
    df -h / | tail -1
    
    echo ""
    echo "=== Memory ==="
    free -h | head -2
    
    echo ""
    echo "=== Docker Volumes ==="
    docker volume ls
REMOTE_SCRIPT
}

full_deploy() {
    check_connection
    deploy_docker
    deploy_nginx
    log "🎉 Deploy completo exitoso!"
    info "Verifica en: https://${DOMAIN}"
}

# =============================================================================
# Main
# =============================================================================

case "${1:-deploy}" in
    setup)
        check_connection
        setup_vps
        deploy_docker
        deploy_nginx
        deploy_ssl
        run_seed
        log "🎉 Setup completo! Verifica en: https://${DOMAIN}"
        ;;
    deploy)
        full_deploy
        ;;
    nginx)
        check_connection
        deploy_nginx
        ;;
    docker)
        check_connection
        deploy_docker
        ;;
    ssl)
        check_connection
        deploy_ssl
        ;;
    seed)
        check_connection
        run_seed
        ;;
    logs)
        check_connection
        show_logs
        ;;
    status)
        check_connection
        show_status
        ;;
    *)
        echo "Uso: $0 {setup|deploy|nginx|docker|ssl|seed|logs|status}"
        echo ""
        echo "  setup   - Configuración inicial completa del VPS"
        echo "  deploy  - Deploy completo (docker + nginx)"
        echo "  nginx   - Solo actualizar configuración de Nginx"
        echo "  docker  - Solo actualizar contenedores Docker"
        echo "  ssl     - Obtener/renovar certificado SSL"
        echo "  seed    - Ejecutar seed de base de datos"
        echo "  logs    - Ver logs en tiempo real"
        echo "  status  - Ver estado del sistema"
        exit 1
        ;;
esac
