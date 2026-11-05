/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen del backend en producción, p. ej. https://capitalis-backend.vercel.app */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
