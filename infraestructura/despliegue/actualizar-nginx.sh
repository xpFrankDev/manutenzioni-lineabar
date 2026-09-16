#!/usr/bin/env sh
set -eu

# Sincroniza el vhost del host compartido y recarga Nginx solo si la
# configuración es válida. /etc/nginx/codex-sites pertenece al usuario deploy,
# y la validación y la recarga usan los comandos ya autorizados en sudoers.
# Uso: ./infraestructura/despliegue/actualizar-nginx.sh

ORIGEN="$(cd "$(dirname "$0")/../nginx" && pwd)"
DESTINO=/etc/nginx/codex-sites

respaldo="$DESTINO/ag-lineabar.conf.respaldo"
if [ -f "$DESTINO/ag-lineabar.conf" ]; then
  cp -f "$DESTINO/ag-lineabar.conf" "$respaldo"
fi

install -m 644 "$ORIGEN/ag-lineabar.conf" "$DESTINO/ag-lineabar.conf"
install -m 644 "$ORIGEN/bienvenida.html" "$DESTINO/bienvenida.html"

if ! sudo -n /usr/sbin/nginx -t; then
  if [ -f "$respaldo" ]; then
    cp -f "$respaldo" "$DESTINO/ag-lineabar.conf"
  fi
  echo 'Configuración de Nginx inválida: se restauró el vhost anterior.' >&2
  exit 1
fi

sudo -n /usr/bin/systemctl reload nginx
echo 'Vhost sincronizado y Nginx recargado.'
