/**
 * Script de importación de socios desde CSV
 *
 * Lee el archivo DATOS-DE-LOS-CLIENTE-SISTEMA.csv y carga todos los socios
 * en la base de datos usando Prisma.
 *
 * Reglas de procesamiento:
 *  - "APELLIDO Y NOMBRE": la primera palabra es el apellido, el resto el nombre.
 *  - DNI: se limpian puntos y espacios. Si falta, se usa placeholder "SDNI_<celular>".
 *  - Email: se normaliza a minúsculas. Si falta, queda null.
 *  - Registros incompletos (sin DNI real o sin email) se marcan con phase = 'DATOS_INCOMPLETOS'.
 *  - Se usan upserts para no duplicar si el script se ejecuta más de una vez.
 *
 * Para apuntar a la VPS cloud, setear DATABASE_URL en el entorno:
 *
 *   # Opción A – túnel SSH (recomendado desde local):
 *   ssh -p 5371 -L 15432:localhost:5433 root@***REMOVED*** -N &
 *   DATABASE_URL="postgresql://elarcagym_user:***REMOVED***@localhost:15432/elarcagym" \
 *     npx tsx scripts/import_members_csv.ts
 *
 *   # Opción B – ejecutar directamente en la VPS (via SSH):
 *   ssh -p 5371 root@***REMOVED*** \
 *     "cd /opt/elarcagym && docker compose exec backend npx tsx scripts/import_members_csv.ts"
 *
 * Uso normal (con DATABASE_URL ya configurado):
 *   npx tsx scripts/import_members_csv.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ── Conexión ──────────────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida. Abortando.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ParsedMember {
  apellido: string;
  nombre: string;
  dniRaw: string;       // valor original del CSV (puede estar vacío)
  dniClean: string;     // valor a guardar en BD
  celular: string;
  email: string | null;
  incompleto: boolean;
  razones: string[];    // qué datos faltan
}

interface ImportResult {
  total: number;
  creados: number;
  actualizados: number;
  incompletos: number;
  errores: Array<{ fila: number; nombre: string; error: string }>;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Limpia el DNI: quita puntos, comas y espacios. */
function limpiarDni(raw: string): string {
  return raw.replace(/[\.\,\s]/g, '').trim();
}

/** Normaliza el email: minúsculas y trim. */
function limpiarEmail(raw: string): string | null {
  const clean = raw.trim().toLowerCase();
  if (!clean) return null;
  // Validación mínima: debe tener @ y al menos un punto después
  if (!clean.includes('@') || !clean.includes('.')) return null;
  return clean;
}

/** Genera un placeholder de DNI único para registros sin DNI. */
function placeholderDni(celular: string, counter: number): string {
  const base = `SDNI_${celular.replace(/\D/g, '')}`;
  return counter > 0 ? `${base}_${counter}` : base;
}

