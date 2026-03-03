#!/bin/bash

echo "🔄 Iniciando servicio Docker..."
sudo systemctl start docker

echo "⏳ Esperando que Docker esté listo..."
sleep 2

if ! sudo systemctl is-active --quiet docker; then
  echo "❌ Docker no pudo iniciarse. Revisa el servicio con: sudo systemctl status docker"
  exit 1
fi

echo "🚀 Levantando contenedores de El Arca Gym..."
docker compose up -d

if [ $? -eq 0 ]; then
  echo "✅ Todo listo. El sistema está corriendo."
else
  echo "❌ Error al levantar los contenedores."
fi