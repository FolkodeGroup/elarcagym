#!/bin/bash

# ============================================================================
# Script de utilidad para limpiar ejercicios duplicados
# ============================================================================
# Este script facilita la ejecución del proceso de limpieza con validaciones
# de seguridad y opciones de backup automático.
#
# Uso:
#   ./clean-exercises.sh              # Ejecutar con confirmación
#   ./clean-exercises.sh --auto       # Ejecutar sin confirmación
#   ./clean-exercises.sh --backup     # Hacer backup antes de ejecutar
#   ./clean-exercises.sh --dry-run    # Modo simulación (solo reporta)
# ============================================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$BACKEND_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Opciones
AUTO_MODE=false
BACKUP_MODE=false
DRY_RUN=false

# Parsear argumentos
for arg in "$@"; do
  case $arg in
    --auto)
      AUTO_MODE=true
      shift
      ;;
    --backup)
      BACKUP_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Uso: $0 [OPCIONES]"
      echo ""
      echo "Opciones:"
      echo "  --auto      Ejecutar sin confirmación"
      echo "  --backup    Hacer backup de la BD antes de ejecutar"
      echo "  --dry-run   Modo simulación (solo muestra que haría)"
      echo "  --help, -h  Mostrar esta ayuda"
      echo ""
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg"
      echo "Usa --help para ver las opciones disponibles"
      exit 1
      ;;
  esac
done

# Banner
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      LIMPIEZA DE EJERCICIOS DUPLICADOS - El Arca Gym      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo -e "${RED}❌ Error: No se encuentra el archivo .env${NC}"
  echo "   Asegúrate de estar en el directorio backend"
  exit 1
fi

if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
  echo "   Asegúrate de estar en el directorio backend"
  exit 1
fi

# Cargar variables de entorno
if [ -f "$BACKEND_DIR/.env" ]; then
  export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL no está configurada en .env${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Variables de entorno cargadas"

# Verificar dependencias
echo -e "\n${BLUE}🔍 Verificando dependencias...${NC}"

cd "$BACKEND_DIR"

if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ Error: npx no está instalado${NC}"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  node_modules no encontrado. Instalando dependencias...${NC}"
  npm install
fi

if ! npx --no-install tsx --version &> /dev/null; then
  echo -e "${YELLOW}⚠️  tsx no encontrado. Instalando...${NC}"
  npm install -D tsx
fi

echo -e "${GREEN}✓${NC} Todas las dependencias están disponibles"

# Modo dry-run
if [ "$DRY_RUN" = true ]; then
  echo -e "\n${YELLOW}🧪 MODO DRY-RUN: Solo se mostrará qué haría el script${NC}"
  echo -e "${CYAN}Ejecutando análisis...${NC}\n"
  
  # Aquí podrías agregar un script que solo muestre estadísticas sin modificar
  npx tsx scripts/clean_exercise_duplicates.ts
  
  echo -e "\n${YELLOW}ℹ️  Este fue un análisis. No se realizaron cambios.${NC}"
  echo -e "${CYAN}Para aplicar los cambios, ejecuta sin --dry-run${NC}"
  exit 0
fi

# Backup
if [ "$BACKUP_MODE" = true ]; then
  echo -e "\n${BLUE}💾 Creando backup de la base de datos...${NC}"
  
  mkdir -p "$BACKUP_DIR"
  
  # Extraer información de conexión
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  BACKUP_FILE="$BACKUP_DIR/backup_pre_limpieza_$TIMESTAMP.sql"
  
  if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo -e "${GREEN}✓${NC} Backup creado: $BACKUP_FILE"
    echo -e "   Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"
  else
    echo -e "${YELLOW}⚠️  pg_dump no disponible. Saltando backup.${NC}"
    echo -e "${YELLOW}   Considera instalar postgresql-client para backups automáticos${NC}"
  fi
fi

# Confirmación
if [ "$AUTO_MODE" = false ]; then
  echo -e "\n${YELLOW}⚠️  ADVERTENCIA:${NC}"
  echo "Este script va a:"
  echo "  1. Convertir todos los nombres de ejercicios a MAYÚSCULAS"
  echo "  2. Detectar y eliminar ejercicios duplicados"
  echo "  3. Actualizar las referencias en las rutinas existentes"
  echo ""
  echo -e "Base de datos: ${CYAN}$DB_NAME${NC}"
  echo ""
  read -p "¿Deseas continuar? (s/N): " -n 1 -r
  echo
  
  if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${YELLOW}❌ Cancelado por el usuario${NC}"
    exit 0
  fi
fi

# Ejecutar limpieza
echo -e "\n${BLUE}🚀 Ejecutando limpieza de ejercicios...${NC}\n"
echo -e "${CYAN}─────────────────────────────────────────────────────────────${NC}\n"

cd "$BACKEND_DIR"

if npx tsx scripts/clean_exercise_duplicates.ts; then
  echo -e "\n${CYAN}─────────────────────────────────────────────────────────────${NC}"
  echo -e "\n${GREEN}✅ ¡Limpieza completada exitosamente!${NC}\n"
  
  if [ "$BACKUP_MODE" = true ] && [ -f "$BACKUP_FILE" ]; then
    echo -e "${CYAN}💾 Backup disponible en:${NC}"
    echo "   $BACKUP_FILE"
    echo ""
  fi
  
  echo -e "${CYAN}📝 Próximos pasos:${NC}"
  echo "  1. Verificar en la aplicación web que todo funciona correctamente"
  echo "  2. Revisar que no haya duplicados en la lista de ejercicios"
  echo "  3. Comprobar que las rutinas existentes se muestran correctamente"
  echo ""
  
  exit 0
else
  echo -e "\n${RED}❌ Error durante la limpieza${NC}"
  
  if [ "$BACKUP_MODE" = true ] && [ -f "$BACKUP_FILE" ]; then
    echo -e "\n${YELLOW}Para restaurar el backup:${NC}"
    echo "  psql \"\$DATABASE_URL\" < $BACKUP_FILE"
  fi
  
  exit 1
fi
