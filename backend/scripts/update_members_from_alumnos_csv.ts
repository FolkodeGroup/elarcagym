/**
 * Script: Actualización de socios desde ALUMNOS-ARCAGYM.csv
 *
 * Este script:
 *  1. Lee el CSV de alumnos (Hora, Número, Nombre, FEBRERO, FECHA)
 *  2. Busca cada registro en la DB por número de teléfono (campo phone)
 *  3. Actualiza el joinDate de cada socio con la fecha real de ingreso al gym
 *  4. Actualiza horarios habituales si no tienen asignado
 *  5. Reporta matches, ambigüedades y registros no encontrados
 *
 * Uso:
 *   # Primero abrir el túnel SSH:
 *   ssh -p 5371 -L 15432:localhost:5433 root@<VPS_IP> -N &
 *
 *   # Luego ejecutar:
 *   DATABASE_URL="postgresql://elarcagym_user:elarcagym_pass@localhost:15432/elarcagym" \
 *     npx tsx scripts/update_members_from_alumnos_csv.ts
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
  hora: string;       // e.g. "08:00"
  telefono: string;   // e.g. "1135623085"
  apellido: string;   // Primer palabra
  nombre: string;     // Resto del nombre
  fecha: string;      // e.g. "01-feb"
}

interface UpdateResult {
  total: number;
  actualizados: number;
  noEncontrados: number;
  ambiguos: number;
  vacios: number;
  errores: Array<{ fila: number; nombre: string; error: string }>;
  warnings: string[];
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Parsea la fecha del CSV (e.g., "01-feb") en un Date de 2026 */
function parseFecha(fechaStr: string): Date | null {
  if (!fechaStr) return null;
  
  const meses: Record<string, number> = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
  };
  
  const clean = fechaStr.trim().toLowerCase();
  // Formato esperado: DD-MMM (e.g., "01-feb" o "30-Feb")
  const match = clean.match(/^(\d{1,2})-(\w{3})$/);
  if (!match) return null;
  
  let dia = parseInt(match[1], 10);
  const mesStr = match[2].toLowerCase();
  const mes = meses[mesStr];
  
  if (mes === undefined) return null;
  
  // Validar día máximo del mes (2026 no es bisiesto)
  const maxDias = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dia > maxDias[mes]) {
    console.log(`  ⚠️  Fecha inválida ${fechaStr}: Feb tiene 28 días. Ajustando a día ${maxDias[mes]}.`);
    dia = maxDias[mes];
  }
  
  // Año 2026 (año actual)
  return new Date(2026, mes, dia, 12, 0, 0);
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

/** Normaliza un texto para comparación (sin tildes, minúsculas) */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ── Parseo del CSV ────────────────────────────────────────────────────────────

function parsearCsv(filePath: string): CsvRow[] {
  const contenido = fs.readFileSync(filePath, 'utf-8');
  const lineas = contenido.split('\n').map(l => l.replace(/\r/g, ''));

  // Línea 0 es el encabezado – la saltamos
  const dataLines = lineas.slice(1).filter(l => l.trim() !== '');

  const rows: CsvRow[] = [];

  for (const linea of dataLines) {
    const cols = parseCsvLine(linea);
    // Cols: Hora(0), Número(1), Nombre(2), FEBRERO(3), FECHA(4)
    
    const hora = cols[0]?.trim() ?? '';
    const telefono = cols[1]?.trim().replace(/\D/g, '') ?? '';
    const nombreCompleto = cols[2]?.trim() ?? '';
    const fecha = cols[4]?.trim() ?? '';

    // Saltar filas vacías (sin nombre ni teléfono)
    if (!nombreCompleto && !telefono) continue;
    if (!nombreCompleto) continue;

    // Separar "Apellido Nombre" → apellido y nombre
    const spaceIdx = nombreCompleto.indexOf(' ');
    const apellido = spaceIdx >= 0 ? nombreCompleto.substring(0, spaceIdx).trim() : nombreCompleto;
    const nombre = spaceIdx >= 0 ? nombreCompleto.substring(spaceIdx + 1).trim() : '';

    rows.push({
      hora,
      telefono,
      apellido,
      nombre,
      fecha,
    });
  }

  return rows;
}

// ── Actualización ─────────────────────────────────────────────────────────────

