#!/usr/bin/env bash
set -u
set -o pipefail
umask 077

VERSION_AUTOMATIZACION="1.0.0"
NOMBRE_UNIDAD="nutrivida-dominio-automatico.service"
RUTA_INSTALACION="/usr/local/sbin/nutrivida-dominio-automatico"
RUTA_UNIDAD="/etc/systemd/system/${NOMBRE_UNIDAD}"

cargar_configuracion() {
    local archivo="${NUTRIVIDA_CONFIGURACION:-/etc/nutrivida/dominio-automatico.conf}"
    [ -f "$archivo" ] || return 0
    local propietario permisos
    propietario="$(stat -c '%u' "$archivo" 2>/dev/null)" || return 0
    permisos="$(stat -c '%a' "$archivo" 2>/dev/null)" || return 0
    if [ "$propietario" != "0" ] || [ $(( 8#$permisos & 8#022 )) -ne 0 ]; then
        printf 'Configuracion ignorada: debe pertenecer a root y no ser escribible por otros (%s)\n' "$archivo" >&2
        return 0
    fi
    . "$archivo"
}

establecer_valores_por_defecto() {
    CONTENEDOR_CADDY="${CONTENEDOR_CADDY:-nutrivida-https}"
    ARCHIVO_CADDYFILE="${ARCHIVO_CADDYFILE:-/opt/nutrivida-https/Caddyfile}"
    RUTA_CADDYFILE_EN_CONTENEDOR="${RUTA_CADDYFILE_EN_CONTENEDOR:-}"
    DIRECTORIO_RESPALDOS="${DIRECTORIO_RESPALDOS:-/var/backups/nutrivida-dominio}"
    DIRECTORIO_ESTADO="${DIRECTORIO_ESTADO:-/var/lib/nutrivida-dominio}"
    ARCHIVO_REGISTRO="${ARCHIVO_REGISTRO:-/var/log/nutrivida-dominio.log}"
    ARCHIVO_DESACTIVADO="${ARCHIVO_DESACTIVADO:-/etc/nutrivida/dominio-automatico.desactivado}"
    URL_IMDS="${URL_IMDS:-http://169.254.169.254}"
    SUFIJO_DOMINIO="${SUFIJO_DOMINIO:-sslip.io}"
    PUERTO_HTTPS="${PUERTO_HTTPS:-443}"
    DIRECCION_VERIFICACION="${DIRECCION_VERIFICACION:-127.0.0.1}"
    COMANDO_RESOLVEDOR="${COMANDO_RESOLVEDOR:-getent ahostsv4}"
    CERTIFICADO_CA_ADICIONAL="${CERTIFICADO_CA_ADICIONAL:-}"
    ORIGEN_AJENO_PRUEBA="${ORIGEN_AJENO_PRUEBA:-https://origen-no-permitido.invalid}"
    PAUSA_SEGUNDOS="${PAUSA_SEGUNDOS:-10}"
    REINTENTOS_DOCKER="${REINTENTOS_DOCKER:-18}"
    REINTENTOS_CADDY="${REINTENTOS_CADDY:-18}"
    REINTENTOS_IMDS="${REINTENTOS_IMDS:-6}"
    REINTENTOS_DNS="${REINTENTOS_DNS:-12}"
    REINTENTOS_HTTPS="${REINTENTOS_HTTPS:-18}"
    REINTENTOS_ENDPOINTS="${REINTENTOS_ENDPOINTS:-12}"
    LIMITE_COMANDO_SEGUNDOS="${LIMITE_COMANDO_SEGUNDOS:-90}"
    TAMANO_MAXIMO_REGISTRO="${TAMANO_MAXIMO_REGISTRO:-1048576}"
}

MODO_SERVICIO=0
ACCION="aplicar"
ARGUMENTO_ACCION=""
CODIGO_FINAL=0
RESULTADO_FINAL="sin_resultado"
DOMINIO_FINAL=""
IP_FINAL=""
BLOQUEO=""
ARCHIVOS_TEMPORALES=()

registrar() {
    local nivel="$1"
    shift
    local linea
    linea="$(date '+%Y-%m-%dT%H:%M:%S%z') [$nivel] $*"
    printf '%s\n' "$linea"
    if [ -n "${ARCHIVO_REGISTRO:-}" ] && [ -d "$(dirname "$ARCHIVO_REGISTRO")" ] && [ -w "$(dirname "$ARCHIVO_REGISTRO")" ]; then
        printf '%s\n' "$linea" >> "$ARCHIVO_REGISTRO" 2>/dev/null || true
    fi
}

rotar_registro() {
    [ -f "$ARCHIVO_REGISTRO" ] || return 0
    local tamano
    tamano="$(wc -c < "$ARCHIVO_REGISTRO" 2>/dev/null || echo 0)"
    if [ "$tamano" -gt "$TAMANO_MAXIMO_REGISTRO" ]; then
        mv "$ARCHIVO_REGISTRO" "${ARCHIVO_REGISTRO}.$(date '+%Y%m%d-%H%M%S')" 2>/dev/null || true
    fi
}

pausar() {
    sleep "$PAUSA_SEGUNDOS"
}

huella_archivo() {
    sha256sum "$1" 2>/dev/null | cut -d' ' -f1
}

docker_limitado() {
    MSYS_NO_PATHCONV=1 timeout "$LIMITE_COMANDO_SEGUNDOS" docker "$@"
}

limpiar_al_salir() {
    local archivo
    for archivo in "${ARCHIVOS_TEMPORALES[@]:-}"; do
        [ -n "$archivo" ] && rm -f "$archivo" 2>/dev/null
    done
    if [ -n "$BLOQUEO" ] && [ -d "$BLOQUEO" ]; then
        rm -rf "$BLOQUEO" 2>/dev/null
    fi
}

adquirir_bloqueo() {
    mkdir -p "$DIRECTORIO_ESTADO" || return 2
    chmod 700 "$DIRECTORIO_ESTADO" 2>/dev/null
    local bloqueo="$DIRECTORIO_ESTADO/bloqueo"
    if mkdir "$bloqueo" 2>/dev/null; then
        printf '%s\n' "$$" > "$bloqueo/pid"
        BLOQUEO="$bloqueo"
        return 0
    fi
    local pid
    pid="$(cat "$bloqueo/pid" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 1
    fi
    rm -rf "$bloqueo"
    if mkdir "$bloqueo" 2>/dev/null; then
        printf '%s\n' "$$" > "$bloqueo/pid"
        BLOQUEO="$bloqueo"
        return 0
    fi
    return 1
}

guardar_estado() {
    [ -d "$DIRECTORIO_ESTADO" ] || return 0
    local temporal="$DIRECTORIO_ESTADO/estado.tmp.$$"
    {
        printf 'ultima_ejecucion=%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')"
        printf 'accion=%s\n' "$ACCION"
        printf 'resultado=%s\n' "$RESULTADO_FINAL"
        printf 'codigo=%s\n' "$CODIGO_FINAL"
        printf 'dominio=%s\n' "$DOMINIO_FINAL"
        printf 'ip_publica=%s\n' "$IP_FINAL"
        printf 'version=%s\n' "$VERSION_AUTOMATIZACION"
    } > "$temporal" 2>/dev/null && mv "$temporal" "$DIRECTORIO_ESTADO/estado" 2>/dev/null
}

terminar() {
    CODIGO_FINAL="$1"
    RESULTADO_FINAL="$2"
    if [ "$CODIGO_FINAL" -eq 0 ]; then
        registrar INFO "Resultado: $RESULTADO_FINAL"
    else
        registrar ERROR "Resultado: $RESULTADO_FINAL (codigo $CODIGO_FINAL). Los servicios existentes se conservaron."
    fi
    guardar_estado
    if [ "$MODO_SERVICIO" -eq 1 ]; then
        exit 0
    fi
    exit "$CODIGO_FINAL"
}

esperar_docker() {
    local intento
    for ((intento = 1; intento <= REINTENTOS_DOCKER; intento++)); do
        if docker_limitado info >/dev/null 2>&1; then
            registrar INFO "Docker disponible (intento $intento)"
            return 0
        fi
        registrar WARN "Docker aun no responde (intento $intento de $REINTENTOS_DOCKER)"
        pausar
    done
    return 1
}

caddy_en_ejecucion() {
    [ "$(docker_limitado inspect --format '{{.State.Running}}' "$CONTENEDOR_CADDY" 2>/dev/null)" = "true" ]
}

esperar_caddy() {
    local intento
    for ((intento = 1; intento <= REINTENTOS_CADDY; intento++)); do
        if caddy_en_ejecucion; then
            registrar INFO "Contenedor $CONTENEDOR_CADDY en ejecucion (intento $intento)"
            return 0
        fi
        registrar WARN "Contenedor $CONTENEDOR_CADDY no esta en ejecucion (intento $intento de $REINTENTOS_CADDY)"
        pausar
    done
    return 1
}

huella_contenedor() {
    docker_limitado inspect --format '{{.Id}} {{.State.StartedAt}} {{.RestartCount}} {{range .Mounts}}{{.Type}}:{{.Name}}:{{.Source}}:{{.Destination}};{{end}}' "$CONTENEDOR_CADDY" 2>/dev/null | sha256sum | cut -d' ' -f1
}

es_ipv4_publica() {
    local ip="$1"
    local octeto='(0|[1-9][0-9]{0,2})'
    [[ "$ip" =~ ^${octeto}\.${octeto}\.${octeto}\.${octeto}$ ]] || return 1
    local a="${BASH_REMATCH[1]}" b="${BASH_REMATCH[2]}" c="${BASH_REMATCH[3]}" d="${BASH_REMATCH[4]}"
    [ "$a" -le 255 ] && [ "$b" -le 255 ] && [ "$c" -le 255 ] && [ "$d" -le 255 ] || return 1
    [ "$a" -eq 0 ] && return 1
    [ "$a" -eq 10 ] && return 1
    [ "$a" -eq 127 ] && return 1
    [ "$a" -ge 224 ] && return 1
    [ "$a" -eq 169 ] && [ "$b" -eq 254 ] && return 1
    [ "$a" -eq 172 ] && [ "$b" -ge 16 ] && [ "$b" -le 31 ] && return 1
    [ "$a" -eq 192 ] && [ "$b" -eq 168 ] && return 1
    [ "$a" -eq 100 ] && [ "$b" -ge 64 ] && [ "$b" -le 127 ] && return 1
    return 0
}

consultar_imds_v2() {
    local token ip
    token="$(curl --silent --fail --max-time 3 --request PUT --header 'X-aws-ec2-metadata-token-ttl-seconds: 60' "${URL_IMDS}/latest/api/token" 2>/dev/null)" || return 1
    [ -n "$token" ] || return 1
    ip="$(printf 'X-aws-ec2-metadata-token: %s\n' "$token" | curl --silent --fail --max-time 3 --header @- "${URL_IMDS}/latest/meta-data/public-ipv4" 2>/dev/null)" || return 1
    printf '%s' "$ip" | tr -d '[:space:]'
}

obtener_ip_publica() {
    local intento ip
    for ((intento = 1; intento <= REINTENTOS_IMDS; intento++)); do
        ip="$(consultar_imds_v2)"
        if [ -n "$ip" ] && es_ipv4_publica "$ip"; then
            IP_PUBLICA="$ip"
            registrar INFO "IP publica obtenida por IMDSv2: $ip"
            return 0
        fi
        registrar WARN "IMDSv2 no entrego una IP publica valida (intento $intento de $REINTENTOS_IMDS)"
        pausar
    done
    return 1
}

construir_dominio() {
    printf '%s.%s' "${1//./-}" "$SUFIJO_DOMINIO"
}

dominio_resuelve_a() {
    local dominio="$1" ip="$2"
    $COMANDO_RESOLVEDOR "$dominio" 2>/dev/null | awk '{print $1}' | grep -Fxq "$ip"
}

esperar_dns() {
    local dominio="$1" ip="$2" intento
    for ((intento = 1; intento <= REINTENTOS_DNS; intento++)); do
        if dominio_resuelve_a "$dominio" "$ip"; then
            registrar INFO "DNS correcto: $dominio resuelve a $ip (intento $intento)"
            return 0
        fi
        registrar WARN "DNS de $dominio no resuelve a $ip (intento $intento de $REINTENTOS_DNS)"
        pausar
    done
    return 1
}

patron_dominios() {
    printf '[0-9]{1,3}(-[0-9]{1,3}){3}\\.%s' "${SUFIJO_DOMINIO//./\\.}"
}

dominios_en_archivo() {
    grep -Eo "$(patron_dominios)" "$1" 2>/dev/null | sort -u
}

leer_dominio_actual() {
    local encontrados cantidad
    [ -r "$ARCHIVO_CADDYFILE" ] || return 1
    encontrados="$(dominios_en_archivo "$ARCHIVO_CADDYFILE")"
    [ -n "$encontrados" ] || return 2
    cantidad="$(printf '%s\n' "$encontrados" | wc -l | tr -d ' ')"
    [ "$cantidad" -eq 1 ] || return 3
    DOMINIO_ACTUAL="$encontrados"
    return 0
}

caddyfile_con_admin_desactivado() {
    grep -Eq '^[[:space:]]*admin[[:space:]]+off([[:space:]]|$)' "$1"
}

ruta_caddyfile_en_contenedor() {
    if [ -n "$RUTA_CADDYFILE_EN_CONTENEDOR" ]; then
        printf '%s' "$RUTA_CADDYFILE_EN_CONTENEDOR"
        return 0
    fi
    local real fuente destino
    real="$(readlink -f "$ARCHIVO_CADDYFILE" 2>/dev/null)" || return 1
    while IFS='|' read -r fuente destino; do
        [ -n "$fuente" ] || continue
        if [ "$fuente" = "$real" ]; then
            printf '%s' "$destino"
            return 0
        fi
        case "$real" in
            "$fuente"/*)
                printf '%s/%s' "${destino%/}" "${real#"$fuente"/}"
                return 0
                ;;
        esac
    done < <(docker_limitado inspect --format '{{range .Mounts}}{{.Source}}|{{.Destination}}{{"\n"}}{{end}}' "$CONTENEDOR_CADDY" 2>/dev/null)
    return 1
}

validar_configuracion_candidata() {
    local archivo="$1" temporal="/tmp/nutrivida-candidato.Caddyfile" salida resultado
    docker_limitado cp "$archivo" "${CONTENEDOR_CADDY}:${temporal}" >/dev/null 2>&1 || {
        registrar ERROR "No se pudo copiar la configuracion candidata al contenedor para validarla"
        return 1
    }
    salida="$(docker_limitado exec "$CONTENEDOR_CADDY" caddy validate --config "$temporal" --adapter caddyfile 2>&1)"
    resultado=$?
    docker_limitado exec "$CONTENEDOR_CADDY" rm -f "$temporal" >/dev/null 2>&1
    if [ "$resultado" -ne 0 ]; then
        registrar ERROR "Caddy rechazo la configuracion candidata: $(printf '%s' "$salida" | tail -n 3 | tr '\n' ' ' | head -c 400)"
        return 1
    fi
    registrar INFO "Caddy valido la configuracion candidata"
    return 0
}

respaldar_configuracion_actual() {
    mkdir -p "$DIRECTORIO_RESPALDOS" || return 1
    chmod 700 "$DIRECTORIO_RESPALDOS" 2>/dev/null
    local marca destino huella_original huella_copia
    marca="$(date '+%Y%m%d-%H%M%S')"
    destino="$DIRECTORIO_RESPALDOS/Caddyfile.${marca}.respaldo"
    if [ -e "$destino" ]; then
        destino="$DIRECTORIO_RESPALDOS/Caddyfile.${marca}-$$.respaldo"
    fi
    cp -p "$ARCHIVO_CADDYFILE" "$destino" || return 1
    huella_original="$(huella_archivo "$ARCHIVO_CADDYFILE")"
    huella_copia="$(huella_archivo "$destino")"
    if [ -z "$huella_original" ] || [ "$huella_original" != "$huella_copia" ]; then
        registrar ERROR "El respaldo no coincide con el original; se cancela el cambio"
        return 1
    fi
    printf '%s  %s\n' "$huella_original" "$(basename "$destino")" > "${destino}.sha256"
    RESPALDO_ACTUAL="$destino"
    HUELLA_RESPALDO="$huella_original"
    registrar INFO "Respaldo creado: $destino"
    return 0
}

restaurar_respaldo() {
    [ -n "${RESPALDO_ACTUAL:-}" ] || return 1
    cat "$RESPALDO_ACTUAL" > "$ARCHIVO_CADDYFILE" || return 1
    if [ "$(huella_archivo "$ARCHIVO_CADDYFILE")" != "$HUELLA_RESPALDO" ]; then
        registrar ERROR "La restauracion no coincide con el respaldo $RESPALDO_ACTUAL"
        return 1
    fi
    registrar WARN "Configuracion anterior restaurada desde $RESPALDO_ACTUAL"
    return 0
}

recargar_caddy() {
    local destino="$1" salida
    salida="$(docker_limitado exec "$CONTENEDOR_CADDY" caddy reload --config "$destino" --adapter caddyfile 2>&1)"
    local resultado=$?
    if [ "$resultado" -ne 0 ]; then
        registrar ERROR "caddy reload fallo: $(printf '%s' "$salida" | tail -n 3 | tr '\n' ' ' | head -c 400)"
    fi
    return "$resultado"
}

sustituir_configuracion() {
    local candidato="$1" destino huella_candidato huella_antes huella_despues
    if caddyfile_con_admin_desactivado "$candidato"; then
        registrar ERROR "El Caddyfile tiene 'admin off': caddy reload no puede aplicarse sin reiniciar el contenedor. No se modifica nada."
        return 30
    fi
    destino="$(ruta_caddyfile_en_contenedor)" || {
        registrar ERROR "No se pudo determinar donde ve el contenedor el Caddyfile. No se modifica nada."
        return 31
    }
    validar_configuracion_candidata "$candidato" || return 25
    respaldar_configuracion_actual || return 27
    huella_antes="$(huella_contenedor)"
    huella_candidato="$(huella_archivo "$candidato")"
    cat "$candidato" > "$ARCHIVO_CADDYFILE" || {
        registrar ERROR "No se pudo escribir el Caddyfile"
        restaurar_respaldo
        return 26
    }
    if [ "$(docker_limitado exec "$CONTENEDOR_CADDY" sha256sum "$destino" 2>/dev/null | cut -d' ' -f1)" != "$huella_candidato" ]; then
        registrar ERROR "El contenedor no ve el contenido nuevo del Caddyfile (montaje distinto al esperado)"
        restaurar_respaldo
        return 26
    fi
    if ! recargar_caddy "$destino"; then
        restaurar_respaldo
        recargar_caddy "$destino" && registrar WARN "Caddy recargado con la configuracion anterior"
        return 26
    fi
    huella_despues="$(huella_contenedor)"
    if [ "$huella_antes" = "$huella_despues" ]; then
        registrar INFO "Caddy recargado sin reiniciar: mismo contenedor, mismos montajes y mismo arranque"
    else
        registrar WARN "La huella del contenedor cambio durante la recarga; revisar manualmente"
    fi
    return 0
}

verificar_sustitucion() {
    local actual="$1" nuevo="$2" candidato="$3" invertido coincidencias
    [ -s "$candidato" ] || return 1
    [ "$(wc -l < "$ARCHIVO_CADDYFILE")" = "$(wc -l < "$candidato")" ] || return 1
    ! grep -qF "$actual" "$candidato" || return 1
    coincidencias="$(grep -cF "$actual" "$ARCHIVO_CADDYFILE")"
    [ "$(grep -cF "$nuevo" "$candidato")" = "$coincidencias" ] || return 1
    invertido="$(sed "s/${nuevo//./\\.}/${actual}/g" "$candidato" | sha256sum | cut -d' ' -f1)"
    [ "$invertido" = "$(huella_archivo "$ARCHIVO_CADDYFILE")" ]
}

aplicar_cambio_dominio() {
    local actual="$1" nuevo="$2" candidato
    candidato="$(mktemp "$DIRECTORIO_ESTADO/candidato.XXXXXX")" || return 27
    ARCHIVOS_TEMPORALES+=("$candidato")
    sed "s/${actual//./\\.}/${nuevo}/g" "$ARCHIVO_CADDYFILE" > "$candidato"
    if ! verificar_sustitucion "$actual" "$nuevo" "$candidato"; then
        registrar ERROR "La sustitucion cambiaria algo mas que el nombre del dominio. No se modifica nada."
        return 27
    fi
    registrar INFO "Cambiando exclusivamente el dominio: $actual -> $nuevo"
    sustituir_configuracion "$candidato"
}

codigo_http() {
    local metodo="$1" ruta="$2" origen="$3"
    local argumentos=(--silent --output /dev/null --write-out '%{http_code}' --max-time 15 --proto '=https' --tlsv1.2 --request "$metodo")
    [ -n "$CERTIFICADO_CA_ADICIONAL" ] && argumentos+=(--cacert "$CERTIFICADO_CA_ADICIONAL")
    [ -n "$origen" ] && argumentos+=(--header "Origin: $origen")
    argumentos+=(--resolve "${DOMINIO_VERIFICADO}:${PUERTO_HTTPS}:${DIRECCION_VERIFICACION}")
    curl "${argumentos[@]}" "https://${DOMINIO_VERIFICADO}:${PUERTO_HTTPS}${ruta}"
}

esperar_https_valido() {
    local intento codigo salida
    for ((intento = 1; intento <= REINTENTOS_HTTPS; intento++)); do
        codigo="$(codigo_http GET / "")"
        salida=$?
        if [ "$codigo" = "200" ]; then
            registrar INFO "HTTPS valido en $DOMINIO_VERIFICADO con verificacion TLS completa (intento $intento)"
            return 0
        fi
        case "$salida" in
            35|51|58|59|60|77|83) registrar WARN "Certificado o TLS aun no valido para $DOMINIO_VERIFICADO (curl $salida, intento $intento de $REINTENTOS_HTTPS)" ;;
            *) registrar WARN "HTTPS sin respuesta 200 (codigo $codigo, curl $salida, intento $intento de $REINTENTOS_HTTPS)" ;;
        esac
        pausar
    done
    return 1
}

informar_certificado() {
    command -v openssl >/dev/null 2>&1 || return 0
    local datos
    datos="$(printf '' | timeout 15 openssl s_client -connect "${DIRECCION_VERIFICACION}:${PUERTO_HTTPS}" -servername "$DOMINIO_VERIFICADO" 2>/dev/null | openssl x509 -noout -issuer -enddate 2>/dev/null | tr '\n' ' ')"
    [ -n "$datos" ] && registrar INFO "Certificado presentado: $datos"
    return 0
}

verificacion_publica_informativa() {
    local codigo
    codigo="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 10 --proto '=https' --tlsv1.2 ${CERTIFICADO_CA_ADICIONAL:+--cacert "$CERTIFICADO_CA_ADICIONAL"} "https://${DOMINIO_VERIFICADO}:${PUERTO_HTTPS}/" 2>/dev/null)"
    if [ "$codigo" = "200" ]; then
        registrar INFO "Comprobacion publica informativa por DNS: HTTP 200"
    else
        registrar WARN "Comprobacion publica informativa sin HTTP 200 (codigo $codigo); revisar el grupo de seguridad si el telefono no abre el sitio"
    fi
}

tabla_verificaciones() {
    cat <<'TABLA'
react|GET|/||200
servicios-publicos|GET|/clinico/api/v1/servicios||200
nutricionistas-publicos|GET|/clinico/api/v1/nutricionistas||200
usuarios-protegido|GET|/autenticacion/api/v1/usuarios||401
pacientes-protegido|GET|/clinico/api/v1/pacientes||401
agenda-protegida|GET|/agenda/api/v1/agendas/000000000000000000000000||401
interno-clinico-bloqueado|GET|/clinico/api/v1/internos/comprobacion||404
archivo-oculto-bloqueado|GET|/.env||403
cors-autenticacion-origen-nuevo|POST|/autenticacion/api/v1/usuarios|NUEVO|401
cors-agenda-origen-nuevo|POST|/agenda/api/v1/agendas/000000000000000000000000/bloqueos|NUEVO|401
cors-clinico-origen-nuevo|POST|/clinico/api/v1/pacientes|NUEVO|401
cors-autenticacion-origen-ajeno|POST|/autenticacion/api/v1/usuarios|AJENO|403
cors-agenda-origen-ajeno|POST|/agenda/api/v1/agendas/000000000000000000000000/bloqueos|AJENO|403
TABLA
}

codigo_reintentable() {
    case "$1" in 000|502|503|504) return 0 ;; *) return 1 ;; esac
}

verificar_endpoints() {
    local nombre metodo ruta clave esperado origen codigo intento aprobada total=0 fallidas=0
    while IFS='|' read -r nombre metodo ruta clave esperado; do
        [ -n "$nombre" ] || continue
        case "$clave" in
            NUEVO) origen="https://${DOMINIO_VERIFICADO}" ;;
            AJENO) origen="$ORIGEN_AJENO_PRUEBA" ;;
            *) origen="" ;;
        esac
        total=$((total + 1))
        aprobada=0
        for ((intento = 1; intento <= REINTENTOS_ENDPOINTS; intento++)); do
            codigo="$(codigo_http "$metodo" "$ruta" "$origen")"
            if [ "$codigo" = "$esperado" ]; then
                aprobada=1
                break
            fi
            codigo_reintentable "$codigo" || break
            registrar WARN "$nombre devolvio $codigo, se esperaba $esperado (intento $intento de $REINTENTOS_ENDPOINTS)"
            pausar
        done
        if [ "$aprobada" -eq 1 ]; then
            registrar INFO "OK $nombre: HTTP $codigo"
        else
            fallidas=$((fallidas + 1))
            registrar ERROR "FALLO $nombre: HTTP $codigo, se esperaba $esperado"
            case "$nombre" in
                cors-*) registrar ERROR "CORS: el backend no acepta el origen https://${DOMINIO_VERIFICADO} o acepta uno ajeno. El backend no se modifico; ver la propuesta de coordinacion." ;;
            esac
        fi
    done < <(tabla_verificaciones)
    registrar INFO "Comprobaciones de endpoints: $((total - fallidas)) de $total correctas"
    [ "$fallidas" -eq 0 ]
}

comprobar_requisitos() {
    local fallos=0 destino
    command -v docker >/dev/null 2>&1 || { registrar ERROR "Falta docker"; fallos=$((fallos + 1)); }
    command -v curl >/dev/null 2>&1 || { registrar ERROR "Falta curl"; fallos=$((fallos + 1)); }
    command -v sha256sum >/dev/null 2>&1 || { registrar ERROR "Falta sha256sum"; fallos=$((fallos + 1)); }
    command -v timeout >/dev/null 2>&1 || { registrar ERROR "Falta timeout"; fallos=$((fallos + 1)); }
    [ "$fallos" -eq 0 ] || return 1
    docker_limitado info >/dev/null 2>&1 || { registrar ERROR "Docker no responde"; return 1; }
    docker_limitado inspect "$CONTENEDOR_CADDY" >/dev/null 2>&1 || { registrar ERROR "No existe el contenedor $CONTENEDOR_CADDY"; return 1; }
    [ -r "$ARCHIVO_CADDYFILE" ] && [ -w "$ARCHIVO_CADDYFILE" ] || { registrar ERROR "No se puede leer y escribir $ARCHIVO_CADDYFILE"; return 1; }
    if caddyfile_con_admin_desactivado "$ARCHIVO_CADDYFILE"; then
        registrar ERROR "El Caddyfile tiene 'admin off'; caddy reload no funcionaria"
        return 1
    fi
    leer_dominio_actual
    case "$?" in
        0) registrar INFO "Dominio actual en el Caddyfile: $DOMINIO_ACTUAL" ;;
        2) registrar ERROR "El Caddyfile no contiene un dominio $SUFIJO_DOMINIO con formato de IP"; return 1 ;;
        3) registrar ERROR "El Caddyfile contiene mas de un dominio $SUFIJO_DOMINIO; es ambiguo"; return 1 ;;
        *) registrar ERROR "No se pudo leer el Caddyfile"; return 1 ;;
    esac
    destino="$(ruta_caddyfile_en_contenedor)" || { registrar ERROR "No se pudo determinar la ruta del Caddyfile dentro del contenedor"; return 1; }
    registrar INFO "El contenedor ve el Caddyfile en $destino"
    consultar_imds_v2 >/dev/null || { registrar ERROR "IMDSv2 no responde con token"; return 1; }
    registrar INFO "IMDSv2 responde"
    registrar INFO "Requisitos comprobados; no se modifico nada"
    return 0
}

ejecutar_aplicar() {
    local codigo
    esperar_docker || terminar 20 "docker_no_disponible"
    esperar_caddy || terminar 21 "caddy_no_disponible"
    obtener_ip_publica || terminar 22 "ip_publica_no_obtenida"
    IP_FINAL="$IP_PUBLICA"
    DOMINIO_NUEVO="$(construir_dominio "$IP_PUBLICA")"
    DOMINIO_FINAL="$DOMINIO_NUEVO"
    esperar_dns "$DOMINIO_NUEVO" "$IP_PUBLICA" || terminar 23 "dns_no_resuelve"
    leer_dominio_actual
    case "$?" in
        0) ;;
        2) terminar 24 "caddyfile_sin_dominio_reconocible" ;;
        3) terminar 24 "caddyfile_con_dominios_ambiguos" ;;
        *) terminar 24 "caddyfile_ilegible" ;;
    esac
    if [ "$DOMINIO_ACTUAL" = "$DOMINIO_NUEVO" ]; then
        registrar INFO "El dominio no cambio ($DOMINIO_ACTUAL); Caddy no se modifica"
        RESULTADO_ACCION="sin_cambios"
    else
        aplicar_cambio_dominio "$DOMINIO_ACTUAL" "$DOMINIO_NUEVO"
        codigo=$?
        [ "$codigo" -eq 0 ] || terminar "$codigo" "cambio_no_aplicado_configuracion_conservada"
        RESULTADO_ACCION="dominio_actualizado"
    fi
    DOMINIO_VERIFICADO="$DOMINIO_NUEVO"
    esperar_https_valido || terminar 28 "https_no_valido_${RESULTADO_ACCION}"
    informar_certificado
    verificacion_publica_informativa
    verificar_endpoints || terminar 29 "endpoints_con_fallos_${RESULTADO_ACCION}"
    terminar 0 "$RESULTADO_ACCION"
}

ejecutar_verificar() {
    esperar_docker || terminar 20 "docker_no_disponible"
    esperar_caddy || terminar 21 "caddy_no_disponible"
    obtener_ip_publica || terminar 22 "ip_publica_no_obtenida"
    IP_FINAL="$IP_PUBLICA"
    DOMINIO_NUEVO="$(construir_dominio "$IP_PUBLICA")"
    DOMINIO_FINAL="$DOMINIO_NUEVO"
    leer_dominio_actual || terminar 24 "caddyfile_sin_dominio_unico"
    if [ "$DOMINIO_ACTUAL" != "$DOMINIO_NUEVO" ]; then
        registrar WARN "El Caddyfile usa $DOMINIO_ACTUAL pero la IP actual corresponde a $DOMINIO_NUEVO. Use --aplicar."
        terminar 32 "caddyfile_desactualizado"
    fi
    DOMINIO_VERIFICADO="$DOMINIO_NUEVO"
    esperar_https_valido || terminar 28 "https_no_valido"
    informar_certificado
    verificar_endpoints || terminar 29 "endpoints_con_fallos"
    terminar 0 "verificacion_correcta"
}

ejecutar_revertir() {
    local origen="$ARGUMENTO_ACCION" huella_registrada codigo
    esperar_docker || terminar 20 "docker_no_disponible"
    esperar_caddy || terminar 21 "caddy_no_disponible"
    if [ -z "$origen" ]; then
        origen="$(ls -1 "$DIRECTORIO_RESPALDOS"/Caddyfile.*.respaldo 2>/dev/null | sort | tail -n 1)"
    fi
    [ -n "$origen" ] && [ -r "$origen" ] || terminar 27 "respaldo_no_encontrado"
    if [ -r "${origen}.sha256" ]; then
        huella_registrada="$(cut -d' ' -f1 < "${origen}.sha256")"
        [ "$huella_registrada" = "$(huella_archivo "$origen")" ] || terminar 27 "respaldo_alterado"
    else
        registrar WARN "El respaldo no tiene archivo .sha256; no se puede verificar su integridad"
        terminar 27 "respaldo_sin_huella"
    fi
    registrar INFO "Revirtiendo al respaldo $origen"
    sustituir_configuracion "$origen"
    codigo=$?
    [ "$codigo" -eq 0 ] || terminar "$codigo" "reversion_no_aplicada_configuracion_conservada"
    terminar 0 "configuracion_revertida"
}

mostrar_estado() {
    if [ -r "$DIRECTORIO_ESTADO/estado" ]; then
        cat "$DIRECTORIO_ESTADO/estado"
    else
        printf 'Sin ejecuciones registradas\n'
    fi
    if [ -e "$ARCHIVO_DESACTIVADO" ]; then
        printf 'automatizacion=desactivada\n'
    else
        printf 'automatizacion=activa\n'
    fi
}

desactivar_automatizacion() {
    mkdir -p "$(dirname "$ARCHIVO_DESACTIVADO")" && : > "$ARCHIVO_DESACTIVADO"
    command -v systemctl >/dev/null 2>&1 && systemctl disable "$NOMBRE_UNIDAD" >/dev/null 2>&1
    printf 'Automatizacion desactivada. No se elimino ningun respaldo, imagen, contenedor ni certificado.\n'
}

reactivar_automatizacion() {
    rm -f "$ARCHIVO_DESACTIVADO"
    command -v systemctl >/dev/null 2>&1 && systemctl enable "$NOMBRE_UNIDAD" >/dev/null 2>&1
    printf 'Automatizacion reactivada para el proximo arranque.\n'
}

desinstalar_automatizacion() {
    command -v systemctl >/dev/null 2>&1 && systemctl disable "$NOMBRE_UNIDAD" >/dev/null 2>&1
    rm -f "$RUTA_UNIDAD"
    command -v systemctl >/dev/null 2>&1 && systemctl daemon-reload >/dev/null 2>&1
    printf 'Unidad systemd retirada. Se conservan: configuracion, respaldos, registros y el comando %s.\n' "$RUTA_INSTALACION"
}

mostrar_ayuda() {
    cat <<'AYUDA'
Uso: nutrivida-dominio-automatico [opcion]
  --aplicar                  Detecta la IP publica, actualiza el dominio de Caddy si cambio y verifica (por defecto)
  --verificar                Solo comprueba; no modifica nada
  --comprobar-requisitos     Comprobaciones previas de solo lectura
  --revertir [respaldo]      Restaura el ultimo respaldo (o el indicado) y recarga Caddy
  --estado                   Muestra la ultima ejecucion
  --desactivar               Desactiva el arranque automatico
  --reactivar                Vuelve a activarlo
  --desinstalar              Retira la unidad systemd conservando respaldos y registros
  --modo-servicio            Siempre termina con codigo 0 (uso de systemd)
AYUDA
}

analizar_argumentos() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --aplicar) ACCION="aplicar" ;;
            --verificar) ACCION="verificar" ;;
            --comprobar-requisitos) ACCION="requisitos" ;;
            --revertir) ACCION="revertir"; if [ "$#" -gt 1 ] && [ "${2#--}" = "$2" ]; then ARGUMENTO_ACCION="$2"; shift; fi ;;
            --estado) ACCION="estado" ;;
            --desactivar) ACCION="desactivar" ;;
            --reactivar) ACCION="reactivar" ;;
            --desinstalar) ACCION="desinstalar" ;;
            --modo-servicio) MODO_SERVICIO=1 ;;
            --ayuda|-h) mostrar_ayuda; exit 0 ;;
            *) printf 'Opcion desconocida: %s\n' "$1" >&2; mostrar_ayuda >&2; exit 64 ;;
        esac
        shift
    done
}

principal() {
    cargar_configuracion
    establecer_valores_por_defecto
    analizar_argumentos "$@"
    trap limpiar_al_salir EXIT

    case "$ACCION" in
        estado) mostrar_estado; exit 0 ;;
        desactivar) desactivar_automatizacion; exit 0 ;;
        reactivar) reactivar_automatizacion; exit 0 ;;
        desinstalar) desinstalar_automatizacion; exit 0 ;;
    esac

    mkdir -p "$(dirname "$ARCHIVO_REGISTRO")" 2>/dev/null
    rotar_registro
    registrar INFO "Inicio de nutrivida-dominio-automatico $VERSION_AUTOMATIZACION (accion: $ACCION)"

    if [ -e "$ARCHIVO_DESACTIVADO" ] && [ "$MODO_SERVICIO" -eq 1 ]; then
        registrar WARN "Automatizacion desactivada por $ARCHIVO_DESACTIVADO; no se hace nada"
        exit 0
    fi

    if ! adquirir_bloqueo; then
        registrar WARN "Hay otra ejecucion en curso; se omite esta"
        [ "$MODO_SERVICIO" -eq 1 ] && exit 0
        exit 11
    fi

    case "$ACCION" in
        aplicar) ejecutar_aplicar ;;
        verificar) ejecutar_verificar ;;
        revertir) ejecutar_revertir ;;
        requisitos)
            esperar_docker || terminar 20 "docker_no_disponible"
            if comprobar_requisitos; then terminar 0 "requisitos_correctos"; else terminar 33 "requisitos_incumplidos"; fi
            ;;
    esac
}

principal "$@"