/** Parsea una línea CSV respetando comas dentro de comillas. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Parseo del CSV ────────────────────────────────────────────────────────────

function parsearCsv(filePath: string): ParsedMember[] {
  const contenido = fs.readFileSync(filePath, 'utf-8');
  const lineas = contenido.split('\n').map(l => l.replace(/\r/g, ''));

  // Línea 0 es el encabezado – la saltamos
  const dataLines = lineas.slice(1).filter(l => l.trim() !== '');

  // Para detectar duplicados de placeholder de DNI
  const usedPlaceholders = new Map<string, number>();

  const miembros: ParsedMember[] = [];

  for (const linea of dataLines) {
    const cols = parseCsvLine(linea);
    // Cols esperadas: ORDEN(0), DNI(1), CELULAR(2), APELLIDO Y NOMBRE(3), MAIL(4), ...
    if (cols.length < 4) continue;

    const dniRaw   = cols[1]?.trim() ?? '';
    const celular  = cols[2]?.trim().replace(/\D/g, '') ?? '';
    const fullName = cols[3]?.trim() ?? '';
    const emailRaw = cols[4]?.trim() ?? '';

    if (!fullName) continue; // fila vacía / sin nombre

    // Separar apellido y nombre
    const spaceIdx = fullName.indexOf(' ');
    const apellido = spaceIdx >= 0 ? fullName.substring(0, spaceIdx).trim() : fullName;
    const nombre   = spaceIdx >= 0 ? fullName.substring(spaceIdx + 1).trim() : '';

    // Limpiar DNI
    const dniLimpio = limpiarDni(dniRaw);
    let dniClean: string;
    const razones: string[] = [];
    let incompleto = false;

    if (!dniLimpio) {
      // Sin DNI: generamos placeholder único por celular
      const key = celular;
      const cnt = usedPlaceholders.get(key) ?? 0;
      dniClean = placeholderDni(celular, cnt);
      usedPlaceholders.set(key, cnt + 1);
      razones.push('DNI ausente');
      incompleto = true;
    } else {
      dniClean = dniLimpio;
    }

    // Email
    const email = limpiarEmail(emailRaw);
    if (!email) {
      razones.push('Email ausente o inválido');
      incompleto = true;
    }

    miembros.push({
      apellido,
      nombre,
      dniRaw,
      dniClean,
      celular,
      email,
      incompleto,
      razones,
    });
  }

  return miembros;
}

// ── Importación ───────────────────────────────────────────────────────────────

async function importarMiembros(miembros: ParsedMember[]): Promise<ImportResult> {
  const resultado: ImportResult = {
    total: miembros.length,
    creados: 0,
    actualizados: 0,
    incompletos: 0,
    errores: [],
  };

  console.log(`\n📋 Procesando ${miembros.length} registros...\n`);

  for (let i = 0; i < miembros.length; i++) {
    const m = miembros[i];
    const nombreCompleto = `${m.apellido} ${m.nombre}`.trim();

    try {
      const existing = await prisma.member.findUnique({ where: { dni: m.dniClean } });

      const data = {
        firstName: m.nombre || m.apellido,   // si sólo hay apellido, usarlo como nombre
        lastName:  m.apellido,
        dni:       m.dniClean,
        phone:     m.celular || '0',          // '0' como fallback si tampoco hay celular
        email:     m.email,
        status:    'ACTIVE',
        // Marcar incompletos en el campo `phase`
        phase:     m.incompleto ? 'DATOS_INCOMPLETOS' : (existing?.phase === 'DATOS_INCOMPLETOS' ? null : existing?.phase ?? null),
        joinDate:  existing?.joinDate ?? new Date(),
      };

      // Si el email a guardar ya está en uso por OTRO registro, lo descartamos
      const emailConflict = data.email
        ? await prisma.member.findFirst({ where: { email: data.email, NOT: { id: existing?.id ?? '__none__' } } })
        : null;
      if (emailConflict) {
        console.log(`  ⚠️  Email duplicado para ${nombreCompleto}, se importa sin email.`);
        data.email = null;
        data.phase = 'DATOS_INCOMPLETOS';
        if (!m.razones.includes('Email duplicado')) m.razones.push('Email duplicado');
        m.incompleto = true;
      }

      if (existing) {
        await prisma.member.update({ where: { id: existing.id }, data });
        resultado.actualizados++;
      } else {
        await prisma.member.create({ data });
        resultado.creados++;
      }

      if (m.incompleto) {
        resultado.incompletos++;
        const tag = m.razones.join(', ');
        console.log(`  ⚠️  [${String(i + 2).padStart(3)}] ${nombreCompleto.padEnd(30)} → INCOMPLETO (${tag})`);
      } else {
        console.log(`  ✅  [${String(i + 2).padStart(3)}] ${nombreCompleto}`);
      }
    } catch (err: any) {
      resultado.errores.push({ fila: i + 2, nombre: nombreCompleto, error: err.message });
      console.error(`  ❌  [${String(i + 2).padStart(3)}] ${nombreCompleto} → ERROR: ${err.message}`);
    }
  }

  return resultado;
}

// ── Reporte final ─────────────────────────────────────────────────────────────

function mostrarReporte(resultado: ImportResult, miembros: ParsedMember[]): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  REPORTE DE IMPORTACIÓN');
  console.log('═'.repeat(60));
  console.log(`  Total procesados : ${resultado.total}`);
  console.log(`  ✅ Creados        : ${resultado.creados}`);
  console.log(`  🔄 Actualizados  : ${resultado.actualizados}`);
  console.log(`  ⚠️  Incompletos   : ${resultado.incompletos}`);
  console.log(`  ❌ Errores        : ${resultado.errores.length}`);

  if (resultado.incompletos > 0) {
    console.log('\n  Registros incompletos (marcarán alerta al registrar pago):');
    miembros
      .filter(m => m.incompleto)
      .forEach(m => {
        console.log(`    • ${m.apellido} ${m.nombre} (DNI: ${m.dniRaw || '–'}, Tel: ${m.celular}) → ${m.razones.join(', ')}`);
      });
  }

  if (resultado.errores.length > 0) {
    console.log('\n  Errores:');
    resultado.errores.forEach(e => {
      console.log(`    • Fila ${e.fila} – ${e.nombre}: ${e.error}`);
    });
  }

  console.log('═'.repeat(60) + '\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.resolve(__dirname, '..', 'docs', 'DATOS-DE-LOS-CLIENTE-SISTEMA.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Archivo CSV no encontrado en: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 Leyendo CSV: ${csvPath}`);
  const miembros = parsearCsv(csvPath);

  console.log(`🔗 Conectando a: ${process.env.DATABASE_URL!.replace(/:\/\/[^@]+@/, '://<credentials>@')}`);

  const resultado = await importarMiembros(miembros);
  mostrarReporte(resultado, miembros);

  if (resultado.errores.length > 0) {
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
