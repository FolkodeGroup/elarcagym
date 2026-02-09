# Dockerfile para el frontend de el-arca-gym-manager
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copiar archivo de entorno si existe (ajusta según tu flujo)
# COPY .env .env

# Construir la app (ajusta el comando si usas otro)
RUN npm run build

# Exponer el puerto real de Vite preview
EXPOSE 4173

# Comando por defecto
CMD ["npm", "run", "preview"]
