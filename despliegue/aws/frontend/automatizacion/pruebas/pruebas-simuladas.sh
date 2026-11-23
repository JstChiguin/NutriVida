#!/usr/bin/env bash
set -u

DIRECTORIO_PRUEBAS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$DIRECTORIO_PRUEBAS/../nutrivida-dominio-automatico.sh"
DOBLES="$DIRECTORIO_PRUEBAS/doble"

APROBADAS=0
FALLIDAS=0

fallar() {
    FALLIDAS=$((FALLIDAS + 1))
    printf '  FALLO: %s\n' "$1"
}

aprobar() {
    APROBADAS=$((APROBADAS + 1))
    printf '  ok: %s\n' "$1"
}

afirmar_igual() {
    if [ "$2" = "$3" ]; then aprobar "$1"; else fallar "$1 (esperado '$3', obtenido '$2')"; fi
}

afirmar_contiene() {
    if grep -qF -- "$3" <<< "$2"; then aprobar "$1"; else fallar "$1 (no contiene '$3')"; fi
}

afirmar_no_contiene() {
    if grep -qF -- "$3" <<< "$2"; then fallar "$1 (contiene '$3')"; else aprobar "$1"; fi
}

huella() {
    sha256sum "$1" | cut -d' ' -f1
}

preparar_escenario() {
    SANDBOX="$(mktemp -d)"
    export SANDBOX
    mkdir -p "$SANDBOX/caddy" "$SANDBOX/secretos/certificados" "$SANDBOX/backend" "$SANDBOX/doble"
    cp "$DOBLES"/docker "$DOBLES"/curl "$DOBLES"/resolvedor "$SANDBOX/doble/"
    cp "$DOBLES/Caddyfile.modelo" "$SANDBOX/caddy/Caddyfile"
    cp "$DOBLES/respuestas-correctas.tsv" "$SANDBOX/respuestas.tsv"
    printf '32.197.182.207' > "$SANDBOX/ip_publica"
    printf '32.197.182.207 32.197.182.207\n' | sed 's/^/32-197-182-207.sslip.io /; s/ 32.197.182.207$//' > "$SANDBOX/dns.tsv"
    printf 'abc123 2026-11-23T10:00:00Z 0 volume:caddy_datos:/var/lib/docker/volumes/caddy_datos:/data;\n' > "$SANDBOX/huella_contenedor"
    printf 'NUTRIVIDA_JWT_SECRETO=secreto-ficticio\n' > "$SANDBOX/secretos/.env"
    printf 'certificado-ficticio\n' > "$SANDBOX/secretos/certificados/dominio.crt"
    printf 'servicio-ficticio\n' > "$SANDBOX/backend/docker-compose.yml"
    HUELLA_SECRETOS="$(cat "$SANDBOX/secretos/.env" "$SANDBOX/secretos/certificados/dominio.crt" "$SANDBOX/backend/docker-compose.yml" | sha256sum | cut -d' ' -f1)"
    HUELLA_INICIAL="$(huella "$SANDBOX/caddy/Caddyfile")"
}

registrar_dns() {
    printf '%s.sslip.io %s\n' "${1//./-}" "$1" >> "$SANDBOX/dns.tsv"
}

ejecutar() {
    SALIDA="$(
        env PATH="$SANDBOX/doble:$PATH" \
            SANDBOX="$SANDBOX" \
            NUTRIVIDA_CONFIGURACION="$SANDBOX/no-existe.conf" \
            ARCHIVO_CADDYFILE="$SANDBOX/caddy/Caddyfile" \
            DIRECTORIO_RESPALDOS="$SANDBOX/respaldos" \
            DIRECTORIO_ESTADO="$SANDBOX/estado" \
            ARCHIVO_REGISTRO="$SANDBOX/registro.log" \
            ARCHIVO_DESACTIVADO="$SANDBOX/desactivado" \
            URL_IMDS="http://imds.falso" \
            COMANDO_RESOLVEDOR="$SANDBOX/doble/resolvedor" \
            PAUSA_SEGUNDOS=0 \
            REINTENTOS_DOCKER=2 REINTENTOS_CADDY=2 REINTENTOS_IMDS=2 REINTENTOS_DNS=2 \
            REINTENTOS_HTTPS=2 REINTENTOS_ENDPOINTS=3 \
            bash "$SCRIPT" "$@" 2>&1
    )"
    CODIGO=$?
}

