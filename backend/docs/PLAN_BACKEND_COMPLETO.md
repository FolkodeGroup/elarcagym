# Plan Detallado para Backend, Base de Datos, CI/CD y Despliegue en Render

## 1. Preparación del entorno

### 1.1. Instalar Node.js y npm
Descarga e instala [Node.js](https://nodejs.org/es/) (recomendado v18 o superior). npm viene incluido.

### 1.2. Instalar PostgreSQL
Descarga e instala [PostgreSQL](https://www.postgresql.org/download/). Recuerda el usuario, contraseña y puerto configurados.

---

## 2. Crear el backend con Express y TypeScript

### 2.1. Inicializar el proyecto

```sh
cd backend
npm init -y
npm install express cors dotenv
npm install typescript ts-node @types/node @types/express --save-dev
npx tsc --init
```

### 2.2. Estructura recomendada de carpetas

```
backend/
  src/
    controllers/
    models/
    routes/
    prisma/
    index.ts
  .env
  package.json
  tsconfig.json
```

---

## 3. Configurar Prisma ORM y conectar con PostgreSQL

### 3.1. Instalar Prisma

```sh
npm install prisma @prisma/client
npx prisma init
```

Esto crea la carpeta `prisma/` y el archivo `prisma/schema.prisma`.

### 3.2. Configurar la conexión en `.env`

```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/elarcagym"
```

Reemplaza `usuario`, `contraseña` y el puerto si es necesario.

---

## 4. Modelar la base de datos

### 4.1. Esquema de tablas en Prisma

Copia y pega este modelo en `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Member {
  id              String   @id @default(uuid())
  firstName       String
  lastName        String
  dni             String   @unique
  email           String
  phone           String
  joinDate        DateTime @default(now())
  status          String
  photoUrl        String?
  phase           String
  habitualSchedules HabitualSchedule[]
  biometrics      BiometricLog[]
  routines        Routine[]
  diets           Diet[]
  payments        PaymentLog[]
}

model HabitualSchedule {
  id        String   @id @default(uuid())
  day       String
  start     String
  end       String
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id])
}

model BiometricLog {
  id        String   @id @default(uuid())
  date      DateTime
  weight    Float
  height    Float
  bodyFat   Float?
  chest     Float?
  waist     Float?
  hips      Float?
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id])
}

model Routine {
  id        String   @id @default(uuid())
  name      String
  goal      String
  assignedBy String
  createdAt DateTime @default(now())
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id])
  days      RoutineDay[]
}

model RoutineDay {
  id        String   @id @default(uuid())
  dayName   String
  routineId String
  routine   Routine  @relation(fields: [routineId], references: [id])
  exercises ExerciseDetail[]
}

model ExerciseDetail {
  id        String   @id @default(uuid())
  name      String
  series    String
  reps      String
  weight    String
  notes     String?
  routineDayId String
  routineDay   RoutineDay @relation(fields: [routineDayId], references: [id])
}

model Diet {
  id        String   @id @default(uuid())
  name      String
  calories  Int
  description String
  generatedAt DateTime @default(now())
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id])
}

model PaymentLog {
  id        String   @id @default(uuid())
  date      DateTime
  amount    Float
  concept   String
  method    String
  memberId  String
  member    Member   @relation(fields: [memberId], references: [id])
}

model Product {
  id        String   @id @default(uuid())
  name      String
  price     Float
  category  String
  stock     Int
  sales     SaleItem[]
}

model Sale {
  id        String   @id @default(uuid())
  date      DateTime @default(now())
  total     Float
  memberId  String?
  member    Member?  @relation(fields: [memberId], references: [id])
  items     SaleItem[]
}

model SaleItem {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  saleId    String
  sale      Sale     @relation(fields: [saleId], references: [id])
  quantity  Int
  priceAtSale Float
}

model Reminder {
  id        String   @id @default(uuid())
  text      String
  date      DateTime
  priority  String
}

model Slot {
  id        String   @id @default(uuid())
  date      DateTime
  time      String
  duration  Int
  status    String
  reservations Reservation[]
}

model Reservation {
  id        String   @id @default(uuid())
  slotId    String
  slot      Slot     @relation(fields: [slotId], references: [id])
  memberId  String?
  member    Member?  @relation(fields: [memberId], references: [id])
  clientName String
  clientPhone String?
  clientEmail String?
  notes     String?
  attended  Boolean?
  createdAt DateTime @default(now())
}

model ExerciseMaster {
  id        String   @id @default(uuid())
  name      String
  category  String
}
```

### 4.2. Crear las tablas en la base de datos

```sh
npx prisma migrate dev --name init
```

---

## 5. Crear la API REST con Express

### 5.1. Crear el archivo principal

Crea `src/index.ts` con el siguiente contenido básico:

```typescript
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Ejemplo: Obtener todos los socios
app.get('/members', async (req, res) => {
  const members = await prisma.member.findMany();
  res.json(members);
});

// Agrega aquí más endpoints para cada modelo...

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
```

### 5.2. Ejecutar el backend

```sh
npx ts-node src/index.ts
```

---

## 6. Configurar CI/CD con GitHub Actions

### 6.1. Crear el workflow

Crea `.github/workflows/deploy.yml` en el repo con:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Instalar Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Instalar dependencias
        run: npm install
      - name: Ejecutar tests
        run: npm test
      - name: Build (si usas TypeScript)
        run: npx tsc
      # Aquí puedes agregar steps para desplegar en Render (ver siguiente paso)
```

---

## 7. Desplegar en Render

### 7.1. Crear cuenta en [Render](https://render.com/)

### 7.2. Crear un nuevo servicio web

- Elige "Web Service"
- Conecta tu repo de GitHub
- Configura:
  - **Build Command:** `npm install && npx tsc`
  - **Start Command:** `node dist/index.js` (o el archivo compilado)
  - **Environment:** Agrega la variable `DATABASE_URL` con los datos de tu base PostgreSQL (Render puede crear la base por ti).

### 7.3. Render crea la base de datos PostgreSQL

- Ve a "Databases" en Render y crea una nueva base PostgreSQL.
- Copia la URL y pégala en tu `.env` y en Render.

---

## 8. Pruebas y verificación

- Accede a la URL pública que Render te da.
- Prueba los endpoints con [Postman](https://www.postman.com/) o [Insomnia](https://insomnia.rest/).
- Verifica que los datos se guardan y recuperan correctamente.

---

## 9. Subir a la nube (cuando esté listo)

- Render ya es una nube, pero puedes migrar la base y el backend a AWS, GCP, Azure, etc. cuando lo desees.
- Exporta la base de datos con `pg_dump` y sigue la documentación del proveedor elegido.

---

## 10. Recomendaciones finales

- Mantén tu `.env` privado.
- Haz backups periódicos de la base de datos.
- Documenta cada endpoint y modelo.
- Usa tests automáticos (`npm test`) para asegurar calidad.

---

¿Dudas sobre algún paso? Puedes consultar la documentación oficial de [Prisma](https://www.prisma.io/docs), [Express](https://expressjs.com/es/), [Render](https://render.com/docs), y [PostgreSQL](https://www.postgresql.org/docs/).

**¡Con este plan tendrás el backend, la base de datos y el despliegue funcionando de forma profesional y segura!**
