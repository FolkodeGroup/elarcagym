#!/usr/bin/env python3
"""
Genera SQL de actualización de joinDate desde ALUMNOS-ARCAGYM.csv
y lo ejecuta en la VPS via SSH + docker exec.

Uso: python3 scripts/update_joindate_vps.py
"""
import csv
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
CSV_FILE = ROOT_DIR / "docs" / "ALUMNOS-ARCAGYM.csv"

# Leer .env
env_file = ROOT_DIR.parent / ".env"
env_vars = {}
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, _, val = line.partition('=')
            env_vars[key.strip()] = val.strip()

VPS_HOST = env_vars.get("VPS_HOST", "")
VPS_PORT = env_vars.get("VPS_PORT", "5371")
DB_USER = env_vars.get("DB_USER", "elarcagym_user")
DB_NAME = env_vars.get("DB_NAME", "elarcagym")

if not VPS_HOST:
    print("❌ VPS_HOST no definido en .env")
    sys.exit(1)

print(f"📂 CSV: {CSV_FILE}")
print(f"🌐 VPS: {VPS_HOST}:{VPS_PORT}")

MESES = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12,
}

MAX_DIAS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

def parse_fecha(fecha_str):
    """Parsea 'DD-MMM' a '2026-MM-DD 12:00:00'"""
    fecha_str = fecha_str.strip().lower()
    if not fecha_str or '-' not in fecha_str:
        return None
    parts = fecha_str.split('-')
    if len(parts) != 2:
        return None
    try:
        dia = int(parts[0])
    except ValueError:
        return None
    mes = MESES.get(parts[1].lower())
    if not mes:
        return None
    # Validar día
    if dia > MAX_DIAS[mes]:
        print(f"  ⚠️  Fecha inválida {fecha_str}: mes {mes} tiene máx {MAX_DIAS[mes]} días. Ajustando.")
        dia = MAX_DIAS[mes]
    return f"2026-{mes:02d}-{dia:02d} 12:00:00"

# Leer CSV
print("\n📋 Procesando CSV...")
rows = []
with open(CSV_FILE, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)  # Skip header
    for row in reader:
        if len(row) < 5:
            continue
        hora = row[0].strip()
        telefono = ''.join(c for c in row[1] if c.isdigit())
        nombre_completo = row[2].strip()
        # row[3] es FEBRERO (ignorar)
        fecha_raw = row[4].strip()
        
        if not telefono or not nombre_completo:
            continue
        
        fecha = parse_fecha(fecha_raw)
        if not fecha:
            continue
            
        rows.append({
            'hora': hora,
            'telefono': telefono,
            'nombre': nombre_completo,
            'fecha': fecha,
            'fecha_raw': fecha_raw,
        })

print(f"📊 Registros válidos: {len(rows)}")

# Generar SQL
sql_lines = ["-- Auto-generated: Update joinDate from ALUMNOS-ARCAGYM.csv", "BEGIN;", ""]

for r in rows:
    sql_lines.append(
        f"UPDATE \"Member\" SET \"joinDate\" = '{r['fecha']}' "
        f"WHERE phone = '{r['telefono']}' AND \"joinDate\" >= '2026-02-18 00:00:00';"
    )

sql_lines.append("")
sql_lines.append("-- Verificar resultados")
sql_lines.append("SELECT \"firstName\", \"lastName\", phone, \"joinDate\"::date as fecha_ingreso FROM \"Member\" ORDER BY \"joinDate\", \"lastName\";")
sql_lines.append("")
sql_lines.append("COMMIT;")

sql_content = "\n".join(sql_lines)

sql_file = "/tmp/update_joindate.sql"
with open(sql_file, 'w') as f:
    f.write(sql_content)

print(f"\n📄 SQL generado: {sql_file} ({len(rows)} UPDATEs)")
print("--- Primeras 10 líneas ---")
for line in sql_lines[:13]:
    print(f"  {line}")
print("  ...")
print("---\n")

# Ejecutar en VPS
print("🚀 Ejecutando en VPS...")
cmd = [
    "ssh", "-p", VPS_PORT, f"root@{VPS_HOST}",
    f"docker exec -i elarca-postgres psql -U {DB_USER} -d {DB_NAME}"
]

result = subprocess.run(cmd, input=sql_content, capture_output=True, text=True)

if result.returncode != 0:
    print(f"❌ Error: {result.stderr}")
    sys.exit(1)

# Contar updates exitosos
update_lines = [l for l in result.stdout.splitlines() if l.startswith("UPDATE")]
successful = sum(1 for l in update_lines if l != "UPDATE 0")
failed = sum(1 for l in update_lines if l == "UPDATE 0")

print(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
print(f"\n✅ Completado: {successful} actualizados, {failed} sin match")
