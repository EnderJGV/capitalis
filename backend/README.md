# Capitalis — backend

API de Capitalis (finanzas personales) en **FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL**, con Clean Architecture (`domain` → `application` → `infrastructure` / `presentation`). El frontend está en [capitalis-frontend](https://github.com/EnderJGV/capitalis-frontend).

## Local

```bash
docker compose up -d --wait                              # Postgres 16 en el puerto 5433 (docker-compose.yml)
python -m venv .venv                                     # solo la primera vez
.venv/Scripts/python -m pip install -r requirements.txt   # Linux/macOS: .venv/bin/python
cp .env.example .env                                     # y cambia JWT_SECRET por un valor largo y aleatorio
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000   # http://127.0.0.1:8000 (docs en /docs)
.venv/Scripts/python -m pytest                           # sin base ni red: UnitOfWork en memoria y cotizaciones falsas
```

En PowerShell usa `\` en las rutas (`.venv\Scripts\python`) y `copy` en vez de `cp`. Si `python -m venv .venv` falla con "Unable to copy ... venvlauncher.exe", el venv ya existe y alguno de sus procesos está corriendo; detén el servidor antes de recrearlo.

## Migraciones

Al iniciar, el backend aplica las migraciones de **Alembic** (`alembic upgrade head`); una base creada antes de Alembic se marca automáticamente con la revisión inicial. Para crear una migración nueva:

```bash
.venv/Scripts/python -m alembic revision -m "descripción"   # y escribe upgrade()/downgrade() en alembic/versions/
.venv/Scripts/python -m alembic check                       # los modelos y la base coinciden
```

`alembic upgrade <desde>:head --sql` imprime el SQL sin conectarse, útil para revisarlo o aplicarlo a mano en Supabase (SQL Editor o MCP). Si lo aplicas a mano, incluye el `UPDATE alembic_version` para que el backend no intente repetirlo, y cambia `%%I` por `%I` (el modo offline duplica los `%`).

## Variables de entorno

| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<clave>@aws-<n>-<región>.pooler.supabase.com:6543/postgres?sslmode=require` | Se acepta `postgresql://`, `postgres://` o `postgresql+psycopg://`. Puerto 6543 = transaction pooler (Vercel). |
| `JWT_SECRET` | cadena larga y aleatoria | Firma los tokens de sesión. |
| `JWT_EXPIRE_MINUTES` | `720` | |
| `CORS_ORIGINS` | `https://capitalis-frontend.vercel.app` | Separados por coma, sin `/` final. |
| `CORS_ORIGIN_REGEX` | `^https://capitalis-frontend(-[a-z0-9-]+)?\.vercel\.app$` | Opcional: vistas previas de la Vercel. |
| `RUN_MIGRATIONS_ON_STARTUP` | `true` | Opcional. Por defecto `true`, salvo en la Vercel (`false`). |

## Deploy en la Vercel + base en Supabase

La Vercel detecta FastAPI sola (`app` en `app/main.py`) y usa Python 3.13 (`.python-version`).

1. **Supabase**: el esquema ya está creado hasta la última migración (`alembic_version` lo registra). En **Connect** copia la cadena del **Transaction pooler** (puerto **6543**, IPv4), la indicada para funciones serverless, y agrega `?sslmode=require`. Con el puerto 6543 el backend no usa pool propio ni prepared statements (`engine_options` en `session.py`).
2. **Vercel** → *Add New* → *Project* → importar este repositorio, o `vercel deploy --prod` desde esta carpeta.
3. Variables de entorno (Production y Preview): `DATABASE_URL`, `JWT_SECRET` (cadena larga y aleatoria), `CORS_ORIGINS` (URL del frontend, sin `/` final) y, opcional, `CORS_ORIGIN_REGEX` para las vistas previas del frontend.
4. **Migraciones**: en la Vercel no corren al arrancar (varias instancias podrían hacerlo a la vez). Las aplica el build de **producción** (`buildCommand` de `vercel.json` → `scripts/vercel_build.py`); las vistas previas no tocan el esquema.
5. `vercel.json` deja fuera de la función `tests/` y `scripts/`; `.vercelignore` evita subir `.env` y `.venv` con `vercel deploy`.

La migración `0005` activa **Row Level Security** en todas las tablas y quita los permisos de `anon` y `authenticated`: la Data API de Supabase no puede leerlas ni escribirlas. El backend entra como `postgres`, dueño de las tablas, y no se ve afectado. Por eso el Security Advisor muestra "RLS Enabled No Policy": es intencional.

### Alternativa: Render

`render.yaml` es un Blueprint del Render (*New* → *Blueprint*). Ahí el servicio es un proceso continuo: usa el **Session pooler** (puerto 5432) y las migraciones corren al arrancar. En el plan gratis se apaga tras 15 minutos sin uso.

## Arquitectura (`app/`)

Las dependencias apuntan siempre hacia adentro: `presentation → application → domain` e `infrastructure → application/domain`.

| Capa | Contenido |
|---|---|
| `domain/` | Entidades (dataclasses), reglas, excepciones y *puertos* de repositorio (`Protocol`). Sin frameworks. |
| `application/` | Casos de uso (`RegisterUser`, `CreateTransaction`, `GetSummary`…) y puertos (`UnitOfWork`, `PasswordHasher`, `TokenService`). |
| `infrastructure/` | SQLAlchemy (modelos, repositorios, Unit of Work), bcrypt, JWT y configuración. |
| `presentation/` | FastAPI: routers, schemas Pydantic, dependencias y traducción de errores de dominio a HTTP. |
| `container.py` | Composition root: único lugar que conecta implementaciones concretas con los casos de uso. |

Los errores llegan al frontend con un `code` estable (el nombre de la excepción) que este traduce al idioma del usuario.

## Cuentas, transferencias y monedas

- Cada movimiento pertenece a una **cuenta** (banco, billetera digital o efectivo) con su propia moneda. Sin cuentas no se pueden registrar movimientos.
- Las **transferencias** mueven dinero entre cuentas: con monedas distintas se guarda el monto enviado, el recibido y el tipo de cambio; la **comisión** opcional se registra como un gasto de la cuenta origen (categoría "Comisiones bancarias") enlazado a la transferencia.
- Las transferencias no cuentan como ingreso ni gasto.
- **Cotizaciones**: el backend las pide a [currency-api](https://github.com/fawazahmed0/exchange-api) (gratuita, sin clave) y las guarda por día en `exchange_rates`. Se usan para sugerir el tipo de cambio y para convertir los totales del Resumen a la **moneda principal** del usuario.
- **Catálogo de instituciones** (`app/data/catalog`, servido en `/api/catalog`): se construye con `.venv/Scripts/python -m scripts.catalog.build` (descargas en caché en `scripts/catalog/.cache`). Los ids del primer catálogo (`scripts/catalog/curated/legacy.py`) ya están guardados en cuentas y nunca pueden desaparecer.

## Tarjetas de crédito

- Una tarjeta es una cuenta especial (`kind = credit_card`): su saldo es la deuda (negativo) y resta del patrimonio. Solo se guardan los últimos 4 dígitos, nunca el número completo ni el código de seguridad.
- Las compras cuentan en la fecha de compra, en su categoría. Pagar la factura es una transferencia de una cuenta a la tarjeta y no vuelve a contar como gasto.
- Las facturas no se guardan: se calculan con los días de cierre y vencimiento (abierta, cerrada, pago parcial, vencida, pagada o a favor). Si el día no existe en el mes, se usa el último.
- Compras en cuotas (2 a 48): cada cuota entra en su mes y en su factura. Compras en otra moneda guardan el monto original, la moneda y el tipo de cambio; la tarifa internacional es un gasto aparte, enlazado a la compra.
- Un reembolso en la tarjeta reduce la deuda y resta del gasto de su categoría (no cuenta como ingreso).

## Objetivos de ahorro

- Un objetivo es una meta en dinero, **material** o **personal**, con monto, moneda y fecha límite opcional.
- Los **aportes son virtuales**: el dinero sigue en su cuenta y solo queda reservado para el objetivo. No son movimientos, así que no cambian saldos, ingresos ni gastos. Un aporte negativo es un retiro, y no puede dejar el objetivo en negativo.
- Con fecha límite se calcula cuánto aportar por mes (meses restantes contando el actual), el ritmo (al día, un poco atrasado, atrasado o vencido) y, con el promedio de los últimos 3 meses, cuándo se cumpliría.
- Estados: activo → **cumplido** al llegar a la meta (sigue reservado; si un retiro lo baja vuelve a activo) → **logrado** cuando la persona lo marca (deja de reservar). También se puede archivar y reactivar.
- API: `/api/goals` (CRUD, `POST /{id}/status` y `/{id}/contributions`); la lógica pura está en `app/domain/goals.py`.

## Pendiente

- Conectar cuentas automáticamente con los bancos (Open Finance) e importar extractos (OFX/CSV/PDF).
- Intereses del rotativo y pago mínimo calculados automáticamente (hoy se registran como un gasto).
- Avisos de vencimiento por e-mail o push.
- Objetivos: mover dinero real a una cuenta de ahorro vinculada, aportes recurrentes y objetivos compartidos.
- Más tests (repositorios SQL con una base de prueba).
