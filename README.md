# Capitalis — gestión de finanzas personales (MVP)

Registro/login, categorías, ingresos y gastos, y un resumen mensual.

- **DB**: PostgreSQL 16 en Docker (es lo único que corre en Docker)
- **Backend**: Python + FastAPI + SQLAlchemy, con Clean Architecture
- **Frontend**: React + Vite + TypeScript

## Arranque

```powershell
# 1. Base de datos (puerto 5433; el 5432 puede estar ocupado por otro Postgres)
copy .env.example .env
docker compose up -d --wait

# 2. Backend  -> http://127.0.0.1:8000  (docs en /docs)
cd backend
copy .env.example .env        # y cambia JWT_SECRET por un valor largo y aleatorio
python -m venv .venv          # solo la primera vez; si ya existe, omítelo
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend -> http://localhost:5173
cd frontend
npm install
npm run dev
```

**Git Bash**: usa `/` en vez de `\` (si no, bash se come las barras) y `cp` en vez de `copy`:

```bash
cd backend
cp .env.example .env
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Si `python -m venv .venv` falla con "Unable to copy ... venvlauncher.exe", el venv ya existe y alguno de sus procesos está corriendo; detén el servidor antes de recrearlo.

Las tablas se crean solas al iniciar el backend.

## Arquitectura del backend (`backend/app`)

Las dependencias apuntan siempre hacia adentro: `presentation → application → domain` e `infrastructure → application/domain`.

| Capa | Contenido |
|---|---|
| `domain/` | Entidades (dataclasses), reglas, excepciones y *puertos* de repositorio (`Protocol`). Sin frameworks. |
| `application/` | Casos de uso (`RegisterUser`, `CreateTransaction`, `GetSummary`…) y puertos (`UnitOfWork`, `PasswordHasher`, `TokenService`). |
| `infrastructure/` | SQLAlchemy (modelos, repositorios, Unit of Work), bcrypt, JWT y configuración. |
| `presentation/` | FastAPI: routers, schemas Pydantic, dependencias y traducción de errores de dominio a HTTP. |
| `container.py` | Composition root: único lugar que conecta implementaciones concretas con los casos de uso. |

## Frontend (`frontend/src`)

`domain/` (tipos) · `services/` (cliente HTTP y API) · `context/` (sesión) · `components/` · `pages/` · `utils/` · `hooks/` · `lib/`.

- **UI**: Tailwind CSS v4 + shadcn/ui. Los componentes base (generados con el CLI de shadcn) están en `components/ui/`; los de la app (`AppShell`, `MonthStrip`, `TransactionEditor`…) en `components/app/`.
- **Diseño "Banca tranquila"**: tokens de color en `src/index.css` (`:root` claro, `.dark` oscuro), con utilidades propias `text-income`, `bg-expense`, `bg-available`. Paleta de categorías en `lib/palette.ts`.
- **Tema**: automático según el sistema, con selector manual en el menú de usuario (`next-themes`, guardado en `localStorage`).
- Atajo **N**: nuevo movimiento desde cualquier pantalla.
- **Idiomas** (`src/i18n/`): español, português y English. `messages/es.ts` es la referencia y su tipo obliga a que las otras traducciones tengan las mismas claves. El idioma se guarda en la cuenta (`users.language`) y define también el formato de fechas y números; los errores del backend llegan con un `code` estable que el frontend traduce.
- **Configuración** (`/configuracion`): perfil, idioma, moneda, tema, atajos y sesión.

## Pendiente / siguientes pasos

- Migraciones con Alembic (hoy se usa `create_all`).
- Tests automatizados (los casos de uso se pueden probar con un `UnitOfWork` en memoria).
- Dockerizar backend y frontend cuando haga falta.
