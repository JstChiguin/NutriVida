#!/usr/bin/env bash
set -u

DIRECTORIO_PRUEBAS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$DIRECTORIO_PRUEBAS/../nutrivida-dominio-automatico.sh"
DIRECTORIO_TRABAJO="${1:?Indique un directorio de trabajo sin espacios}"
CONTENEDOR="nutrivida-https-prueba"
VOLUMEN="nutrivida-https-prueba-datos"
PUERTO_HTTPS_PRUEBA=18443
PUERTO_IMDS_PRUEBA=18169
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }

APROBADAS=0
FALLIDAS=0

aprobar() { APROBADAS=$((APROBADAS + 1)); printf '  ok: %s\n' "$1"; }
fallar() { FALLIDAS=$((FALLIDAS + 1)); printf '  FALLO: %s\n' "$1"; }
afirmar_igual() { if [ "$2" = "$3" ]; then aprobar "$1"; else fallar "$1 (esperado '$3', obtenido '$2')"; fi; }
afirmar_contiene() { if grep -qF -- "$3" <<< "$2"; then aprobar "$1"; else fallar "$1 (no contiene '$3')"; fi; }

S="$DIRECTORIO_TRABAJO/caddy-real"
rm -rf "$S"
mkdir -p "$S/caddy" "$S/doble"
cp "$DIRECTORIO_PRUEBAS/doble/resolvedor" "$S/doble/"
chmod +x "$S/doble/resolvedor"
export SANDBOX="$S"

case "$(uname -s)" in
    MINGW*|MSYS*)
        mkdir -p "$S/ajuste-windows"
        printf '#!/usr/bin/env bash
exec "%s" --ssl-no-revoke "$@"
' "$(command -v curl)" > "$S/ajuste-windows/curl"
        chmod +x "$S/ajuste-windows/curl"
        export PATH="$(cygpath -u "$S/ajuste-windows"):$PATH"
        ;;
esac

limpiar() {
    docker rm -f "$CONTENEDOR" >/dev/null 2>&1
    docker volume rm "$VOLUMEN" >/dev/null 2>&1
    [ -n "${PID_IMDS:-}" ] && kill "$PID_IMDS" 2>/dev/null
}
trap limpiar EXIT