llamadas_docker_prohibidas() {
    local archivo="$SANDBOX/llamadas_docker.log" linea orden
    [ -f "$archivo" ] || return 0
    while IFS= read -r linea; do
        orden="${linea%% *}"
        case "$orden" in
            info|inspect|cp|exec) ;;
            *) printf '%s\n' "$linea" ;;
        esac
    done < "$archivo"
    [ -f "$SANDBOX/docker_prohibido.log" ] && cat "$SANDBOX/docker_prohibido.log"
}

comprobar_invariantes() {
    afirmar_igual "docker solo recibio info, inspect, cp y exec (sin stop, rm, restart, run, volume)" "$(llamadas_docker_prohibidas)" ""
    afirmar_igual "curl nunca se uso con -k ni --insecure" "$([ -f "$SANDBOX/inseguro.log" ] && cat "$SANDBOX/inseguro.log")" ""
    afirmar_igual "secretos, certificados y backend intactos" "$(cat "$SANDBOX/secretos/.env" "$SANDBOX/secretos/certificados/dominio.crt" "$SANDBOX/backend/docker-compose.yml" | sha256sum | cut -d' ' -f1)" "$HUELLA_SECRETOS"
    afirmar_no_contiene "el registro no contiene el secreto ni el token IMDS" "$(cat "$SANDBOX/registro.log" 2>/dev/null)" "secreto-ficticio"
    afirmar_no_contiene "el registro no contiene el token de IMDS" "$(cat "$SANDBOX/registro.log" 2>/dev/null)" "TOKENFALSO"
}

cantidad_recargas() {
    if [ -f "$SANDBOX/recargas" ]; then wc -l < "$SANDBOX/recargas" | tr -d ' '; else echo 0; fi
}

cantidad_respaldos() {
    ls -1 "$SANDBOX/respaldos"/Caddyfile.*.respaldo 2>/dev/null | wc -l | tr -d ' '
}

limpiar_escenario() {
    rm -rf "$SANDBOX"
}

escenario() {
    printf '\n== %s\n' "$1"
    preparar_escenario
}

escenario "1. IP sin cambios"
ejecutar --aplicar
afirmar_igual "codigo de salida 0" "$CODIGO" "0"
afirmar_contiene "informa que no cambio" "$SALIDA" "El dominio no cambio"
afirmar_igual "Caddyfile identico" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "sin recargas" "$(cantidad_recargas)" "0"
afirmar_igual "sin respaldos nuevos" "$(cantidad_respaldos)" "0"
afirmar_contiene "13 comprobaciones correctas" "$SALIDA" "13 de 13 correctas"
comprobar_invariantes
limpiar_escenario

