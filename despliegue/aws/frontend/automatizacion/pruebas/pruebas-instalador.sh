#!/usr/bin/env bash
set -u

INSTALADOR="${1:?Indique la ruta del instalador generado}"
DOBLES="${2:?Indique la carpeta pruebas/doble}"

APROBADAS=0
FALLIDAS=0

aprobar() { APROBADAS=$((APROBADAS + 1)); printf '  ok: %s\n' "$1"; }
fallar() { FALLIDAS=$((FALLIDAS + 1)); printf '  FALLO: %s\n' "$1"; }
afirmar_igual() { if [ "$2" = "$3" ]; then aprobar "$1"; else fallar "$1 (esperado '$3', obtenido '$2')"; fi; }
afirmar_contiene() { if grep -qF -- "$3" <<< "$2"; then aprobar "$1"; else fallar "$1 (no contiene '$3')"; fi; }

[ "$(id -u)" -eq 0 ] || { echo "Estas pruebas requieren root dentro de un contenedor desechable"; exit 2; }

export SANDBOX=/sandbox
rm -rf "$SANDBOX"
mkdir -p "$SANDBOX/doble" /opt/nutrivida-https
cp "$DOBLES"/docker "$DOBLES"/curl "$DOBLES"/resolvedor "$SANDBOX/doble/"
cp "$DOBLES/Caddyfile.modelo" /opt/nutrivida-https/Caddyfile
printf '32.197.182.207' > "$SANDBOX/ip_publica"
printf 'abc123 2026-11-23T10:00:00Z 0 volume:caddy_datos:/v:/data;\n' > "$SANDBOX/huella_contenedor"
printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> /sandbox/llamadas_systemctl.log\nexit 0\n' > "$SANDBOX/doble/systemctl"
chmod +x "$SANDBOX/doble"/*
export PATH="$SANDBOX/doble:$PATH"
export ARCHIVO_CADDYFILE=/opt/nutrivida-https/Caddyfile

HUELLA_CADDYFILE="$(sha256sum "$ARCHIVO_CADDYFILE" | cut -d' ' -f1)"
INSTALADO=/usr/local/sbin/nutrivida-dominio-automatico

printf '\n== I1. Instalador alterado: la huella SHA-256 lo detiene\n'
sed 's/Comprobaciones previas/Comprobaciones previas MANIPULADO/; s/^VERSION_AUTOMATIZACION="1.0.0"/VERSION_AUTOMATIZACION="6.6.6"/' "$INSTALADOR" > "$SANDBOX/alterado.sh"
SALIDA="$(bash "$SANDBOX/alterado.sh" 2>&1)"
CODIGO=$?
afirmar_igual "codigo 1" "$CODIGO" "1"
afirmar_contiene "informa huella distinta" "$SALIDA" "no coincide"
afirmar_igual "no instalo nada" "$([ -e "$INSTALADO" ] && echo instalado || echo ausente)" "ausente"

printf '\n== I2. Requisitos incumplidos (Caddyfile con admin off): no instala\n'
sed -i 's/admin localhost:2019/admin off/' "$ARCHIVO_CADDYFILE"
SALIDA="$(bash "$INSTALADOR" 2>&1)"
CODIGO=$?
afirmar_igual "codigo 1" "$CODIGO" "1"
afirmar_contiene "cancela por comprobaciones previas" "$SALIDA" "INSTALACION CANCELADA"
afirmar_igual "no instalo nada" "$([ -e "$INSTALADO" ] && echo instalado || echo ausente)" "ausente"
afirmar_igual "sin unidad systemd" "$([ -e /etc/systemd/system/nutrivida-dominio-automatico.service ] && echo presente || echo ausente)" "ausente"
cp "$DOBLES/Caddyfile.modelo" "$ARCHIVO_CADDYFILE"

printf '\n== I3. Instalacion correcta\n'
SALIDA="$(bash "$INSTALADOR" 2>&1)"
CODIGO=$?
afirmar_igual "codigo 0" "$CODIGO" "0"
afirmar_contiene "verifica SHA-256 del script" "$SALIDA" "SHA-256 correcto: script"
afirmar_contiene "instalacion completa" "$SALIDA" "INSTALACION COMPLETA"
afirmar_igual "script con modo 750 y dueno root" "$(stat -c '%a %U' "$INSTALADO")" "750 root"
afirmar_igual "unidad con modo 644" "$(stat -c '%a %U' /etc/systemd/system/nutrivida-dominio-automatico.service)" "644 root"
afirmar_igual "configuracion con modo 644" "$(stat -c '%a %U' /etc/nutrivida/dominio-automatico.conf)" "644 root"
afirmar_contiene "habilito la unidad" "$(cat "$SANDBOX/llamadas_systemctl.log")" "enable nutrivida-dominio-automatico.service"
afirmar_igual "no inicio la unidad ni nada con start" "$(grep -c 'start' "$SANDBOX/llamadas_systemctl.log")" "0"
afirmar_igual "Caddyfile intacto" "$(sha256sum "$ARCHIVO_CADDYFILE" | cut -d' ' -f1)" "$HUELLA_CADDYFILE"
afirmar_igual "sin recargas de Caddy" "$([ -f "$SANDBOX/recargas" ] && wc -l < "$SANDBOX/recargas" | tr -d ' ' || echo 0)" "0"
afirmar_igual "el script instalado coincide con el del repositorio" "$(sha256sum "$INSTALADO" | cut -d' ' -f1)" "$(sed -n 's/^HUELLA_SCRIPT="\(.*\)"/\1/p' "$INSTALADOR")"

printf '\n== I4. Segunda ejecucion idempotente\n'
echo "NUTRIVIDA_PRUEBA=1" >> /etc/nutrivida/dominio-automatico.conf
SALIDA="$(bash "$INSTALADOR" 2>&1)"
CODIGO=$?
afirmar_igual "codigo 0" "$CODIGO" "0"
afirmar_contiene "script sin cambios" "$SALIDA" "Sin cambios: $INSTALADO"
afirmar_contiene "conserva la configuracion existente" "$SALIDA" "Configuracion existente conservada"
afirmar_igual "la configuracion editada no se sobrescribio" "$(grep -c NUTRIVIDA_PRUEBA /etc/nutrivida/dominio-automatico.conf)" "1"
afirmar_igual "no se crearon copias .anterior" "$(ls /usr/local/sbin/*.anterior.* /etc/systemd/system/*.anterior.* 2>/dev/null | wc -l | tr -d ' ')" "0"

printf '\n== I5. Desactivar, reactivar y desinstalar\n'
SALIDA="$("$INSTALADO" --estado 2>&1)"
afirmar_contiene "estado: activa" "$SALIDA" "automatizacion=activa"
"$INSTALADO" --desactivar >/dev/null 2>&1
afirmar_igual "interruptor creado" "$([ -e /etc/nutrivida/dominio-automatico.desactivado ] && echo si || echo no)" "si"
afirmar_contiene "desactivar deshabilita la unidad" "$(cat "$SANDBOX/llamadas_systemctl.log")" "disable nutrivida-dominio-automatico.service"
SALIDA="$("$INSTALADO" --aplicar --modo-servicio 2>&1)"
afirmar_contiene "con el interruptor no hace nada" "$SALIDA" "Automatizacion desactivada"
"$INSTALADO" --reactivar >/dev/null 2>&1
afirmar_igual "interruptor retirado" "$([ -e /etc/nutrivida/dominio-automatico.desactivado ] && echo si || echo no)" "no"
"$INSTALADO" --desinstalar >/dev/null 2>&1
afirmar_igual "unidad retirada" "$([ -e /etc/systemd/system/nutrivida-dominio-automatico.service ] && echo presente || echo ausente)" "ausente"
afirmar_igual "se conserva la configuracion" "$([ -e /etc/nutrivida/dominio-automatico.conf ] && echo presente || echo ausente)" "presente"
afirmar_igual "se conserva el comando" "$([ -e "$INSTALADO" ] && echo presente || echo ausente)" "presente"
afirmar_igual "Caddyfile sigue intacto" "$(sha256sum "$ARCHIVO_CADDYFILE" | cut -d' ' -f1)" "$HUELLA_CADDYFILE"

printf '\nAprobadas: %s   Fallidas: %s\n' "$APROBADAS" "$FALLIDAS"
[ "$FALLIDAS" -eq 0 ]
