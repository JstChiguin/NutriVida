#!/usr/bin/env bash
set -u
umask 022

HUELLA_SCRIPT="@@HUELLA_SCRIPT@@"
HUELLA_UNIDAD="@@HUELLA_UNIDAD@@"
HUELLA_CONFIGURACION="@@HUELLA_CONFIGURACION@@"

DESTINO_SCRIPT="/usr/local/sbin/nutrivida-dominio-automatico"
DESTINO_UNIDAD="/etc/systemd/system/nutrivida-dominio-automatico.service"
DESTINO_CONFIGURACION="/etc/nutrivida/dominio-automatico.conf"
ARCHIVO_DESACTIVADO="/etc/nutrivida/dominio-automatico.desactivado"

abortar() {
    printf 'INSTALACION CANCELADA: %s\nNo se modifico Caddy, Docker, el backend, los certificados ni los secretos.\n' "$1" >&2
    exit 1
}

[ "$(id -u)" -eq 0 ] || abortar "ejecute con sudo"
command -v systemctl >/dev/null 2>&1 || abortar "systemd no esta disponible"
command -v sha256sum >/dev/null 2>&1 || abortar "falta sha256sum"

DIRECTORIO_TRABAJO="$(mktemp -d)" || abortar "no se pudo crear un directorio temporal"
trap 'rm -rf "$DIRECTORIO_TRABAJO"' EXIT

cat > "$DIRECTORIO_TRABAJO/script" <<'EOF_CARGA_SCRIPT'
@@CARGA_SCRIPT@@
EOF_CARGA_SCRIPT

cat > "$DIRECTORIO_TRABAJO/unidad" <<'EOF_CARGA_UNIDAD'
@@CARGA_UNIDAD@@
EOF_CARGA_UNIDAD

cat > "$DIRECTORIO_TRABAJO/configuracion" <<'EOF_CARGA_CONFIGURACION'
@@CARGA_CONFIGURACION@@
EOF_CARGA_CONFIGURACION

verificar_huella() {
    local archivo="$1" esperada="$2" obtenida
    obtenida="$(sha256sum "$archivo" | cut -d' ' -f1)"
    if [ "$obtenida" != "$esperada" ]; then
        abortar "la huella SHA-256 de $(basename "$archivo") no coincide (esperada ${esperada:0:12}..., obtenida ${obtenida:0:12}...)"
    fi
    printf 'SHA-256 correcto: %s (%s...)\n' "$(basename "$archivo")" "${obtenida:0:12}"
}

verificar_huella "$DIRECTORIO_TRABAJO/script" "$HUELLA_SCRIPT"
verificar_huella "$DIRECTORIO_TRABAJO/unidad" "$HUELLA_UNIDAD"
verificar_huella "$DIRECTORIO_TRABAJO/configuracion" "$HUELLA_CONFIGURACION"

bash -n "$DIRECTORIO_TRABAJO/script" || abortar "el script principal tiene errores de sintaxis"

printf '\nComprobaciones previas (solo lectura)...\n'
if ! bash "$DIRECTORIO_TRABAJO/script" --comprobar-requisitos; then
    abortar "las comprobaciones previas fallaron; revise el mensaje anterior"
fi

instalar_archivo() {
    local origen="$1" destino="$2" modo="$3"
    if [ -f "$destino" ] && [ "$(sha256sum "$destino" | cut -d' ' -f1)" = "$(sha256sum "$origen" | cut -d' ' -f1)" ]; then
        printf 'Sin cambios: %s\n' "$destino"
        return 0
    fi
    if [ -f "$destino" ]; then
        cp -p "$destino" "${destino}.anterior.$(date '+%Y%m%d-%H%M%S')" || abortar "no se pudo respaldar $destino"
    fi
    install -m "$modo" -o root -g root "$origen" "$destino" || abortar "no se pudo instalar $destino"
    printf 'Instalado: %s\n' "$destino"
}

install -d -m 0755 /etc/nutrivida /usr/local/sbin
instalar_archivo "$DIRECTORIO_TRABAJO/script" "$DESTINO_SCRIPT" 0750
instalar_archivo "$DIRECTORIO_TRABAJO/unidad" "$DESTINO_UNIDAD" 0644

if [ -f "$DESTINO_CONFIGURACION" ]; then
    printf 'Configuracion existente conservada: %s\n' "$DESTINO_CONFIGURACION"
else
    install -m 0644 -o root -g root "$DIRECTORIO_TRABAJO/configuracion" "$DESTINO_CONFIGURACION" || abortar "no se pudo crear la configuracion"
    printf 'Configuracion creada: %s\n' "$DESTINO_CONFIGURACION"
fi

systemctl daemon-reload || abortar "systemctl daemon-reload fallo"
systemctl enable nutrivida-dominio-automatico.service >/dev/null 2>&1 || abortar "no se pudo habilitar la unidad"

printf '\nINSTALACION COMPLETA. No se inicio ningun cambio sobre Caddy.\n'
if [ -e "$ARCHIVO_DESACTIVADO" ]; then
    printf 'Atencion: existe %s; la automatizacion sigue desactivada hasta ejecutar --reactivar.\n' "$ARCHIVO_DESACTIVADO"
fi
printf '\nSiguientes pasos (ejecutelos usted, uno a la vez):\n'
printf '  sudo nutrivida-dominio-automatico --verificar     comprobacion sin cambios\n'
printf '  sudo nutrivida-dominio-automatico --aplicar       primera ejecucion real (idempotente)\n'
printf '  sudo nutrivida-dominio-automatico --estado        ultimo resultado\n'
printf '  sudo nutrivida-dominio-automatico --desactivar    apagar la automatizacion\n'
printf '  sudo nutrivida-dominio-automatico --revertir      restaurar el ultimo respaldo de Caddyfile\n'
printf '  sudo nutrivida-dominio-automatico --desinstalar   retirar la unidad (conserva respaldos)\n'
printf '  tail -n 40 /var/log/nutrivida-dominio.log         registro\n'
