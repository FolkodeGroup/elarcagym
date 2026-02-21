#!/usr/bin/env python3
"""
Inserta los 13 socios del CSV que no tenían match en la base de datos.
También marca los 2 socios con teléfono dudoso.
Usa SSH + docker exec para ejecutar en la VPS.

Uso: python3 backend/scripts/insertar_socios_faltantes.py
"""
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent

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

def ssh_psql(sql: str) -> str:
    """Ejecuta SQL en PostgreSQL de la VPS vía SSH + docker exec."""
    escaped = sql.replace('"', '\\"')
    cmd = f'docker exec elarca-postgres psql -U {DB_USER} -d {DB_NAME} -c "{escaped}"'
    result = subprocess.run(
        ["ssh", "-p", VPS_PORT, f"root@{VPS_HOST}", cmd],
        capture_output=True, text=True
    )
    return result.stdout.strip() + result.stderr.strip()

# ──────────────────────────────────────────────────
# 13 SOCIOS FALTANTES (del CSV, no existían en la DB)
# Formato: (lastName, firstName, phone, joinDate)
# ──────────────────────────────────────────────────
SOCIOS_FALTANTES = [
    ("Landriel",  "Monica",      "1145308573", "2026-02-27 12:00:00"),
    ("Aguilar",   "Yesica",      "1153257899", "2026-02-19 12:00:00"),
    ("Pucheta",   "Candelaria",  "1154776019", "2026-02-28 12:00:00"),
    ("Ramirez",   "Helena",      "1138966465", "2026-02-06 12:00:00"),
    ("Cruz",      "Karen",       "1124677011", "2026-02-12 12:00:00"),
    ("Delgado",   "Crhistian",   "1171193020", "2026-02-12 12:00:00"),
    ("Luque",     "Miguel",      "1144759750", "2026-02-20 12:00:00"),
    ("Gomez",     "Eduardo",     "1124965143", "2026-02-01 12:00:00"),
    ("Lescano",   "Ximena",      "1170073099", "2026-02-03 12:00:00"),
    ("Cardozo",   "Milena",      "1126999447", "2026-02-20 12:00:00"),
    ("Diaz",      "Federico",    "1125252232", "2026-02-01 12:00:00"),
    ("Ortiz",     "Soledad",     "1123581597", "2026-02-06 12:00:00"),
    ("Recalde",   "Oriana",      "1166651894", "2026-02-01 12:00:00"),
]

# ──────────────────────────────────────────────────
# 2 SOCIOS CON TELÉFONO DUDOSO
# Existen en la DB pero con teléfono diferente al CSV
# Se actualiza su DNI para que aparezca el modal de alerta
# ──────────────────────────────────────────────────
# Montenegro Irina Ayelen: CSV=1138067400, DB tiene 1166649934
# Micaela Viera (en CSV como Viera Micaela): CSV relaciona 1132697813 con Micaela Viera
#   pero la DB tiene ese teléfono para Melina Mendez → necesita revisión
SOCIOS_TELEFONO_DUDOSO = [
    {
        "nombre": "Irina Ayelen Montenegro",
        "phone_db": "1166649934",
        "phone_csv": "1138067400",
        "nota": "TEL-VERIFICAR: CSV indica 1138067400 pero DB tiene 1166649934",
    },
    {
        "nombre": "Melina Mendez / Micaela Viera",
        "phone_db": "1132697813",
        "phone_csv": "1155735571",
        "nota": "TEL-VERIFICAR: CSV indica 1155735571 para Mendez Melina pero DB tiene 1132697813",
    },
]

def generar_sql_inserciones():
    filas = []
    for apellido, nombre, phone, fecha in SOCIOS_FALTANTES:
        dni_placeholder = f"SDNI_{phone}"
        fila = (
            f"(gen_random_uuid()::text, '{nombre}', '{apellido}', "
            f"'{dni_placeholder}', '{phone}', "
            f"'{fecha}'::timestamp, 'ACTIVE')"
        )
        filas.append(fila)

    inserts = ",\n  ".join(filas)
    return f"""
BEGIN;

INSERT INTO "Member"
  ("id", "firstName", "lastName", "dni", "phone", "joinDate", "status")
VALUES
  {inserts}
ON CONFLICT ("dni") DO NOTHING;

COMMIT;
"""

def marcar_telefonos_dudosos():
    """Actualiza el DNI de los socios con teléfono dudoso para que el modal de alerta se active."""
    sqls = []
    for s in SOCIOS_TELEFONO_DUDOSO:
        phone = s["phone_db"]
        # Solo marcar si el DNI actual no contiene ya "TEL-VERIFICAR"
        sqls.append(
            f"""UPDATE "Member" SET "dni" = 'TEL_VERIFICAR_{phone}'
  WHERE phone = '{phone}'
  AND "dni" NOT LIKE 'TEL_VERIFICAR_%';"""
        )
    return "\nBEGIN;\n" + "\n".join(sqls) + "\nCOMMIT;\n"

if __name__ == "__main__":
    print(f"🌐 Conectando a VPS {VPS_HOST}:{VPS_PORT}...\n")

    # 1. Insertar 13 socios faltantes
    print("📥 Insertando 13 socios faltantes...")
    sql_insert = generar_sql_inserciones()
    resultado = ssh_psql(sql_insert)
    print(resultado)

    # 2. Marcar 2 socios con teléfono dudoso
    print("\n⚠️  Marcando 2 socios con teléfono dudoso para revisión...")
    sql_marca = marcar_telefonos_dudosos()
    resultado2 = ssh_psql(sql_marca)
    print(resultado2)

    # 3. Verificar resultado final
    print("\n📊 Verificando socios insertados...")
    verificacion = ssh_psql(
        'SELECT "firstName", "lastName", phone, "joinDate"::date, "dni" FROM "Member" '
        'WHERE phone IN ('
        "'1145308573','1153257899','1154776019','1138966465','1124677011',"
        "'1171193020','1144759750','1124965143','1170073099','1126999447',"
        "'1125252232','1123581597','1166651894'"
        ') ORDER BY "joinDate";'
    )
    print(verificacion)

    print("\n📋 Socios con teléfono para verificar:")
    tel_check = ssh_psql(
        'SELECT "firstName", "lastName", phone, "dni" FROM "Member" '
        "WHERE \"dni\" LIKE 'TEL_VERIFICAR_%';"
    )
    print(tel_check)

    print("\n✅ Proceso completado.")
    print("\n📌 RECORDATORIO - 2 socios con teléfono dudoso:")
    for s in SOCIOS_TELEFONO_DUDOSO:
        print(f"   • {s['nombre']}")
        print(f"     → {s['nota']}")