escenario "2. IP modificada, idempotencia y reversion"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
ejecutar --aplicar
afirmar_igual "codigo de salida 0" "$CODIGO" "0"
afirmar_contiene "actualiza el dominio" "$SALIDA" "32-197-182-207.sslip.io -> 54-201-10-33.sslip.io"
afirmar_contiene "Caddy recargado sin reiniciar" "$SALIDA" "Caddy recargado sin reiniciar"
esperado="$(sed 's/32-197-182-207\.sslip\.io/54-201-10-33.sslip.io/' "$DOBLES/Caddyfile.modelo" | sha256sum | cut -d' ' -f1)"
afirmar_igual "solo cambio el nombre del dominio (resto byte a byte igual)" "$(huella "$SANDBOX/caddy/Caddyfile")" "$esperado"
afirmar_igual "una recarga" "$(cantidad_recargas)" "1"
afirmar_igual "un respaldo" "$(cantidad_respaldos)" "1"
respaldo="$(ls -1 "$SANDBOX/respaldos"/Caddyfile.*.respaldo | head -n 1)"
afirmar_igual "el respaldo es el original" "$(huella "$respaldo")" "$HUELLA_INICIAL"
afirmar_contiene "el respaldo tiene archivo de huella" "$(cat "$respaldo.sha256")" "$HUELLA_INICIAL"
validacion="$(grep -n 'exec nutrivida-https caddy validate' "$SANDBOX/llamadas_docker.log" | head -n 1 | cut -d: -f1)"
recarga="$(grep -n 'exec nutrivida-https caddy reload' "$SANDBOX/llamadas_docker.log" | head -n 1 | cut -d: -f1)"
if [ -n "$validacion" ] && [ -n "$recarga" ] && [ "$validacion" -lt "$recarga" ]; then aprobar "valida antes de recargar"; else fallar "valida antes de recargar"; fi
afirmar_igual "el estado registra el dominio" "$(grep '^dominio=' "$SANDBOX/estado/estado")" "dominio=54-201-10-33.sslip.io"
comprobar_invariantes
ejecutar --aplicar
afirmar_igual "segunda ejecucion: codigo 0" "$CODIGO" "0"
afirmar_contiene "segunda ejecucion: sin cambios" "$SALIDA" "El dominio no cambio"
afirmar_igual "segunda ejecucion: sigue una sola recarga" "$(cantidad_recargas)" "1"
afirmar_igual "segunda ejecucion: sigue un solo respaldo" "$(cantidad_respaldos)" "1"
ejecutar --revertir
afirmar_igual "reversion: codigo 0" "$CODIGO" "0"
afirmar_igual "reversion: Caddyfile vuelve al original" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "reversion: se conservan ambos respaldos" "$(cantidad_respaldos)" "2"
comprobar_invariantes
limpiar_escenario

escenario "3. Fallo de DNS"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
ejecutar --aplicar
afirmar_igual "codigo 23" "$CODIGO" "23"
afirmar_igual "Caddyfile intacto" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "sin recargas" "$(cantidad_recargas)" "0"
afirmar_igual "sin respaldos" "$(cantidad_respaldos)" "0"
afirmar_contiene "conserva los servicios existentes" "$SALIDA" "Los servicios existentes se conservaron"
touch "$SANDBOX/dns_caido"
ejecutar --aplicar
afirmar_igual "resolvedor caido: codigo 23" "$CODIGO" "23"
comprobar_invariantes
limpiar_escenario

escenario "4. Caddy detenido y Docker caido"
touch "$SANDBOX/caddy_detenido"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
ejecutar --aplicar
afirmar_igual "Caddy detenido: codigo 21" "$CODIGO" "21"
afirmar_igual "Caddyfile intacto" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_no_contiene "no arranca el contenedor" "$(cat "$SANDBOX/llamadas_docker.log")" "start"
rm -f "$SANDBOX/caddy_detenido"
touch "$SANDBOX/docker_caido"
ejecutar --aplicar
afirmar_igual "Docker caido: codigo 20" "$CODIGO" "20"
ejecutar --aplicar --modo-servicio
afirmar_igual "modo servicio nunca falla el arranque (codigo 0)" "$CODIGO" "0"
comprobar_invariantes
limpiar_escenario

escenario "5. IMDS sin respuesta o con IP no publica"
touch "$SANDBOX/imds_caido"
ejecutar --aplicar
afirmar_igual "IMDS caido: codigo 22" "$CODIGO" "22"
rm -f "$SANDBOX/imds_caido"
printf '10.0.11.117' > "$SANDBOX/ip_publica"
ejecutar --aplicar
afirmar_igual "IP privada rechazada: codigo 22" "$CODIGO" "22"
printf 'no-es-una-ip' > "$SANDBOX/ip_publica"
ejecutar --aplicar
afirmar_igual "texto no IP rechazado: codigo 22" "$CODIGO" "22"
afirmar_igual "Caddyfile intacto" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
comprobar_invariantes
limpiar_escenario

