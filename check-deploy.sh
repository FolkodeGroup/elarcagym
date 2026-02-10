#!/bin/bash
# =============================================================================
# Script de Verificación de Configuración de Deploy
# =============================================================================

set -e

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

VPS_IP="***REMOVED***"
VPS_PORT="5371"
VPS_USER="root"
SSH_CMD="ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP}"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          🔍 VERIFICACIÓN DE CONFIGURACIÓN DE DEPLOY        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar Git
echo "📦 Git Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" = "main" ]; then
    log "Estás en la rama main"
else
    warn "Estás en la rama: $current_branch (no es main)"
fi

if git diff-index --quiet HEAD --; then
    log "No hay cambios sin commitear"
else
    warn "Hay cambios sin commitear"
    git status --short
fi

remote_url=$(git remote get-url origin)
echo "  🔗 Remote URL: $remote_url"
echo ""

# 2. Verificar GitHub CLI
echo "🐙 GitHub CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v gh &> /dev/null; then
    log "GitHub CLI instalado"
    gh_version=$(gh --version | head -1)
    echo "  📌 Versión: $gh_version"
    
    if gh auth status &> /dev/null; then
        log "GitHub CLI autenticado"
    else
        warn "GitHub CLI NO autenticado. Ejecuta: gh auth login"
    fi
else
    warn "GitHub CLI no está instalado"
    echo "  💡 Instalar: https://cli.github.com/"
fi
echo ""

# 3. Verificar GitHub Actions
echo "🚀 GitHub Actions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f ".github/workflows/docker-publish.yml" ]; then
    log "Workflow de Docker encontrado"
    
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        info "Últimas 3 ejecuciones del workflow:"
        gh run list --workflow=docker-publish.yml --limit 3 2>/dev/null || warn "No se pudo obtener historial de workflows"
    fi
else
    error "Workflow de Docker NO encontrado"
fi
echo ""

# 4. Verificar secretos de GitHub (requiere gh CLI)
echo "🔐 GitHub Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v gh &> /dev/null && gh auth status &> /dev/null; then
    info "Verificando secretos configurados..."
    
    required_secrets=("DOCKERHUB_USERNAME" "DOCKERHUB_TOKEN")
    
    for secret in "${required_secrets[@]}"; do
        if gh secret list 2>/dev/null | grep -q "$secret"; then
            log "Secret configurado: $secret"
        else
            error "Secret NO configurado: $secret"
            echo "  💡 Configurar en: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/settings/secrets/actions"
        fi
    done
else
    warn "No se puede verificar secrets (gh CLI no disponible o no autenticado)"
fi
echo ""

# 5. Verificar Docker local
echo "🐳 Docker Local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v docker &> /dev/null; then
    log "Docker instalado"
    docker_version=$(docker --version)
    echo "  📌 Versión: $docker_version"
    
    if docker info &> /dev/null; then
        log "Docker daemon corriendo"
    else
        warn "Docker daemon NO está corriendo"
    fi
else
    error "Docker no está instalado"
fi
echo ""

# 6. Verificar conexión VPS
echo "🌐 Conexión VPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "Verificando conexión a $VPS_IP:$VPS_PORT..."
if ${SSH_CMD} "echo 'OK'" &>/dev/null; then
    log "Conexión SSH establecida"
    
    info "Verificando Docker en VPS..."
    ${SSH_CMD} "docker --version" 2>/dev/null && log "Docker disponible en VPS" || warn "Docker no disponible en VPS"
    
    info "Verificando contenedores..."
    ${SSH_CMD} "docker ps --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || warn "No se puede acceder a contenedores"
    
else
    error "No se puede conectar con el VPS"
    echo "  💡 Verificar SSH config o ejecutar: ./deploy.sh setup"
fi
echo ""

# 7. Verificar Watchtower
echo "👀 Watchtower"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ${SSH_CMD} "docker ps --format '{{.Names}}'" 2>/dev/null | grep -q "watchtower"; then
    log "Watchtower está corriendo"
    
    info "Últimos logs de Watchtower:"
    ${SSH_CMD} "docker logs watchtower --tail 10 2>&1" || warn "No se pueden leer logs"
else
    warn "Watchtower NO está corriendo en VPS"
fi
echo ""

# 8. Resumen y recomendaciones
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     📋 RESUMEN Y ACCIONES                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "Para hacer deploy automático:"
echo "  1️⃣  git add ."
echo "  2️⃣  git commit -m 'tu mensaje'"
echo "  3️⃣  ./deploy-auto.sh"
echo ""
echo "O manualmente:"
echo "  1️⃣  git push origin main"
echo "  2️⃣  Esperar ~3 minutos a que GitHub Actions construya"
echo "  3️⃣  Watchtower actualizará automáticamente en ~5 minutos"
echo "  4️⃣  O forzar actualización: ssh ${VPS_USER}@${VPS_IP} -p ${VPS_PORT} 'cd /opt/elarcagym && docker compose pull && docker compose up -d --force-recreate'"
echo ""

echo "Enlaces útiles:"
echo "  🔗 GitHub Actions: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo "  🔗 Docker Hub Backend: https://hub.docker.com/r/dgimenezdeveloper/el-arca-gym-manager-backend"
echo "  🔗 Docker Hub Frontend: https://hub.docker.com/r/dgimenezdeveloper/el-arca-gym-manager-frontend"
echo "  🔗 Sitio Web: https://elarcagym.com.ar"
echo ""
