"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_js_1 = require("../src/generated/prisma/client/client.js");
const adapter_pg_1 = require("@prisma/adapter-pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_js_1.PrismaClient({ adapter });
async function main() {
    const ejercicios = await prisma.exerciseMaster.findMany();
    let actualizados = 0;
    for (const ex of ejercicios) {
        if (ex.category !== ex.category.toUpperCase()) {
            await prisma.exerciseMaster.update({
                where: { id: ex.id },
                data: { category: ex.category.toUpperCase() },
            });
            actualizados++;
        }
    }
    console.log(`✅ Grupos musculares actualizados a mayúsculas: ${actualizados}`);
    process.exit(0);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=normalize_categories.js.map