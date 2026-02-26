/**
 * Script: Importación de socios desde ALUMNOS-ARCAGYM.csv
 *
 * Formato CSV esperado: Hora,Celular,Nombre,DNI,MAIL,FECHA
 *  - Hora     : horario habitual (ej: 8:00, 9:00, 17:00)
 *  - Celular  : teléfono del socio
 *  - Nombre   : "Apellido Nombre" (primera palabra = apellido, resto = nombre)
 *  - DNI      : puede tener puntos (ej: 43.668.069) → se limpian
 *  - MAIL     : email (puede ser vacío o inválido)
 *  - FECHA    : día que debe pagar cada mes (ej: 1/03/2026 → día 1)
 *
 * Procesamiento:
 *  1. crea el Member con joinDate = día FECHA en Febrero 2026
 *  2. crea HabitualSchedule Lunes-Viernes con el horario de la columna Hora
 *  3. crea PaymentLog de Febrero 2026 (para que el socio quede "al día")
 *  4. si hay datos faltantes (DNI, email, celular), marca phase='DATOS_INCOMPLETOS'
 *  5. si el mismo DNI aparece varias veces (mismo socio, distinto horario),
 *     solo se crea el Member una vez y se agregan los HabitualSchedules extras.
 *
 * Uso con túnel SSH previo (ver import-alumnos-vps.sh):
 *   DATABASE_URL="postgresql://user:pass@localhost:15432/db" \
 *     npx tsx scripts/import_alumnos_arcagym.ts
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
interface CsvRow {
  hora: string;       // "8:00", "9:00", "17:00", etc.
  celular: string;    // dígitos limpios
  apellido: string;
  nombre: string;
  dniRaw: string;
  dniClean: string;
  email: string | null;
  fechaDia: number;   // día del mes de pago (extraído de FECHA)
  incompleto: boolean;
  razones: string[];
}

interface ImportStats {
  total: number;
  creados: number;
  horariosAgregados: number;
  incompletos: number;
  errores: Array<{ fila: number; nombre: string; error: string }>;
}

// ── Días de la semana para horarios habituales ────────────────────────────────
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ── Utilidades ────────────────────────────────────────────────────────────────

function limpiarDni(raw: string): string {
  return raw.replace(/[\.\,\s\-]/g, '').trim();
}

function limpiarEmail(raw: string): string | null {
  // Limpiar espacios y normalizar a minúsculas
  const clean = raw.replace(/\s/g, '').toLowerCase();
  if (!clean) return null;
  // Validación mínima
  if (!clean.includes('@') || !clean.includes('.')) return null;
  // Corregir errores comunes del CSV
  const fixed = clean
    .replace(',com$', '.com')   // "valuiriell@gmail,com" → "valuiriell@gmail.com"
    .replace(/,com$/, '.com');
  if (!fixed.includes('@') || !fixed.includes('.')) return null;
  return fixed;
}

function limpiarCelular(raw: string): string {
  return raw.replace(/\D/g, '').trim();
}

/** Convierte "8:00" o "17:00" en "08:00" o "17:00" */
function normalizarHora(hora: string): string {
  const [h, m] = hora.trim().split(':');
  return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
}

