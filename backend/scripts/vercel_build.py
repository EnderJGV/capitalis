"""Build del backend en la Vercel (`buildCommand` de vercel.json).

Aplica las migraciones de Alembic una sola vez por deploy, y solo en producción: las vistas
previas usan la misma base y no deben cambiar su esquema con migraciones de una rama sin terminar.
"""

import os

from app.infrastructure.database.session import create_tables

if os.environ.get("VERCEL_ENV") == "production":
    print("Aplicando migraciones (alembic upgrade head)…", flush=True)
    create_tables()
else:
    print(f"VERCEL_ENV={os.environ.get('VERCEL_ENV')!r}: no se aplican migraciones.", flush=True)
