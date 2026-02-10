# Dockerfile para el backend de el-arca-gym-manager
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Copiar la carpeta prisma antes de instalar dependencias (para Prisma)
COPY prisma ./prisma

# Instalar todas las dependencias (necesario para Prisma generate y build)
RUN npm ci

# Copiar el resto del código
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Exponer el puerto en el que escucha el backend
EXPOSE 4000

# Comando por defecto: ejecutar migraciones y luego iniciar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