/** Suma 1 hora: "08:00" → "09:00", "20:30" → "21:30" */
function sumarUnaHora(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  const totalMin = h * 60 + m + 60;
  const nh = Math.floor(totalMin / 60) % 24;
  const nm = totalMin % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Extrae el número de día de un string como "1/03/2026" o "19/03/2026" */
function extraerDia(fecha: string): number {
  const trimmed = fecha.trim();
  if (!trimmed) return 1;
  const partes = trimmed.split('/');
  const dia = parseInt(partes[0], 10);
  return isNaN(dia) ? 1 : Math.min(Math.max(dia, 1), 28); // cap en 28 para Feb
}

/** Parsea una línea CSV respetando comas dentro de comillas */
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
function parsearCsv(filePath: string): CsvRow[] {
  const contenido = fs.readFileSync(filePath, 'utf-8');
  const lineas = contenido.split('\n').map(l => l.replace(/\r/g, ''));

  // Saltar encabezado
  const dataLines = lineas.slice(1).filter(l => l.trim() !== '');

  // Rastrear placeholders de DNI para evitar duplicados
  const usedPlaceholders = new Map<string, number>();

  const filas: CsvRow[] = [];

  for (const linea of dataLines) {
    const cols = parseCsvLine(linea);
    // Formato: Hora(0), Celular(1), Nombre(2), DNI(3), MAIL(4), FECHA(5)
    if (cols.length < 3) continue;

    const horaRaw   = cols[0]?.trim() ?? '';
    const celRaw    = cols[1]?.trim() ?? '';
    const nombreRaw = cols[2]?.trim() ?? '';
    const dniRaw    = cols[3]?.trim() ?? '';
    const emailRaw  = cols[4]?.trim() ?? '';
    const fechaRaw  = cols[5]?.trim() ?? '';

    if (!nombreRaw) continue;

    // Separar apellido y nombre (primera palabra = apellido)
    const spaceIdx = nombreRaw.indexOf(' ');
    const apellido = spaceIdx >= 0 ? nombreRaw.substring(0, spaceIdx).trim() : nombreRaw;
    const nombre   = spaceIdx >= 0 ? nombreRaw.substring(spaceIdx + 1).trim() : '';

    const celular  = limpiarCelular(celRaw);
    const dniLimpio = limpiarDni(dniRaw);
    const email    = limpiarEmail(emailRaw);
    const fechaDia = extraerDia(fechaRaw);
    const hora     = horaRaw ? normalizarHora(horaRaw) : '08:00';

    const razones: string[] = [];
    let incompleto = false;

    let dniClean: string;
    if (!dniLimpio) {
      const key = celular || nombreRaw;
      const cnt = usedPlaceholders.get(key) ?? 0;
      dniClean = `SDNI_${(celular || nombreRaw.replace(/\s/g, '_')).slice(-10)}_${cnt}`;
      usedPlaceholders.set(key, cnt + 1);
      razones.push('DNI ausente');
      incompleto = true;
    } else {
      dniClean = dniLimpio;
    }

    if (!email) {
      razones.push('Email ausente o inválido');
      incompleto = true;
    }

    if (!celular) {
      razones.push('Celular ausente');
      incompleto = true;
    }

    filas.push({
      hora,
      celular,
      apellido,
      nombre,
      dniRaw,
      dniClean,
      email,
      fechaDia,
      incompleto,
      razones,
    });
  }

  return filas;
}

// ── Importación ───────────────────────────────────────────────────────────────

async function importarSocios(filas: CsvRow[]): Promise<ImportStats> {
  const stats: ImportStats = {
    total: filas.length,
    creados: 0,
    horariosAgregados: 0,
    incompletos: 0,
    errores: [],
  };

  // El "mes en curso" es Febrero 2026 (hoy 26/02/2026)
  // joinDate = FECHA día en Febrero 2026 (max día 28 ya aplicado en parseo)
  // paymentDate = mismo día en Febrero 2026 (registra que ya pagó)
  const PAYMENT_YEAR  = 2026;
  const PAYMENT_MONTH = 1; // 0-indexed: 1 = Febrero

  console.log(`\n📋 Procesando ${filas.length} registros...\n`);

  // Agrupar por DNI para manejar socios con múltiples horarios
  const porDni = new Map<string, CsvRow[]>();
  for (const fila of filas) {
    const key = fila.dniClean;
    if (!porDni.has(key)) porDni.set(key, []);
    porDni.get(key)!.push(fila);
  }

  let filaIdx = 2; // para reporte de errores (fila 1 = encabezado)

  for (const [dni, grupo] of porDni) {
    const primero = grupo[0];
    const nombreCompleto = `${primero.apellido} ${primero.nombre}`.trim();

    try {
      // ── Fechas ────────────────────────────────────────────────────────────
      const dia       = primero.fechaDia;
      const joinDate  = new Date(PAYMENT_YEAR, PAYMENT_MONTH, dia); // e.g. 1 Feb 2026
      const payDate   = new Date(PAYMENT_YEAR, PAYMENT_MONTH, dia); // mismo día

      // ── Comprobar conflicto de email ──────────────────────────────────────
      let emailFinal = primero.email;
      if (emailFinal) {
        const emailConflict = await prisma.member.findFirst({
          where: { email: emailFinal },
        });
        if (emailConflict) {
          console.log(`  ⚠️  Email duplicado para ${nombreCompleto}, se importa sin email.`);
          emailFinal = null;
          primero.razones.push('Email ya usado por otro socio');
          primero.incompleto = true;
        }
      }

      // ── Datos del socio ───────────────────────────────────────────────────
      const memberData = {
        firstName  : primero.nombre   || primero.apellido,
        lastName   : primero.apellido,
        dni        : primero.dniClean,
        phone      : primero.celular  || '0',
        email      : emailFinal,
        status     : 'ACTIVE',
        phase      : primero.incompleto ? 'DATOS_INCOMPLETOS' : null,
        joinDate,
      };

      // Upsert del socio
      let member = await prisma.member.findUnique({ where: { dni } });

      if (member) {
        member = await prisma.member.update({ where: { id: member.id }, data: memberData });
      } else {
        member = await prisma.member.create({ data: memberData });
        stats.creados++;
      }

      // ── Horarios habituales ───────────────────────────────────────────────
      // Eliminar horarios previos para este socio y recrear
      await prisma.habitualSchedule.deleteMany({ where: { memberId: member.id } });

      const start = primero.hora;
      const end   = sumarUnaHora(start);

      // Un set de horas únicas para este socio (puede tener 2 turnos distintos)
      const horasUnicas = [...new Set(grupo.map(g => g.hora))];

      for (const horaEntry of horasUnicas) {
        const startH = normalizarHora(horaEntry);
        const endH   = sumarUnaHora(startH);

        for (const dia of DIAS_SEMANA) {
          await prisma.habitualSchedule.create({
            data: {
              memberId : member.id,
              day      : dia,
              start    : startH,
              end      : endH,
            },
          });
          stats.horariosAgregados++;
        }
      }

      // ── Pago de Febrero 2026 ──────────────────────────────────────────────
      // Verificar si ya existe pago en Febrero 2026
      const existingPayment = await prisma.paymentLog.findFirst({
        where: {
          memberId: member.id,
          date: {
            gte: new Date(PAYMENT_YEAR, PAYMENT_MONTH, 1),
            lt:  new Date(PAYMENT_YEAR, PAYMENT_MONTH + 1, 1),
          },
        },
      });

      if (!existingPayment) {
        await prisma.paymentLog.create({
          data: {
            memberId : member.id,
            date     : payDate,
            amount   : 0,
            concept  : 'Cuota mensual - Carga inicial',
            method   : 'Efectivo',
          },
        });
      }

      if (primero.incompleto) {
        stats.incompletos++;
        console.log(`  ⚠️  [${String(filaIdx).padStart(3)}] ${nombreCompleto.padEnd(35)} → INCOMPLETO (${primero.razones.join(', ')})`);
      } else {
        console.log(`  ✅  [${String(filaIdx).padStart(3)}] ${nombreCompleto}`);
      }
    } catch (err: any) {
      stats.errores.push({ fila: filaIdx, nombre: nombreCompleto, error: err.message });
      console.error(`  ❌  [${String(filaIdx).padStart(3)}] ${nombreCompleto} → ERROR: ${err.message}`);
    }

    filaIdx += grupo.length;
  }

  return stats;
}

// ── Reporte ───────────────────────────────────────────────────────────────────
function mostrarReporte(stats: ImportStats, filas: CsvRow[]): void {
  console.log('\n' + '═'.repeat(65));
  console.log('  REPORTE DE IMPORTACIÓN — ALUMNOS-ARCAGYM.csv');
  console.log('═'.repeat(65));
  console.log(`  Total filas CSV     : ${stats.total}`);
  console.log(`  ✅ Socios creados   : ${stats.creados}`);
  console.log(`  📅 Horarios creados : ${stats.horariosAgregados}`);
  console.log(`  ⚠️  Incompletos      : ${stats.incompletos}`);
  console.log(`  ❌ Errores          : ${stats.errores.length}`);

  if (stats.incompletos > 0) {
    console.log('\n  Socios con datos incompletos (verán aviso al abrir su perfil):');
    // Agrupar por DNI para no repetir al multi-hora
    const vistos = new Set<string>();
    filas
      .filter(f => f.incompleto)
      .forEach(f => {
        const key = f.dniClean;
        if (vistos.has(key)) return;
        vistos.add(key);
        console.log(`    • ${f.apellido} ${f.nombre} (DNI: ${f.dniRaw || '–'}, Tel: ${f.celular || '–'}) → ${f.razones.join(', ')}`);
      });
  }

  if (stats.errores.length > 0) {
    console.log('\n  Errores:');
    stats.errores.forEach(e => {
      console.log(`    • Fila ${e.fila} – ${e.nombre}: ${e.error}`);
    });
  }

  console.log('═'.repeat(65) + '\n');
  console.log('💡 Los socios marcados como DATOS_INCOMPLETOS mostrarán el aviso');
  console.log('   en la interfaz web cada vez que se acceda a su perfil.');
  console.log('💡 Todos los socios tienen pago de Febrero 2026 → estado AL DÍA.');
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Buscar el CSV relativo al script o en docs/
  const possiblePaths = [
    path.resolve(__dirname, '..', 'docs', 'ALUMNOS-ARCAGYM.csv'),
    path.resolve(__dirname, 'ALUMNOS-ARCAGYM.csv'),
    path.resolve(process.cwd(), 'backend', 'docs', 'ALUMNOS-ARCAGYM.csv'),
    path.resolve(process.cwd(), 'docs', 'ALUMNOS-ARCAGYM.csv'),
  ];

  const csvPath = possiblePaths.find(p => fs.existsSync(p));

  if (!csvPath) {
    console.error('❌ Archivo ALUMNOS-ARCAGYM.csv no encontrado.');
    console.error('   Rutas buscadas:');
    possiblePaths.forEach(p => console.error(`     ${p}`));
    process.exit(1);
  }

  console.log(`📂 Leyendo CSV: ${csvPath}`);
  const filas = parsearCsv(csvPath);
  console.log(`   ${filas.length} filas encontradas.`);

  console.log(`🔗 Conectando a: ${process.env.DATABASE_URL!.replace(/:\/\/[^@]+@/, '://<credentials>@')}`);

  const stats = await importarSocios(filas);
  mostrarReporte(stats, filas);

  if (stats.errores.length > 0) {
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