escenario "6. Configuracion invalida"
printf 'DIRECTIVA_INVALIDA\n' >> "$SANDBOX/caddy/Caddyfile"
HUELLA_INICIAL="$(huella "$SANDBOX/caddy/Caddyfile")"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
ejecutar --aplicar
afirmar_igual "codigo 25" "$CODIGO" "25"
afirmar_contiene "Caddy rechazo la candidata" "$SALIDA" "Caddy rechazo la configuracion candidata"
afirmar_igual "Caddyfile intacto" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "sin recargas" "$(cantidad_recargas)" "0"
afirmar_igual "sin respaldos (se valida antes de tocar)" "$(cantidad_respaldos)" "0"
comprobar_invariantes
limpiar_escenario

escenario "7. Recuperacion tras fallo de recarga"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
touch "$SANDBOX/reload_falla_una_vez"
ejecutar --aplicar
afirmar_igual "codigo 26" "$CODIGO" "26"
afirmar_contiene "restaura la configuracion anterior" "$SALIDA" "Configuracion anterior restaurada"
afirmar_igual "Caddyfile vuelve al original" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "el respaldo se conserva" "$(cantidad_respaldos)" "1"
afirmar_contiene "recarga con la configuracion anterior" "$SALIDA" "Caddy recargado con la configuracion anterior"
ejecutar --aplicar
afirmar_igual "nueva ejecucion se recupera: codigo 0" "$CODIGO" "0"
afirmar_contiene "dominio actualizado" "$(cat "$SANDBOX/caddy/Caddyfile")" "54-201-10-33.sslip.io"
comprobar_invariantes
limpiar_escenario

escenario "8. El contenedor no ve el archivo nuevo"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
touch "$SANDBOX/montaje_distinto"
ejecutar --aplicar
afirmar_igual "codigo 26" "$CODIGO" "26"
afirmar_igual "Caddyfile restaurado" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "no recarga" "$(cantidad_recargas)" "0"
comprobar_invariantes
limpiar_escenario

escenario "9. Caddyfile con admin off, ambiguo o sin dominio"
sed -i 's/admin localhost:2019/admin off/' "$SANDBOX/caddy/Caddyfile"
HUELLA_INICIAL="$(huella "$SANDBOX/caddy/Caddyfile")"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
ejecutar --aplicar
afirmar_igual "admin off: codigo 30" "$CODIGO" "30"
afirmar_igual "admin off: intacto" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "admin off: sin respaldos" "$(cantidad_respaldos)" "0"
cp "$DOBLES/Caddyfile.modelo" "$SANDBOX/caddy/Caddyfile"
printf '\n11-22-33-44.sslip.io {\n\trespond 200\n}\n' >> "$SANDBOX/caddy/Caddyfile"
ejecutar --aplicar
afirmar_igual "dos dominios: codigo 24" "$CODIGO" "24"
printf '{\n}\n\nejemplo.com {\n}\n' > "$SANDBOX/caddy/Caddyfile"
ejecutar --aplicar
afirmar_igual "sin dominio sslip.io: codigo 24" "$CODIGO" "24"
comprobar_invariantes
limpiar_escenario

escenario "10. Certificado invalido tras el cambio"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
touch "$SANDBOX/certificado_invalido"
ejecutar --aplicar
afirmar_igual "codigo 28" "$CODIGO" "28"
afirmar_contiene "informa certificado no valido" "$SALIDA" "Certificado o TLS aun no valido"
afirmar_contiene "conserva el dominio nuevo (el anterior ya no apunta a esta IP)" "$(cat "$SANDBOX/caddy/Caddyfile")" "54-201-10-33.sslip.io"
afirmar_igual "el respaldo se conserva" "$(cantidad_respaldos)" "1"
ejecutar --aplicar --modo-servicio
afirmar_igual "modo servicio: codigo 0 aunque falle" "$CODIGO" "0"
comprobar_invariantes
limpiar_escenario

