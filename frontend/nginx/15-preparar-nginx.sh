#!/bin/sh
set -e

MODO="${MODO_TLS:-https}"
PLANTILLA="/etc/nginx/plantillas/${MODO}.conf.template"

if [ ! -f "$PLANTILLA" ]; then
    echo "MODO_TLS debe ser https o http" >&2
    exit 1
fi

mkdir -p /etc/nginx/templates
cp "$PLANTILLA" /etc/nginx/templates/default.conf.template

if [ "$MODO" != "https" ]; then
    exit 0
fi

DIRECTORIO=/etc/nginx/certificados
mkdir -p "$DIRECTORIO"

if [ -s "$DIRECTORIO/fullchain.pem" ] && [ -s "$DIRECTORIO/privkey.pem" ]; then
    echo "Se usa el certificado existente en $DIRECTORIO"
    exit 0
fi

ALTERNATIVOS="DNS:localhost,IP:127.0.0.1"
if [ -n "${NOMBRE_SERVIDOR:-}" ]; then
    case "$NOMBRE_SERVIDOR" in
        *[!0-9.]*) ALTERNATIVOS="$ALTERNATIVOS,DNS:$NOMBRE_SERVIDOR" ;;
        *) ALTERNATIVOS="$ALTERNATIVOS,IP:$NOMBRE_SERVIDOR" ;;
    esac
fi

openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout "$DIRECTORIO/privkey.pem" -out "$DIRECTORIO/fullchain.pem" \
    -subj "/CN=nutrivida" -addext "subjectAltName=$ALTERNATIVOS" >/dev/null 2>&1
chmod 600 "$DIRECTORIO/privkey.pem"
echo "Se generó un certificado autofirmado válido por 30 días ($ALTERNATIVOS)"