crear_caddyfile() {
    cat > "$S/caddy/Caddyfile" <<CADDY
{
	auto_https disable_redirects
}

$1 {
	tls internal
	handle /.env {
		respond 403
	}
	handle /clinico/api/v1/internos/* {
		respond 404
	}
	handle /clinico/api/v1/servicios {
		respond 200
	}
	handle /clinico/api/v1/nutricionistas {
		respond 200
	}
	handle /clinico/api/v1/pacientes {
		respond 401
	}
	handle /autenticacion/* {
		@ajeno header Origin https://origen-no-permitido.invalid
		respond @ajeno 403
		respond 401
	}
	handle /agenda/* {
		@ajeno header Origin https://origen-no-permitido.invalid
		respond @ajeno 403
		respond 401
	}
	handle {
		respond "React" 200
	}
}
CADDY
}

ruta_nativa() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
huella() { sha256sum "$1" | cut -d' ' -f1; }

huella_contenedor_real() {
    docker inspect --format '{{.Id}} {{.State.StartedAt}} {{.RestartCount}}' "$CONTENEDOR"
}

esperar_certificado() {
    local dominio="$1" i
    for i in $(seq 1 30); do
        if curl --silent --output /dev/null --max-time 5 --cacert "$RAIZ" --resolve "$dominio:$PUERTO_HTTPS_PRUEBA:127.0.0.1" "https://$dominio:$PUERTO_HTTPS_PRUEBA/" 2>/dev/null; then
            return 0
        fi
        sleep 1
    done
    return 1
}

ejecutar() {
    SALIDA="$(
        env NUTRIVIDA_CONFIGURACION="$S/no-existe.conf" \
            CONTENEDOR_CADDY="$CONTENEDOR" \
            ARCHIVO_CADDYFILE="$S/caddy/Caddyfile" \
            RUTA_CADDYFILE_EN_CONTENEDOR="/etc/caddy/Caddyfile" \
            DIRECTORIO_RESPALDOS="$S/respaldos" \
            DIRECTORIO_ESTADO="$S/estado" \
            ARCHIVO_REGISTRO="$S/registro.log" \
            ARCHIVO_DESACTIVADO="$S/desactivado" \
            URL_IMDS="http://127.0.0.1:$PUERTO_IMDS_PRUEBA" \
            COMANDO_RESOLVEDOR="$S/doble/resolvedor" \
            PUERTO_HTTPS="$PUERTO_HTTPS_PRUEBA" \
            CERTIFICADO_CA_ADICIONAL="$RAIZ" \
            PAUSA_SEGUNDOS=2 \
            REINTENTOS_DOCKER=2 REINTENTOS_CADDY=2 REINTENTOS_IMDS=2 REINTENTOS_DNS=2 \
            REINTENTOS_HTTPS=15 REINTENTOS_ENDPOINTS=3 \
            bash "$SCRIPT" "$@" 2>&1
    )"
    CODIGO=$?
}

registrar_dns() { printf '%s.sslip.io %s\n' "${1//./-}" "$1" >> "$S/dns.tsv"; }
establecer_ip() { printf '%s' "$1" > "$S/ip_publica"; }

establecer_ip 32.197.182.207
: > "$S/dns.tsv"
registrar_dns 32.197.182.207
python -I "$(ruta_nativa "$DIRECTORIO_PRUEBAS/imds-falso.py")" "$PUERTO_IMDS_PRUEBA" "$(ruta_nativa "$S/ip_publica")" &
PID_IMDS=$!

docker rm -f "$CONTENEDOR" >/dev/null 2>&1
docker volume rm "$VOLUMEN" >/dev/null 2>&1
crear_caddyfile 32-197-182-207.sslip.io
docker run -d --name "$CONTENEDOR" --restart unless-stopped \
    -p "127.0.0.1:$PUERTO_HTTPS_PRUEBA:443" \
    -v "$S/caddy/Caddyfile:/etc/caddy/Caddyfile" \
    -v "$VOLUMEN:/data" caddy:2 >/dev/null || { echo "No se pudo crear el contenedor de prueba"; exit 2; }

sleep 4
RAIZ="$S/raiz.crt"
for i in $(seq 1 20); do
    docker cp "$CONTENEDOR:/data/caddy/pki/authorities/local/root.crt" "$RAIZ" >/dev/null 2>&1 && break
    sleep 1
done
[ -s "$RAIZ" ] || { echo "No se obtuvo la CA local de Caddy"; exit 2; }
esperar_certificado 32-197-182-207.sslip.io || { echo "Caddy no emitio el certificado inicial"; exit 2; }

HUELLA_INICIAL="$(huella "$S/caddy/Caddyfile")"
VOLUMENES_ANTES="$(docker volume ls -q | sort | tr '\n' ' ')"

printf '\n== R1. IP sin cambios con Caddy real\n'
ejecutar --aplicar
afirmar_igual "codigo 0" "$CODIGO" "0"
afirmar_contiene "no cambio" "$SALIDA" "El dominio no cambio"
afirmar_contiene "HTTPS valido con verificacion TLS completa" "$SALIDA" "HTTPS valido en 32-197-182-207.sslip.io"
afirmar_contiene "13 de 13 comprobaciones" "$SALIDA" "13 de 13 correctas"
afirmar_igual "Caddyfile intacto" "$(huella "$S/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "sin respaldos" "$(ls "$S/respaldos" 2>/dev/null | wc -l | tr -d ' ')" "0"

printf '\n== R2. IP modificada con validate y reload reales\n'
CONTENEDOR_ANTES="$(huella_contenedor_real)"
establecer_ip 54.201.10.33
registrar_dns 54.201.10.33
ejecutar --aplicar
afirmar_igual "codigo 0" "$CODIGO" "0"
afirmar_contiene "valido la candidata" "$SALIDA" "Caddy valido la configuracion candidata"
afirmar_contiene "recargo sin reiniciar" "$SALIDA" "Caddy recargado sin reiniciar"
afirmar_contiene "certificado del dominio nuevo verificado por TLS" "$SALIDA" "HTTPS valido en 54-201-10-33.sslip.io"
afirmar_contiene "13 de 13 comprobaciones" "$SALIDA" "13 de 13 correctas"
esperado="$(sed 's/32-197-182-207\.sslip\.io/54-201-10-33.sslip.io/' "$S"/respaldos/Caddyfile.*.respaldo | sha256sum | cut -d' ' -f1)"
actual="$(sha256sum < "$S/caddy/Caddyfile" | cut -d' ' -f1)"
afirmar_igual "solo cambio el dominio (resto igual al respaldo)" "$actual" "$esperado"
afirmar_igual "el contenedor es el mismo, no se reinicio" "$(huella_contenedor_real)" "$CONTENEDOR_ANTES"
afirmar_igual "no se crearon ni borraron volumenes" "$(docker volume ls -q | sort | tr '\n' ' ')" "$VOLUMENES_ANTES"
afirmar_igual "el respaldo es el original" "$(huella "$(ls "$S"/respaldos/Caddyfile.*.respaldo | head -n 1)")" "$HUELLA_INICIAL"
afirmar_igual "un solo respaldo" "$(ls "$S"/respaldos/Caddyfile.*.respaldo | wc -l | tr -d ' ')" "1"

printf '\n== R3. Idempotencia\n'
HUELLA_NUEVA="$(huella "$S/caddy/Caddyfile")"
ejecutar --aplicar
afirmar_igual "codigo 0" "$CODIGO" "0"
afirmar_contiene "sin cambios" "$SALIDA" "El dominio no cambio"
afirmar_igual "Caddyfile identico" "$(huella "$S/caddy/Caddyfile")" "$HUELLA_NUEVA"
afirmar_igual "sigue un respaldo" "$(ls "$S"/respaldos/Caddyfile.*.respaldo | wc -l | tr -d ' ')" "1"
afirmar_igual "mismo contenedor" "$(huella_contenedor_real)" "$CONTENEDOR_ANTES"

printf '\n== R4. Fallo de DNS\n'
establecer_ip 70.1.2.3
ejecutar --aplicar
afirmar_igual "codigo 23" "$CODIGO" "23"
afirmar_igual "Caddyfile intacto" "$(huella "$S/caddy/Caddyfile")" "$HUELLA_NUEVA"

printf '\n== R5. Configuracion invalida real\n'
registrar_dns 70.1.2.3
cp "$S/caddy/Caddyfile" "$S/Caddyfile.valido"
sed -i 's/^\ttls internal$/\ttls internal\n\tdirectiva_que_no_existe/' "$S/caddy/Caddyfile"
HUELLA_INVALIDA="$(huella "$S/caddy/Caddyfile")"
ejecutar --aplicar
afirmar_igual "codigo 25" "$CODIGO" "25"
afirmar_contiene "Caddy real rechaza la candidata" "$SALIDA" "Caddy rechazo la configuracion candidata"
afirmar_igual "archivo intacto" "$(huella "$S/caddy/Caddyfile")" "$HUELLA_INVALIDA"
afirmar_igual "el contenedor sigue siendo el mismo" "$(huella_contenedor_real)" "$CONTENEDOR_ANTES"
afirmar_igual "sigue un respaldo" "$(ls "$S"/respaldos/Caddyfile.*.respaldo | wc -l | tr -d ' ')" "1"
cp "$S/Caddyfile.valido" "$S/caddy/Caddyfile"

printf '\n== R6. Caddy detenido y recuperacion\n'
docker stop "$CONTENEDOR" >/dev/null
ejecutar --aplicar
afirmar_igual "codigo 21" "$CODIGO" "21"
afirmar_igual "Caddyfile intacto" "$(huella "$S/caddy/Caddyfile")" "$HUELLA_NUEVA"
ejecutar --aplicar --modo-servicio
afirmar_igual "modo servicio: codigo 0" "$CODIGO" "0"
docker start "$CONTENEDOR" >/dev/null
sleep 4
CONTENEDOR_ANTES="$(huella_contenedor_real)"
ejecutar --aplicar
afirmar_igual "tras reiniciar Caddy y con IP nueva: codigo 0" "$CODIGO" "0"
afirmar_contiene "dominio actualizado tras recuperarse" "$SALIDA" "54-201-10-33.sslip.io -> 70-1-2-3.sslip.io"
afirmar_contiene "certificado del dominio nuevo verificado" "$SALIDA" "HTTPS valido en 70-1-2-3.sslip.io"

printf '\n== R7. admin off real\n'
sed -i 's/auto_https disable_redirects/admin off\n\tauto_https disable_redirects/' "$S/caddy/Caddyfile"
HUELLA_ADMIN="$(huella "$S/caddy/Caddyfile")"
establecer_ip 80.9.9.9
registrar_dns 80.9.9.9
ejecutar --aplicar
afirmar_igual "codigo 30" "$CODIGO" "30"
afirmar_igual "archivo intacto" "$(huella "$S/caddy/Caddyfile")" "$HUELLA_ADMIN"

printf '\n== R8. Reversion real\n'
sed -i '/admin off/d' "$S/caddy/Caddyfile"
ejecutar --revertir
afirmar_igual "codigo 0" "$CODIGO" "0"
afirmar_contiene "revierte" "$SALIDA" "configuracion_revertida"
afirmar_contiene "el Caddyfile revertido usa un dominio de un respaldo" "$(cat "$S/caddy/Caddyfile")" ".sslip.io"
afirmar_igual "mismo contenedor" "$(huella_contenedor_real)" "$CONTENEDOR_ANTES"
afirmar_igual "volumenes sin cambios" "$(docker volume ls -q | sort | tr '\n' ' ')" "$VOLUMENES_ANTES"

printf '\nAprobadas: %s   Fallidas: %s\n' "$APROBADAS" "$FALLIDAS"
[ "$FALLIDAS" -eq 0 ]