escenario "11. CORS rechazado por el backend"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
registrar_dns 54.201.10.33
awk -F'\t' 'BEGIN{OFS="\t"} $1=="POST" && $3=="NUEVO" && $2 ~ /autenticacion/ {$4="403"} {print}' "$SANDBOX/respuestas.tsv" > "$SANDBOX/respuestas.nuevo" && mv "$SANDBOX/respuestas.nuevo" "$SANDBOX/respuestas.tsv"
ejecutar --aplicar
afirmar_igual "codigo 29" "$CODIGO" "29"
afirmar_contiene "diagnostica CORS" "$SALIDA" "FALLO cors-autenticacion-origen-nuevo: HTTP 403, se esperaba 401"
afirmar_contiene "aclara que no toco el backend" "$SALIDA" "El backend no se modifico"
comprobar_invariantes
limpiar_escenario

escenario "12. Backend aun arrancando (reintentos limitados)"
printf '2' > "$SANDBOX/backend_503_restantes"
ejecutar --aplicar
afirmar_igual "codigo 0 tras reintentar" "$CODIGO" "0"
afirmar_contiene "reintento registrado" "$SALIDA" "intento 1 de 3"
printf '50' > "$SANDBOX/backend_503_restantes"
ejecutar --aplicar
afirmar_igual "backend caido: codigo 29 tras reintentos limitados" "$CODIGO" "29"
comprobar_invariantes
limpiar_escenario

escenario "13. Interruptor de desactivacion, bloqueo y modo verificar"
touch "$SANDBOX/desactivado"
ejecutar --aplicar --modo-servicio
afirmar_igual "desactivada: codigo 0" "$CODIGO" "0"
afirmar_contiene "informa desactivacion" "$SALIDA" "Automatizacion desactivada"
afirmar_igual "no llama a docker" "$([ -f "$SANDBOX/llamadas_docker.log" ] && cat "$SANDBOX/llamadas_docker.log")" ""
rm -f "$SANDBOX/desactivado"
mkdir -p "$SANDBOX/estado/bloqueo"
printf '%s\n' "$$" > "$SANDBOX/estado/bloqueo/pid"
ejecutar --aplicar
afirmar_igual "bloqueo vivo: codigo 11" "$CODIGO" "11"
printf '999999\n' > "$SANDBOX/estado/bloqueo/pid"
ejecutar --verificar
afirmar_igual "bloqueo obsoleto se recupera: verificar codigo 0" "$CODIGO" "0"
printf '54.201.10.33' > "$SANDBOX/ip_publica"
ejecutar --verificar
afirmar_igual "verificar con dominio desactualizado: codigo 32" "$CODIGO" "32"
afirmar_igual "verificar no modifica" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "verificar no recarga" "$(cantidad_recargas)" "0"
ejecutar --desactivar
afirmar_contiene "--desactivar crea el interruptor" "$(ls "$SANDBOX" 2>/dev/null; [ -e "$SANDBOX/desactivado" ] && echo desactivado-presente)" "desactivado-presente"
comprobar_invariantes
limpiar_escenario

escenario "14. Comprobar requisitos"
ejecutar --comprobar-requisitos
afirmar_igual "requisitos correctos: codigo 0" "$CODIGO" "0"
afirmar_contiene "no modifica nada" "$SALIDA" "no se modifico nada"
afirmar_igual "Caddyfile intacto" "$(huella "$SANDBOX/caddy/Caddyfile")" "$HUELLA_INICIAL"
afirmar_igual "sin recargas" "$(cantidad_recargas)" "0"
comprobar_invariantes
limpiar_escenario

printf '\nAprobadas: %s   Fallidas: %s\n' "$APROBADAS" "$FALLIDAS"
[ "$FALLIDAS" -eq 0 ]
