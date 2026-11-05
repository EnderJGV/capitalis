# Capitalis — frontend

Interfaz de Capitalis (finanzas personales) en **React 19 + Vite + Tailwind CSS v4 + shadcn/ui**, en español, portugués e inglés. El backend está en [capitalis-backend](https://github.com/EnderJGV/capitalis-backend).

## Local

```bash
npm install
npm run dev      # http://localhost:5173 — /api se redirige al backend en http://127.0.0.1:8000
npm run build    # tsc + vite build → dist/
```

## Deploy en la Vercel

1. **Vercel** → *Add New* → *Project* → importar este repositorio. Detecta Vite (`vercel.json`: build `npm run build`, salida `dist`).
2. Variable de entorno **`VITE_API_URL`** = la URL del backend en el Render, sin `/` final (p. ej. `https://capitalis-backend.onrender.com`). Se lee al compilar: si la cambias, vuelve a hacer *Redeploy*.
3. En el Render, pon la URL de la Vercel en `CORS_ORIGINS` del backend.

`vercel.json` reescribe todas las rutas a `index.html`, así que recargar `/objetivos/12` o `/cuentas/3` funciona.
