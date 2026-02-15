#!/bin/bash

# Script para testear los endpoints de categorías y ejercicios

echo "=========================================="
echo "Testing Exercise Categories & Exercises API"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:4000"

# Obtener un token válido (asumiendo que hay un usuario admin)
echo -e "${YELLOW}1. Intentando login...${NC}"

# Credenciales reales del seed
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/users/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"veronicarequena2@gmail.com","password":"Elarca2026"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ No se pudo obtener token. Intenta con diferentes credenciales.${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Token obtenido${NC}"
echo ""

# Test 1: Listar categorías
echo -e "${YELLOW}2. Listando categorías existentes...${NC}"
CATEGORIES=$(curl -s -X GET "$API_URL/exercise-categories" \
  -H "Authorization: Bearer $TOKEN")

echo "$CATEGORIES" | head -20
echo ""

# Test 2: Listar ejercicios
echo -e "${YELLOW}3. Listando ejercicios existentes...${NC}"
EXERCISES=$(curl -s -X GET "$API_URL/exercises" \
  -H "Authorization: Bearer $TOKEN")

EXERCISE_COUNT=$(echo "$EXERCISES" | grep -o '"id"' | wc -l)
echo -e "${GREEN}✓ Total de ejercicios: $EXERCISE_COUNT${NC}"
echo ""

# Test 3: Crear nueva categoría
echo -e "${YELLOW}4. Creando nueva categoría de prueba...${NC}"
NEW_CATEGORY=$(curl -s -X POST "$API_URL/exercise-categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"TEST_CATEGORY"}')

if echo "$NEW_CATEGORY" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Categoría creada exitosamente${NC}"
  CATEGORY_ID=$(echo $NEW_CATEGORY | grep -o '"id":"[^"]*' | sed 's/"id":"//')
  echo "ID: $CATEGORY_ID"
else
  echo -e "${RED}✗ Error al crear categoría${NC}"
  echo "$NEW_CATEGORY"
fi
echo ""

# Test 4: Crear nuevo ejercicio
if [ ! -z "$CATEGORY_ID" ]; then
  echo -e "${YELLOW}5. Creando nuevo ejercicio de prueba...${NC}"
  NEW_EXERCISE=$(curl -s -X POST "$API_URL/exercises" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Ejercicio de Prueba\",\"categoryId\":\"$CATEGORY_ID\"}")
  
  if echo "$NEW_EXERCISE" | grep -q '"id"'; then
    echo -e "${GREEN}✓ Ejercicio creado exitosamente${NC}"
    EXERCISE_ID=$(echo $NEW_EXERCISE | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    echo "ID: $EXERCISE_ID"
  else
    echo -e "${RED}✗ Error al crear ejercicio${NC}"
    echo "$NEW_EXERCISE"
  fi
  echo ""
  
  # Test 5: Eliminar ejercicio de prueba
  if [ ! -z "$EXERCISE_ID" ]; then
    echo -e "${YELLOW}6. Eliminando ejercicio de prueba...${NC}"
    DELETE_EXERCISE=$(curl -s -X DELETE "$API_URL/exercises/$EXERCISE_ID" \
      -H "Authorization: Bearer $TOKEN")
    echo -e "${GREEN}✓ Ejercicio eliminado${NC}"
    echo ""
  fi
  
  # Test 6: Eliminar categoría de prueba
  echo -e "${YELLOW}7. Eliminando categoría de prueba...${NC}"
  DELETE_CATEGORY=$(curl -s -X DELETE "$API_URL/exercise-categories/$CATEGORY_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  if [ -z "$DELETE_CATEGORY" ]; then
    echo -e "${GREEN}✓ Categoría eliminada${NC}"
  else
    echo -e "${RED}✗ Error al eliminar: $DELETE_CATEGORY${NC}"
  fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Tests completados"
echo "==========================================${NC}"
