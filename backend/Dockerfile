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

# Generar Prisma Client en node_modules después de instalar dependencias y copiar código
RUN npx prisma generate

# Compilar TypeScript (si aplica)
RUN npm run build || echo "No build script"

# Exponer el puerto en el que escucha el backend
EXPOSE 4000

# Comando por defecto
CMD ["node", "dist/index.js"]
