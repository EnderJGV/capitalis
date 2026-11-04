# Capitalis — gestión de finanzas personales (MVP)

Registro/login, categorías, cuentas, tarjetas de crédito, objetivos de ahorro, ingresos y gastos, y un resumen mensual.

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

Al iniciar, el backend aplica las migraciones de **Alembic** (`alembic upgrade head`); una base creada antes de Alembic se marca automáticamente con la revisión inicial. Para crear una migración nueva:

```bash
cd backend
.venv/Scripts/python -m alembic revision -m "descripción"   # y escribe upgrade()/downgrade() en alembic/versions/
```

Tests del backend (sin base de datos ni red: usan un UnitOfWork en memoria y cotizaciones falsas):

```bash
cd backend
.venv/Scripts/python -m pytest
```

## Cuentas, transferencias y monedas

- Cada movimiento pertenece a una **cuenta** (banco, billetera digital o efectivo) con su propia moneda. Sin cuentas no se pueden registrar movimientos.
- Las **transferencias** mueven dinero entre cuentas: con monedas distintas se guarda el monto enviado, el recibido y el tipo de cambio; la **comisión** opcional se registra como un gasto de la cuenta origen (categoría "Comisiones bancarias") enlazado a la transferencia.
- Las transferencias no cuentan como ingreso ni gasto.
- **Cotizaciones**: el backend las pide a [currency-api](https://github.com/fawazahmed0/exchange-api) (gratuita, sin clave) y las guarda por día en `exchange_rates`. Se usan para sugerir el tipo de cambio y para convertir los totales del Resumen a la **moneda principal** del usuario (marcados con ≈).
- **Catálogo de instituciones** (`frontend/src/lib/institutions.ts`): bancos de Brasil, México, Venezuela, Colombia, EE. UU., Argentina, Chile, Perú y Europa, y billeteras como Wise o Payoneer. Los logos se piden en tiempo real por dominio (solo se envía el dominio del banco); si no hay logo, se muestra un monograma con el color de la marca.

## Tarjetas de crédito

- Una tarjeta es una cuenta especial (`kind = credit_card`): su saldo es la deuda (negativo) y resta del patrimonio. Solo se guardan los últimos 4 dígitos, nunca el número completo ni el código de seguridad.
- Las compras cuentan en la fecha de compra, en su categoría. Pagar la factura es una transferencia de una cuenta a la tarjeta y no vuelve a contar como gasto.
- Las facturas no se guardan: se calculan con los días de cierre y vencimiento (abierta, cerrada, pago parcial, vencida, pagada o a favor). Si el día no existe en el mes, se usa el último.
- Compras en cuotas (2 a 48): cada cuota entra en su mes y en su factura. Compras en otra moneda guardan el monto original, la moneda y el tipo de cambio; la tarifa internacional es un gasto aparte, enlazado a la compra.
- Un reembolso en la tarjeta reduce la deuda y resta del gasto de su categoría (no cuenta como ingreso).
- El Resumen avisa de las facturas que vencen en 7 días (ámbar) o ya vencieron (rojo), con botón para pagar. Si hay alguna vencida, el menú muestra un punto rojo.

## Objetivos de ahorro

- Un objetivo es una meta en dinero, **material** (un auto, un celular) o **personal** (un viaje, un fondo de emergencia), con monto, moneda y fecha límite opcional. Las plantillas solo cambian el emoji y el color: la lógica es la misma.
- Los **aportes son virtuales**: el dinero sigue en su cuenta y solo queda reservado para el objetivo. No son movimientos, así que no cambian saldos, ingresos ni gastos. Un aporte negativo es un retiro, y no puede dejar el objetivo en negativo.
- Con fecha límite se calcula cuánto aportar por mes (meses restantes contando el actual), el ritmo (al día, un poco atrasado, atrasado o vencido) y, con el promedio de los últimos 3 meses, cuándo se cumpliría.
- Estados: activo → **cumplido** al llegar a la meta (sigue reservado; si un retiro lo baja vuelve a activo) → **logrado** cuando la persona lo marca (deja de reservar y ofrece "Registrar el gasto"). También se puede archivar y reactivar.
- Al llegar a la meta aparece una celebración, una sola vez. El Resumen muestra lo reservado y lo libre, y los 3 objetivos más cercanos.
- API: `/api/goals` (CRUD, `POST /{id}/status` y `/{id}/contributions`); la lógica pura está en `backend/app/domain/goals.py`.

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

- Conectar cuentas automáticamente con los bancos (Open Finance) e importar extractos (OFX/CSV/PDF).
- Intereses del rotativo y pago mínimo calculados automáticamente (hoy se registran como un gasto).
- Avisos de vencimiento por e-mail o push.
- Objetivos: mover dinero real a una cuenta de ahorro vinculada, aportes recurrentes y objetivos compartidos.
- Tarjetas adicionales y tarjetas con dos monedas.
- Más tests (repositorios SQL con una base de prueba).
- Dockerizar backend y frontend cuando haga falta.
