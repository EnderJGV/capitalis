# Capitalis — backend

API de Capitalis (finanzas personales) en **FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL**, con Clean Architecture (`domain` → `application` → `infrastructure` / `presentation`). El frontend está en [capitalis-frontend](https://github.com/EnderJGV/capitalis-frontend).

## Local

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Linux/macOS: .venv/bin/python
cp .env.example .env                                     # DATABASE_URL, JWT_SECRET, CORS_ORIGINS
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
.venv/Scripts/python -m pytest
```

Las migraciones de Alembic corren solas al arrancar (`alembic upgrade head`).

## Variables de entorno

| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<clave>@aws-<n>-<región>.pooler.supabase.com:5432/postgres?sslmode=require` | Se acepta `postgresql://`, `postgres://` o `postgresql+psycopg://`. |
| `JWT_SECRET` | cadena larga y aleatoria | Firma los tokens de sesión. |
| `JWT_EXPIRE_MINUTES` | `720` | |
| `CORS_ORIGINS` | `https://capitalis-frontend.vercel.app` | Separados por coma, sin `/` final. |
| `CORS_ORIGIN_REGEX` | `^https://capitalis-frontend(-[a-z0-9-]+)?\.vercel\.app$` | Opcional: vistas previas de la Vercel. |

## Deploy en el Render + base en Supabase

1. **Supabase** → *New project* (guarda la contraseña de la base). En **Connect** copia la cadena del **Session pooler** (puerto 5432, IPv4): el Render no tiene IPv6 y la conexión directa de Supabase es IPv6. Agrega `?sslmode=require` al final.
2. **Render** → *New* → *Blueprint* → este repositorio (usa `render.yaml`), o *Web Service* con:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
   - Health check: `/api/health` · Python: `.python-version` (3.13)
3. Completa `DATABASE_URL` y `CORS_ORIGINS`. `JWT_SECRET` lo genera el Blueprint.
4. Al primer arranque se crean todas las tablas. La migración `0005` activa **Row Level Security** en todas ellas: la Data API de Supabase no puede leerlas ni escribirlas; el backend entra como dueño de las tablas y no se ve afectado.

> En el plan gratis, el Render apaga el servicio tras 15 minutos sin uso: la primera petición después tarda unos segundos.
