import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
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
//# sourceMappingURL=index.js.map