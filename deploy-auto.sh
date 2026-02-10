#!/bin/bash
# =============================================================================
# Script de Deploy Automático para El Arca Gym
# =============================================================================
# Este script:
# 1. Hace commit y push a GitHub
# 2. Espera a que GitHub Actions construya las imágenes Docker
# 3. Fuerza a Watchtower a actualizar los contenedores en la VPS
# =============================================================================

set -e

# Configuración
VPS_IP="168.197.49.120"
VPS_PORT="5371"
VPS_USER="root"
PROJECT_DIR="/opt/elarcagym"
GITHUB_REPO="FolkodeGroup/elarcagym"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
error() { echo -e "${RED}[❌]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[ℹ️]${NC} $1"; }
step() { echo -e "${CYAN}[▶]${NC} $1"; }

SSH_CMD="ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP}"

# =============================================================================
# Funciones
# =============================================================================

check_git_status() {
    info "Verificando estado de Git..."
    
    if ! git diff-index --quiet HEAD --; then
        warn "Hay cambios sin commitear. Mostrando git status:"
        git status --short
        echo ""
        read -p "¿Deseas hacer commit de estos cambios? (s/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            read -p "Mensaje del commit: " commit_msg
            git add .
            git commit -m "$commit_msg"
            log "Commit realizado: $commit_msg"
        else
            error "Deploy cancelado. Commitea tus cambios primero."
        fi
    else
        log "No hay cambios pendientes de commit"
    fi
}

push_to_github() {
    info "Haciendo push a GitHub..."
    
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    if [ "$current_branch" != "main" ]; then
        warn "No estás en la rama main. Estás en: $current_branch"
        read -p "¿Deseas continuar de todos modos? (s/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            error "Deploy cancelado"
        fi
    fi
    
    git push origin $current_branch
    log "Push completado a origin/$current_branch"
    
    # Obtener el SHA del último commit
    COMMIT_SHA=$(git rev-parse --short HEAD)
    info "Último commit: $COMMIT_SHA"
}

wait_for_github_actions() {
    info "Esperando a que GitHub Actions construya las imágenes..."
    echo ""
    echo "  📋 Puedes ver el progreso en:"
    echo "  🔗 https://github.com/${GITHUB_REPO}/actions"
    echo ""
    
    step "Esperando 30 segundos antes de verificar..."
    sleep 30
    
    step "Verificando si el workflow está corriendo..."
    
    # Intentar verificar con gh CLI si está instalado
    if command -v gh &> /dev/null; then
        info "Verificando con GitHub CLI..."
        gh run list --limit 1 --branch main 2>/dev/null || warn "No se pudo verificar con gh CLI"
    else
        warn "GitHub CLI (gh) no está instalado. Esperando tiempo estimado..."
        info "Instalación de gh CLI: https://cli.github.com/"
    fi
    
    step "Esperando 3 minutos para que termine el build..."
    for i in {1..36}; do
        echo -ne "\r  ⏳ Tiempo transcurrido: $((i*5)) segundos / 180 segundos"
        sleep 5
    done
    echo ""
    
    log "Tiempo de espera completado"
}

force_watchtower_update() {
    info "Forzando actualización de contenedores en la VPS..."
    
    ${SSH_CMD} << 'REMOTE_SCRIPT'
    set -e
    
    echo "🔍 Verificando contenedores actuales..."
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    
    echo ""
    echo "🔄 Forzando actualización de Watchtower..."
    
    # Detener Watchtower temporalmente
    docker stop watchtower 2>/dev/null || true
    
    # Actualizar manualmente las imágenes
    cd /opt/elarcagym
    docker compose pull
    
    # Recrear los contenedores
    docker compose up -d --force-recreate backend frontend
    
    # Reiniciar Watchtower
    docker start watchtower 2>/dev/null || docker compose up -d watchtower
    
    echo ""
    echo "⏳ Esperando 10 segundos a que los servicios se estabilicen..."
    sleep 10
    
    echo ""
    echo "📊 Estado actualizado de los contenedores:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    
    echo ""
    echo "📋 Últimos logs del backend:"
    docker logs elarca-backend --tail 20 2>&1 || true
    
    echo ""
    echo "📋 Últimos logs del frontend:"
    docker logs elarca-frontend --tail 20 2>&1 || true
REMOTE_SCRIPT

    log "Actualización forzada completada"
}

verify_deployment() {
    info "Verificando despliegue..."
    
    ${SSH_CMD} << 'REMOTE_SCRIPT'
    set -e
    
    echo "🔍 Verificando que los servicios estén corriendo..."
    
    if docker ps | grep -q elarca-backend && docker ps | grep -q elarca-frontend; then
        echo "✅ Backend y Frontend están corriendo"
    else
        echo "❌ Algunos contenedores no están corriendo"
        exit 1
    fi
    
    echo ""
    echo "🌐 Verificando conectividad..."
    
    # Verificar backend
    if curl -s http://localhost:4000/health > /dev/null; then
        echo "✅ Backend responde en puerto 4000"
    else
        echo "⚠️ Backend no responde en health check"
    fi
    
    # Verificar frontend
    if curl -s http://localhost:4173 > /dev/null; then
        echo "✅ Frontend responde en puerto 4173"
    else
        echo "⚠️ Frontend no responde"
    fi
REMOTE_SCRIPT

    log "Verificación completada"
}

show_deployment_info() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              🚀 DEPLOY COMPLETADO EXITOSAMENTE             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  🌍 Sitio Web:  https://elarcagym.com.ar"
    echo "  📱 App:        https://www.elarcagym.com.ar"
    echo ""
    echo "  📊 Logs:       ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP}"
    echo "                 docker logs -f elarca-backend"
    echo "                 docker logs -f elarca-frontend"
    echo ""
    echo "  🔄 Watchtower: Actualización automática cada 5 minutos"
    echo ""
}

# =============================================================================
# SCRIPT PRINCIPAL
# =============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🚀 DEPLOY AUTOMÁTICO - EL ARCA GYM MANAGER         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

step "Paso 1/6: Verificando estado de Git"
check_git_status

step "Paso 2/6: Haciendo push a GitHub"
push_to_github

step "Paso 3/6: Esperando a que GitHub Actions construya las imágenes"
wait_for_github_actions

step "Paso 4/6: Forzando actualización en la VPS"
force_watchtower_update

step "Paso 5/6: Verificando despliegue"
verify_deployment

step "Paso 6/6: Mostrando información del deploy"
show_deployment_info

log "🎉 Deploy completado con éxito!"
