#!/usr/bin/env sh
set -eu

# Actualiza la rama de producción y reconstruye solo lo necesario.
# Uso: ./infraestructura/despliegue/actualizar.sh

RAMA="${LINEABAR_RAMA:-main}"

cd "$(dirname "$0")/../.."

git fetch origin "$RAMA"
git checkout "$RAMA"
git pull --ff-only origin "$RAMA"
docker compose up --build -d
docker compose ps
