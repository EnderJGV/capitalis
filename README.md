# Capitalis — gestión de finanzas personales

Registro/login, categorías, cuentas, tarjetas de crédito, objetivos de ahorro, ingresos y gastos, y un resumen mensual.

Son dos proyectos independientes, cada uno con su README, `.gitignore`, `.env.example` y configuración de deploy:

| Carpeta | Repositorio | Stack | Deploy |
|---|---|---|---|
| [`backend/`](backend/README.md) | `capitalis-backend` | Python + FastAPI + SQLAlchemy + Alembic | Vercel + Supabase (Postgres) |
| [`frontend/`](frontend/README.md) | `capitalis-frontend` | React + Vite + TypeScript + Tailwind | Vercel |

Ninguno de los dos lee archivos del otro: solo se comunican por la API HTTP (`/api`).

## Arranque local

```bash
cd backend  && docker compose up -d --wait && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Detalles en el README de cada proyecto.

## Separar en dos repositorios

`split-repos.sh` crea las ramas `split/backend` y `split/frontend`, cada una con el historial de su carpeta en la raíz (con `git subtree split`), y si recibe las URLs las sube como `main`:

```bash
./split-repos.sh                                   # solo crea las ramas locales
./split-repos.sh https://github.com/EnderJGV/capitalis-backend.git https://github.com/EnderJGV/capitalis-frontend.git
```

Los repositorios de GitHub tienen que existir y estar vacíos. Después, clona cada uno por separado (por ejemplo, uno al lado del otro) y trabaja y haz commits en cada uno de forma independiente. Este monorepo queda como archivo histórico.
