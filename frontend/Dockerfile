# Dockerfile para el frontend de el-arca-gym-manager
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

# Copiar todo el código fuente
COPY . .

# Copiar .env.production (se carga automáticamente con vite build)
COPY .env.production* ./

# Build arg para sobreescribir la URL del API si se necesita
# Si no se pasa, Vite usará el valor de .env.production
ARG VITE_API_URL
# Establecer tanto el archivo .env.production como la variable de entorno
# para que Vite lo tome correctamente durante el build
RUN if [ -n "$VITE_API_URL" ]; then \
      echo "VITE_API_URL=$VITE_API_URL" > .env.production; \
    fi
ENV VITE_API_URL=${VITE_API_URL}

# Construir la app (vite build carga .env.production automáticamente)
RUN npm run build

# --- Etapa de producción con imagen más liviana ---
FROM node:20-alpine AS production

WORKDIR /app

# Solo copiar lo necesario para servir
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
# vite.config.ts es NECESARIO en runtime para que `vite preview`
# lea la configuración de allowedHosts, port, host, etc.
COPY --from=build /app/vite.config.ts ./

# Exponer el puerto de Vite preview
EXPOSE 4173

# Comando por defecto
CMD ["npm", "run", "preview"]
