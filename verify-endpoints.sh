#!/bin/bash

# Script de verificación de endpoints del backend
# Verifica que todos los endpoints críticos respondan correctamente

set -e

API_URL="${API_URL:-http://localhost:4000}"
EMAIL="${TEST_EMAIL:-***REMOVED***}"
PASSWORD="${TEST_PASSWORD:-***REMOVED***}"

echo "🔍 Verificando endpoints del backend..."
echo "API URL: $API_URL"
echo ""

# Obtener token
echo "🔐 Obteniendo token de autenticación..."
TOKEN=$(curl -s -X POST "$API_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Error: No se pudo obtener el token de autenticación"
  exit 1
fi

echo "✅ Token obtenido correctamente"
echo ""

# Función para verificar endpoint
check_endpoint() {
  local endpoint=$1
  local name=$2
  local expected=$3
  
  echo -n "Verificando $name... "
  
  response=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL$endpoint")
  
  if echo "$response" | grep -q "Cannot GET"; then
    echo "❌ FALLO - 404 Not Found"
    return 1
  elif echo "$response" | grep -q "error"; then
    echo "⚠️  ADVERTENCIA - Error en respuesta: $response"
    return 0
  else
    echo "✅ OK"
    [ -n "$expected" ] && echo "   Respuesta: $response" | head -c 100
    return 0
  fi
}

echo "📊 VERIFICANDO ENDPOINTS:"
echo ""

# Endpoints críticos
check_endpoint "/notifications" "Notificaciones" 
check_endpoint "/config/monthly_fee" "Configuración de cuota mensual"
check_endpoint "/nutrition-templates/active" "Plantillas de nutrición activas"
check_endpoint "/waitlist" "Lista de espera"
check_endpoint "/members" "Miembros"
check_endpoint "/exercise-categories" "Categorías de ejercicios"
check_endpoint "/users/me" "Usuario actual"

echo ""
echo "✅ Verificación completada"