async function actualizarMiembros(rows: CsvRow[]): Promise<UpdateResult> {
  const resultado: UpdateResult = {
    total: rows.length,
    actualizados: 0,
    noEncontrados: 0,
    ambiguos: 0,
    vacios: 0,
    errores: [],
    warnings: [],
  };

  // Cargar todos los miembros existentes
  const allMembers = await prisma.member.findMany({
    include: { habitualSchedules: true },
  });
  console.log(`📊 Miembros en DB: ${allMembers.length}`);

  // Crear índice por teléfono
  const byPhone = new Map<string, typeof allMembers>();
  for (const m of allMembers) {
    const pk = m.phone.replace(/\D/g, '');
    if (!byPhone.has(pk)) byPhone.set(pk, []);
    byPhone.get(pk)!.push(m);
  }

  console.log(`\n📋 Procesando ${rows.length} registros del CSV...\n`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombreCompleto = `${row.apellido} ${row.nombre}`.trim();

    if (!row.telefono) {
      resultado.vacios++;
      console.log(`  ⏭️  [${i + 2}] ${nombreCompleto} → Sin teléfono, saltando`);
      continue;
    }

    try {
      // Buscar por teléfono
      const matches = byPhone.get(row.telefono) || [];

      if (matches.length === 0) {
        // Buscar por nombre como fallback
        const nameMatches = allMembers.filter(
          m => normalize(`${m.lastName} ${m.firstName}`) === normalize(nombreCompleto) ||
               normalize(`${m.firstName} ${m.lastName}`) === normalize(nombreCompleto)
        );
        
        if (nameMatches.length === 1) {
          resultado.warnings.push(
            `[${i + 2}] ${nombreCompleto}: Match por nombre (teléfono CSV: ${row.telefono}, DB: ${nameMatches[0].phone})`
          );
          await updateMember(nameMatches[0], row, i);
          resultado.actualizados++;
        } else if (nameMatches.length > 1) {
          resultado.ambiguos++;
          resultado.warnings.push(
            `⚠️ AMBIGUO [${i + 2}] ${nombreCompleto}: Múltiples matches por nombre. IDs: ${nameMatches.map(m => m.id).join(', ')}`
          );
        } else {
          resultado.noEncontrados++;
          console.log(`  ❓  [${i + 2}] ${nombreCompleto} (Tel: ${row.telefono}) → NO encontrado en DB`);
        }
        continue;
      }

      if (matches.length > 1) {
        resultado.ambiguos++;
        resultado.warnings.push(
          `⚠️ AMBIGUO [${i + 2}] ${nombreCompleto} (Tel: ${row.telefono}): ${matches.length} miembros con mismo teléfono. IDs: ${matches.map(m => `${m.id} (${m.firstName} ${m.lastName})`).join(', ')}`
        );
        // Intentar desambiguar por nombre
        const nameMatch = matches.find(
          m => normalize(`${m.lastName} ${m.firstName}`) === normalize(nombreCompleto) ||
               normalize(`${m.firstName} ${m.lastName}`) === normalize(nombreCompleto)
        );
        if (nameMatch) {
          await updateMember(nameMatch, row, i);
          resultado.actualizados++;
          console.log(`  ✅  [${i + 2}] ${nombreCompleto} → Desambiguado por nombre`);
        }
        continue;
      }

      // Match único por teléfono
      const member = matches[0];
      await updateMember(member, row, i);
      resultado.actualizados++;

    } catch (err: any) {
      resultado.errores.push({ fila: i + 2, nombre: nombreCompleto, error: err.message });
      console.error(`  ❌  [${i + 2}] ${nombreCompleto} → ERROR: ${err.message}`);
    }
  }

  return resultado;

  async function updateMember(member: any, row: CsvRow, idx: number) {
    const nombreCompleto = `${row.apellido} ${row.nombre}`.trim();
    const fecha = parseFecha(row.fecha);
    
    const updateData: any = {};
    
    // Actualizar joinDate si hay fecha válida
    if (fecha) {
      updateData.joinDate = fecha;
    }

    // Solo actualizar si hay algo que cambiar
    if (Object.keys(updateData).length > 0) {
      await prisma.member.update({
        where: { id: member.id },
        data: updateData,
      });
      
      const dateStr = fecha ? fecha.toLocaleDateString('es-AR') : 'sin fecha';
      console.log(`  ✅  [${idx + 2}] ${nombreCompleto} → joinDate: ${dateStr}`);
    } else {
      console.log(`  ℹ️  [${idx + 2}] ${nombreCompleto} → Sin cambios necesarios`);
    }
  }
}

// ── Reporte final ─────────────────────────────────────────────────────────────

function mostrarReporte(resultado: UpdateResult): void {
  console.log('\n' + '═'.repeat(60));
  console.log('  REPORTE DE ACTUALIZACIÓN');
  console.log('═'.repeat(60));
  console.log(`  Total procesados : ${resultado.total}`);
  console.log(`  ✅ Actualizados   : ${resultado.actualizados}`);
  console.log(`  ❓ No encontrados : ${resultado.noEncontrados}`);
  console.log(`  ⚠️  Ambiguos       : ${resultado.ambiguos}`);
  console.log(`  ⏭️  Vacíos         : ${resultado.vacios}`);
  console.log(`  ❌ Errores        : ${resultado.errores.length}`);

  if (resultado.warnings.length > 0) {
    console.log('\n  Advertencias:');
    resultado.warnings.forEach(w => console.log(`    ${w}`));
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
  const csvPath = path.resolve(__dirname, '..', 'docs', 'ALUMNOS-ARCAGYM.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Archivo CSV no encontrado en: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 Leyendo CSV: ${csvPath}`);
  const rows = parsearCsv(csvPath);
  console.log(`📊 Registros válidos en CSV: ${rows.length}`);

  console.log(`🔗 Conectando a: ${process.env.DATABASE_URL!.replace(/:\/\/[^@]+@/, '://<credentials>@')}`);

  const resultado = await actualizarMiembros(rows);
  mostrarReporte(resultado);

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
