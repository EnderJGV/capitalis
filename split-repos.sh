#!/usr/bin/env bash
# Separa backend/ y frontend/ en dos repositorios, conservando el historial de cada carpeta.
#
#   ./split-repos.sh                          crea las ramas locales split/backend y split/frontend
#   ./split-repos.sh <url-backend> <url-front> además las sube como "main" a esos repositorios (vacíos)
#
# Usa solo lo que ya está commiteado: los cambios sin commit no entran.
set -euo pipefail

cd "$(dirname "$0")"

if [ -n "$(git status --porcelain -- backend frontend)" ]; then
  echo "Hay cambios sin commit en backend/ o frontend/. Haz commit antes de separar." >&2
  exit 1
fi

for dir in backend frontend; do
  echo "→ split/$dir (historial de $dir/)"
  sha="$(git subtree split --prefix="$dir")"
  git branch -f "split/$dir" "$sha"   # rehace la rama si ya existía (p. ej. al volver a correrlo)
done

if [ $# -eq 2 ]; then
  git push "$1" split/backend:main
  git push "$2" split/frontend:main
  echo "Listo. Clona cada repositorio por separado para seguir trabajando."
else
  echo "Ramas creadas. Para subirlas:"
  echo "  git push <url-capitalis-backend>  split/backend:main"
  echo "  git push <url-capitalis-frontend> split/frontend:main"
fi
