# Capitalis — frontend

Interfaz de Capitalis (finanzas personales) en **React 19 + Vite + Tailwind CSS v4 + shadcn/ui**, en español, portugués e inglés. El backend está en [capitalis-backend](https://github.com/EnderJGV/capitalis-backend).

## Local

```bash
npm install
npm run dev      # http://localhost:5173 — /api se redirige al backend en http://127.0.0.1:8000
npm run build    # tsc + vite build → dist/
```

Necesita el backend corriendo en el puerto 8000 (ver su README).

## Deploy en la Vercel

1. **Vercel** → *Add New* → *Project* → importar este repositorio. Detecta Vite (`vercel.json`: build `npm run build`, salida `dist`).
2. Variable de entorno **`VITE_API_URL`** = la URL del backend (también en la Vercel), sin `/` final (p. ej. `https://capitalis-backend.vercel.app`). Se lee al compilar: si la cambias, vuelve a hacer *Redeploy*.
3. En el proyecto del backend, pon la URL del frontend en `CORS_ORIGINS`.

`vercel.json` reescribe todas las rutas a `index.html`, así que recargar `/objetivos/12` o `/cuentas/3` funciona.

## Estructura (`src/`)

`domain/` (tipos) · `services/` (cliente HTTP y API) · `context/` (sesión) · `components/` · `pages/` · `utils/` · `hooks/` · `lib/`.

- **UI**: Tailwind CSS v4 + shadcn/ui. Los componentes base (generados con el CLI de shadcn) están en `components/ui/`; los de la app (`AppShell`, `MonthStrip`, `TransactionEditor`…) en `components/app/`.
- **Diseño "Banca tranquila"**: tokens de color en `src/index.css` (`:root` claro, `.dark` oscuro), con utilidades propias `text-income`, `bg-expense`, `bg-available`. Paleta de categorías en `lib/palette.ts`.
- **Tema**: automático según el sistema, con selector manual en el menú de usuario (`next-themes`, guardado en `localStorage`).
- Atajo **N**: nuevo movimiento desde cualquier pantalla.
- **Idiomas** (`src/i18n/`): español, português y English. `messages/es.ts` es la referencia y su tipo obliga a que las otras traducciones tengan las mismas claves. El idioma se guarda en la cuenta (`users.language`) y define también el formato de fechas y números; los errores del backend llegan con un `code` estable que el frontend traduce.
- **Configuración** (`/configuracion`): perfil, idioma, moneda, tema, atajos y sesión.
- **Instituciones**: el catálogo mundial lo sirve el backend (`/api/catalog`). Los logos se piden en tiempo real por dominio (solo se envía el dominio del banco); si no hay logo, se muestra un monograma con el color de la marca.
- **Tarjetas**: el Resumen avisa de las facturas que vencen en 7 días (ámbar) o ya vencieron (rojo), con botón para pagar. Si hay alguna vencida, el menú muestra un punto rojo.
- **Objetivos**: al llegar a la meta aparece una celebración, una sola vez. El Resumen muestra lo reservado y lo libre, y los 3 objetivos más cercanos.
