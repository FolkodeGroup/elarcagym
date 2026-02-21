#!/usr/bin/env python3
"""
Compara socios del CSV ALUMNOS-ARCAGYM.csv con la base de datos de la VPS.
Muestra cuáles están sin match (teléfono no encontrado en la DB).
Usa SSH + docker exec para consultar la base, sin necesidad de túnel ni psycopg2.

Uso: python3 backend/scripts/listar_socios_sin_match.py
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

VPS_HOST = env_vars.get("VPS_HOST", "168.197.49.120")
VPS_PORT = env_vars.get("VPS_PORT", "5371")
DB_USER  = env_vars.get("DB_USER", "elarcagym_user")
DB_NAME  = env_vars.get("DB_NAME", "elarcagym")

def ssh(cmd: str) -> str:
    """Ejecuta un comando en la VPS vía SSH."""
    result = subprocess.run(
        ["ssh", "-p", VPS_PORT, f"root@{VPS_HOST}", cmd],
        capture_output=True, text=True
    )
    return result.stdout.strip()

def get_phones_from_csv():
    """Lee todos los socios del CSV y devuelve {telefono: 'Nombre Apellido'}."""
    socios = {}
    with open(CSV_FILE, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            phone = row.get('Telefono', '').strip().replace(' ', '').replace('-', '')
            nombre = row.get('Nombre', '').strip()
            apellido = row.get('Apellido', '').strip()
            fecha = row.get('Fecha de inicio', '').strip()
            if phone:
                socios[phone] = {'nombre': nombre, 'apellido': apellido, 'fecha': fecha}
    return socios

def get_phones_from_db():
    """Obtiene todos los teléfonos de la tabla Member vía SSH + docker exec + psql."""
    print(f"🌐 Consultando DB en VPS {VPS_HOST}:{VPS_PORT}...")
    query = "SELECT TRIM(phone) FROM \\\"Member\\\" WHERE phone IS NOT NULL;"
    cmd = f'docker exec elarca-postgres psql -U {DB_USER} -d {DB_NAME} -t -c "{query}"'
    output = ssh(cmd)
    if not output:
        print("❌ No se pudo obtener datos de la base. Verificar SSH y contenedor.")
        sys.exit(1)
    phones = set()
    for line in output.splitlines():
        p = line.strip().replace(' ', '').replace('-', '')
        if p:
            phones.add(p)
    return phones

if __name__ == "__main__":
    csv_socios  = get_phones_from_csv()
    db_phones   = get_phones_from_db()

    print(f"\n📊 Total socios en CSV:  {len(csv_socios)}")
    print(f"📊 Total teléfonos en DB: {len(db_phones)}")

    sin_match = [(p, d) for p, d in csv_socios.items() if p not in db_phones]
    con_match = [(p, d) for p, d in csv_socios.items() if p in db_phones]

    print(f"\n✅ Con match (actualizados): {len(con_match)}")
    print(f"❌ Sin match:               {len(sin_match)}")

    if sin_match:
        print("\n" + "="*60)
        print("SOCIOS DEL CSV SIN MATCH EN LA BASE DE DATOS:")
        print("="*60)
        print(f"{'#':<4} {'Nombre':<25} {'Apellido':<20} {'Teléfono':<15} {'Fecha inicio'}")
        print("-"*80)
        for i, (phone, d) in enumerate(sin_match, 1):
            print(f"{i:<4} {d['nombre']:<25} {d['apellido']:<20} {phone:<15} {d['fecha']}")
        print("="*60)
        print("\n⚠️  Estos socios pueden tener:")
        print("   - Teléfono diferente en la base (con/sin prefijo 11, 15, 9, etc.)")
        print("   - No estar cargados en el sistema aún")
        print("   - Formato de teléfono distinto (ej: con guiones o espacios)")
    else:
        print("\n🎉 ¡Todos los socios del CSV tienen match en la base!")

