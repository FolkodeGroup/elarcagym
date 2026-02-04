#!/bin/bash

# Script de verificación pre-despliegue para El Arca Gym Backend
# Este script verifica que todo esté listo antes de desplegar a Render

echo "🔍 Verificando configuración de despliegue..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Check Node version
echo "📦 Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js instalado: $NODE_VERSION"
    
    # Check if .node-version matches
    if [ -f ".node-version" ]; then
        EXPECTED_VERSION=$(cat .node-version)
        CURRENT_VERSION=$(node -v | sed 's/v//')
        if [[ "$CURRENT_VERSION" == "$EXPECTED_VERSION"* ]]; then
            echo -e "${GREEN}✓${NC} Versión coincide con .node-version"
        else
            echo -e "${YELLOW}⚠${NC} Versión actual ($CURRENT_VERSION) difiere de .node-version ($EXPECTED_VERSION)"
            ((WARNINGS++))
        fi
    fi
else
    echo -e "${RED}✗${NC} Node.js no está instalado"
    ((ERRORS++))
fi
echo ""

# Check package.json
echo "📄 Verificando package.json..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json encontrado"
    
    # Check for required scripts
    if grep -q '"build"' package.json && grep -q '"start"' package.json; then
        echo -e "${GREEN}✓${NC} Scripts 'build' y 'start' configurados"
    else
        echo -e "${RED}✗${NC} Faltan scripts 'build' o 'start' en package.json"
        ((ERRORS++))
    fi
    
    # Check for postinstall script
    if grep -q '"postinstall"' package.json; then
        echo -e "${GREEN}✓${NC} Script 'postinstall' configurado"
    else
        echo -e "${YELLOW}⚠${NC} Script 'postinstall' no encontrado (recomendado para Prisma)"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} package.json no encontrado"
    ((ERRORS++))
fi
echo ""

# Check Prisma schema
echo "🗄️  Verificando Prisma..."
if [ -f "prisma/schema.prisma" ]; then
    echo -e "${GREEN}✓${NC} schema.prisma encontrado"
    
    # Check for migrations
    if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
        echo -e "${GREEN}✓${NC} Migraciones encontradas"
    else
        echo -e "${YELLOW}⚠${NC} No se encontraron migraciones"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} schema.prisma no encontrado"
    ((ERRORS++))
fi
echo ""

# Check environment variables
echo "🔐 Verificando variables de entorno..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example encontrado"
    
    # Check for important variables
    REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET")
    for VAR in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$VAR=" .env.example; then
            echo -e "${GREEN}✓${NC} $VAR definido en .env.example"
        else
            echo -e "${YELLOW}⚠${NC} $VAR no encontrado en .env.example"
            ((WARNINGS++))
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env.example no encontrado"
    ((WARNINGS++))
fi

if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC} .env encontrado (asegúrate de que esté en .gitignore)"
else
    echo -e "${GREEN}✓${NC} .env no presente (correcto para despliegue)"
fi
echo ""

# Check .gitignore
echo "📝 Verificando .gitignore..."
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✓${NC} .gitignore encontrado"
    
    # Check for important entries
    GITIGNORE_ENTRIES=(".env" "node_modules" "dist")
    for ENTRY in "${GITIGNORE_ENTRIES[@]}"; do
        if grep -q "$ENTRY" .gitignore; then
            echo -e "${GREEN}✓${NC} $ENTRY está en .gitignore"
        else
            echo -e "${RED}✗${NC} $ENTRY NO está en .gitignore"
            ((ERRORS++))
        fi
    done
else
    echo -e "${RED}✗${NC} .gitignore no encontrado"
    ((ERRORS++))
fi
echo ""

# Check TypeScript configuration
echo "⚙️  Verificando TypeScript..."
if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✓${NC} tsconfig.json encontrado"
    
    # Check for outDir
    if grep -q '"outDir"' tsconfig.json; then
        echo -e "${GREEN}✓${NC} outDir configurado"
    else
        echo -e "${YELLOW}⚠${NC} outDir no configurado en tsconfig.json"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} tsconfig.json no encontrado"
    ((ERRORS++))
fi
echo ""

# Check for node_modules
echo "📚 Verificando dependencias..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules presente"
else
    echo -e "${YELLOW}⚠${NC} node_modules no encontrado. Ejecuta 'npm install'"
    ((WARNINGS++))
fi
echo ""

# Check git status
echo "🔀 Verificando Git..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Repositorio Git inicializado"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠${NC} Hay cambios sin commitear"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} No hay cambios sin commitear"
    fi
    
    # Check remote
    if git remote -v | grep -q "origin"; then
        echo -e "${GREEN}✓${NC} Remote 'origin' configurado"
        REMOTE_URL=$(git remote get-url origin)
        echo "   URL: $REMOTE_URL"
    else
        echo -e "${RED}✗${NC} Remote 'origin' no configurado"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} No es un repositorio Git"
    ((ERRORS++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ TODO LISTO PARA DESPLEGAR${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Haz commit y push de tus cambios"
    echo "2. Sigue las instrucciones en RENDER_DEPLOYMENT.md"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ HAY $WARNINGS ADVERTENCIA(S)${NC}"
    echo "Puedes continuar, pero revisa las advertencias arriba."
    echo ""
    echo "Próximos pasos:"
    echo "1. Revisa las advertencias (opcional)"
    echo "2. Haz commit y push de tus cambios"
    echo "3. Sigue las instrucciones en RENDER_DEPLOYMENT.md"
    exit 0
else
    echo -e "${RED}✗ HAY $ERRORS ERROR(ES) Y $WARNINGS ADVERTENCIA(S)${NC}"
    echo "Corrige los errores antes de desplegar."
    exit 1
fi
