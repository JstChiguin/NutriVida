#!/bin/bash
set -uo pipefail
umask 077
S=frontend
N=nutrivida-frontend
C=nutrivida-https
D=/opt/nutrivida/frontend
R=/opt/nutrivida/respaldo
ETIQUETA="${1:-}"
HUELLA="${2:-}"
IMG="chiguin/nutrivida:frontend-${ETIQUETA}"
DIG="chiguin/nutrivida@${HUELLA}"
LG='{"correo":"ficticio.sonda@nutrivida.test","contrasena":"Clave-Ficticia-1"}'
CT='{"nombre":"Ab","correo":"no-es-correo","mensaje":"corto"}'

[ "${CONFIRMO:-}" = "SI" ] || { echo "falta CONFIRMO=SI: no se hizo nada"; exit 1; }
[[ "$ETIQUETA" =~ ^[0-9a-f]{7}$ ]] && [[ "$HUELLA" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "uso: sudo -n env CONFIRMO=SI bash b8-frontend.sh <etiqueta-de-7-hex> <sha256:digest>"; exit 1; }
[ "$(id -u)" = 0 ] || { echo "ejecute con sudo -n"; exit 1; }
mkdir -p "$R"
exec > >(tee -a "$R/b8-$S-$(date +%Y%m%d-%H%M%S).log") 2>&1
cd "$D" || { echo "no existe $D: falta preparar el frontend"; exit 1; }

H() { curl -s -m 25 -o /dev/null -w '%{http_code}' "$@"; }
huella() { sha256sum | cut -d' ' -f1; }
cert() { echo | openssl s_client -connect "127.0.0.1:443" -servername "$DOM" 2>/dev/null | openssl x509 -noout -serial -enddate 2>/dev/null; }
caddy_estado() { docker inspect -f 'id={{.Id}} inicio={{.State.StartedAt}} reinicios={{.RestartCount}} estado={{.State.Status}}' "$C"; echo "caddyfile=$(docker exec "$C" cat /etc/caddy/Caddyfile | huella)"; echo "montajes=$(docker inspect -f '{{range .Mounts}}{{.Type}}|{{.Name}}|{{.Source}}|{{.Destination}}|{{.RW}}{{println}}{{end}}' "$C" | sort | huella)"; echo "volumenes=$(docker volume ls -q | sort | huella)"; cert; }
esperar_http() { for _ in $(seq 1 "$1"); do [ "$(H "$L/")" = "200" ] && return 0; sleep 3; done; return 1; }
revertir() {
  echo "!! REVIRTIENDO a la imagen anterior $OLD_REF"
  ETIQUETA_IMAGENES="$OLD_ETIQUETA" docker compose up -d --no-deps --no-build --pull never --force-recreate "$S" || { echo "REVERSION FALLIDA: compose no pudo recrear con $OLD_REF. Intervencion manual (imagen y .env respaldados en $B)"; exit 2; }
  if esperar_http 40 && [ "$(docker inspect -f '{{.Image}}' "$N")" = "$OLD_ID" ]; then
    echo "REVERSION COMPLETA: $N responde 200 con la imagen anterior $OLD_ID"
  else
    echo "REVERSION INCOMPLETA: $N no responde 200 con la imagen anterior. Intervencion manual (respaldo en $B)"; exit 2
  fi
  exit 1
}
fallo() { echo "!! FALLO: $1"; revertir; }

echo "== 0. puertas de seguridad (sin cambios hasta pasarlas)"
[ -f .env ] && [ -f docker-compose.yml ] || { echo "faltan .env o docker-compose.yml: falta preparar el frontend"; exit 1; }
docker compose config -q || { echo "el Compose no es valido"; exit 1; }
grep -qx 'IP_ESCUCHA=127.0.0.1' .env || { echo "IP_ESCUCHA del .env no es 127.0.0.1: Nginx quedaria expuesto"; exit 1; }
PUERTO=$(grep '^PUERTO_HTTP=' .env | cut -d= -f2-); case "$PUERTO" in ''|*[!0-9]*) echo "PUERTO_HTTP invalido en el .env"; exit 1;; esac
L=http://127.0.0.1:$PUERTO
IPB=$(grep '^IP_BACKEND_PRIVADA=' .env | cut -d= -f2-); case "$IPB" in ''|*[!A-Za-z0-9._-]*) echo "IP_BACKEND_PRIVADA invalida en el .env"; exit 1;; esac
[ "$(docker inspect -f '{{.State.Status}}' "$N" 2>/dev/null)" = running ] || { echo "$N no esta en ejecucion"; exit 1; }
OLD_REF=$(docker inspect -f '{{.Config.Image}}' "$N")
[[ "$OLD_REF" =~ ^chiguin/nutrivida:frontend-([0-9a-f]{7})$ ]] || { echo "la imagen actual ($OLD_REF) no tiene el formato esperado: no se sabria revertir. No se hizo nada."; exit 1; }
OLD_ETIQUETA="${BASH_REMATCH[1]}"
OLD_ID=$(docker inspect -f '{{.Image}}' "$N")
[ "$(docker image inspect "$OLD_REF" --format '{{.Id}}' 2>/dev/null)" = "$OLD_ID" ] || { echo "la etiqueta $OLD_REF no apunta a la imagen en uso: no se hizo nada"; exit 1; }
[ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$N")" = "nutrivida-frontend" ] || { echo "$N no pertenece al proyecto Compose nutrivida-frontend: no se hizo nada"; exit 1; }
[ "$(docker inspect -f '{{.State.Status}}' "$C" 2>/dev/null)" = running ] || { echo "Caddy ($C) no esta en ejecucion: no se toca nada"; exit 1; }
docker pull "$IMG" >/dev/null || { echo "no se pudo descargar $IMG (inicie sesion en Docker Hub con un token de solo lectura)"; exit 1; }
[ "$(docker image inspect "$IMG" --format '{{index .RepoDigests 0}}' 2>/dev/null)" = "$DIG" ] || { echo "el digest de $IMG no coincide con el esperado: no se hizo ningun cambio"; exit 1; }
ID_NUEVA=$(docker image inspect "$IMG" --format '{{.Id}}')
[ "$OLD_ID" != "$ID_NUEVA" ] || { echo "$N ya usa $IMG: no hay nada que actualizar"; exit 0; }
TK=$(curl -s -m 3 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
IPPUB=$(curl -s -m 3 -H "X-aws-ec2-metadata-token: $TK" http://169.254.169.254/latest/meta-data/public-ipv4)
[[ "$IPPUB" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "no se pudo leer la IP publica de la instancia: no se hizo nada"; exit 1; }
DOM="$(echo "$IPPUB" | tr . -).sslip.io"
U=https://$DOM
RES=$DOM:443:127.0.0.1
IPDNS=$(getent hosts "$DOM" | awk '{print $1}' | head -1)
[ "$IPPUB" = "$IPDNS" ] || { echo "el dominio $DOM no resuelve a la IP publica actual (instancia: $IPPUB, DNS: ${IPDNS:-?}): no se hizo nada"; exit 1; }
grep -q "^$(echo "$DOM" | sed 's/\./\\./g')" <(docker exec "$C" cat /etc/caddy/Caddyfile) || { echo "el Caddyfile no usa el dominio $DOM: ejecute antes la automatizacion del dominio"; exit 1; }
echo "dominio $DOM corresponde a la IP publica de esta instancia y al Caddyfile"
AV=$(free -m | awk '/^Mem/ {print $7}'); SW=$(free -m | awk '/^Swap/ {print $4}')
echo "memoria disponible: ${AV:-0} MB | swap libre: ${SW:-0} MB (minimo combinado 150)"; [ $(( ${AV:-0} + ${SW:-0} )) -ge 150 ] || { echo "memoria insuficiente"; exit 1; }
echo "backend ($IPB): solo lecturas y sondas sin escritura"
[ "$(H "http://$IPB:8082/api/v1/servicios")" = 200 ] || { echo "clinico no responde /api/v1 (200)"; exit 1; }
[ "$(H "http://$IPB:8081/v3/api-docs")" = 200 ] || { echo "autenticacion no responde (200)"; exit 1; }
[ "$(H "http://$IPB:8083/v3/api-docs")" = 200 ] || { echo "agenda no responde (200)"; exit 1; }
[ "$(H "$L/")" = 200 ] || { echo "el frontend actual no responde 200 en $L"; exit 1; }
[ "$(H --resolve "$RES" "$U/")" = 200 ] || { echo "HTTPS ya falla ANTES del cambio ($U/): no es culpa del frontend, no se hizo nada"; exit 1; }
CADDY_ANTES=$(caddy_estado)
echo "$CADDY_ANTES" | grep -q '^serial=' || { echo "no se pudo leer el certificado actual: no se hizo nada"; exit 1; }
echo "Caddy y certificado HTTPS actuales registrados (se comparan al final; no se imprimen)"
vct() { docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" | { grep "^$2=" || true; } | huella; }
venv() { { grep "^$1=" .env || true; } | huella; }
[ "$(vct "$N" IP_BACKEND_PRIVADA)" = "$(venv IP_BACKEND_PRIVADA)" ] || { echo "IP_BACKEND_PRIVADA del contenedor actual y del .env son DIFERENTES. No se hizo ningun cambio."; exit 1; }
echo "IP_BACKEND_PRIVADA: igual en el contenedor actual y en el .env (se conserva)"
RP=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$N")
OTROS_ANTES=$(for c in nutrivida-autenticacion nutrivida-clinico nutrivida-agenda; do docker inspect -f '{{.Name}} {{.State.StartedAt}}' "$c" 2>/dev/null; done)
PREVIOS_ANTES=$(for c in $(docker ps -a --filter 'name=-previo' --format '{{.Names}}' | sort); do docker inspect -f '{{.Name}} {{.Id}} {{.State.Status}} {{.State.FinishedAt}}' "$c"; done)
echo "contenedores -previo existentes (se conservan intactos): $(echo "$PREVIOS_ANTES" | grep -c . || true)"
free -m
TS=$(date +%Y%m%d-%H%M%S)
B="$R/b8-respaldo-$TS"
mkdir -p "$B"
cp -p .env docker-compose.yml "$B/"
docker inspect -f 'imagen={{.Image}} etiqueta={{.Config.Image}} reinicio={{.HostConfig.RestartPolicy.Name}} puertos={{json .HostConfig.PortBindings}} inicio={{.State.StartedAt}}' "$N" > "$B/frontend-config.txt"
docker tag "$OLD_ID" "chiguin/nutrivida:frontend-previo-$TS" || { echo "no se pudo etiquetar la imagen anterior: no se hizo nada"; exit 1; }
echo "respaldo: $B (.env y Compose copiados, 600) y etiqueta chiguin/nutrivida:frontend-previo-$TS sobre la imagen anterior $OLD_ID"

echo "== 1. reemplazo con Compose en su propio proyecto nutrivida-frontend (corte de unos segundos; Caddy devolvera 502)"
T0=$(date +%s)
ETIQUETA_IMAGENES="$ETIQUETA" docker compose up -d --no-deps --no-build --pull never --force-recreate "$S" || fallo "docker compose up fallo"

echo "== 2. espera de respuesta (maximo 90 s; el frontend no tiene healthcheck)"
OK=0
for _ in $(seq 1 45); do
  E=$(docker inspect -f '{{.State.Status}}' "$N" 2>/dev/null)
  case "$E" in exited|dead|restarting) fallo "el contenedor nuevo quedo en estado $E";; esac
  [ "$E" = running ] && [ "$(H "$L/")" = 200 ] && { OK=1; break; }
  sleep 2
done
[ "$OK" = 1 ] || fallo "no respondio 200 en 90 s"
echo "responde 200; corte total aproximado: $(( $(date +%s) - T0 )) s"

echo "== 3. verificaciones automaticas (hasta 3 intentos cada una)"
PRIV=$(hostname -I 2>/dev/null | awk '{print $1}')
ESP_PRIV=000; [ -n "$PRIV" ] || ESP_PRIV=omitido
PB() { local u="$1" o="$2" b="$3" a=(); [ -n "$o" ] && a=(-H "Origin: $o"); curl -s -m 25 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' "${a[@]}" "${@:4}" -d "$b" "$u"; }
escucha() { ss -ltn | awk -v p=":$PUERTO" '$4 ~ p"$" {print $4}' | sort -u | tr '\n' ' ' | sed 's/ *$//'; }
js() { docker exec "$N" sh -c 'cat /usr/share/nginx/html/assets/*.js'; }
cab() { curl -s -m 25 -I "$@" | tr -d '\r'; }
activo() { curl -s -m 25 "$L/" | grep -o '/assets/[^"]*\.js' | head -1; }
spa() { [ "$(curl -s -m 25 "$L/" | huella)" = "$(curl -s -m 25 "$L/$1" | huella)" ] && echo igual || echo distinta; }
verbundle() { local t="" k; for k in autenticacion/iniciar-sesion usuarios servicios nutricionistas agendas citas pagos reportes solicitudes-contacto; do if js | grep -q "api/v1/$k"; then t="$t$k "; else t="$t!$k "; fi; done; echo "$t" | sed 's/ *$//'; }
sinver() { js | grep -oE '/api/(autenticacion|usuarios|servicios|nutricionistas|agendas|citas|pagos|reportes|solicitudes-contacto)' | wc -l | tr -d ' '; }
priv() { [ -n "$PRIV" ] || { echo omitido; return; }; H "http://$PRIV:$PUERTO/" || true; }
export DOM U L RES PUERTO IPB N C ID_NUEVA PRIV LG CT OTROS_ANTES PREVIOS_ANTES
export -f H PB cert huella caddy_estado escucha js cab activo spa verbundle sinver priv
chk() {
  local titulo="$1" esperado="$2" real="" i
  for i in 1 2 3; do
    real=$(bash -c "$3" 2>/dev/null)
    [ "$real" = "$esperado" ] && break
    [ "$i" -lt 3 ] && sleep 5
  done
  if [ "$real" = "$esperado" ]; then echo "OK   $titulo: $real"; else echo "MAL  $titulo: obtenido $real, esperado $esperado"; return 1; fi
}
{
  chk "estado" "running oom=false reinicios=0" 'docker inspect -f "{{.State.Status}} oom={{.State.OOMKilled}} reinicios={{.RestartCount}}" "$N"'
  chk "reinicio automatico" "$RP" 'docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" "$N"'
  chk "imagen en uso (la descargada y verificada)" "$ID_NUEVA" 'docker inspect -f "{{.Image}}" "$N"'
  chk "publicacion de Docker solo en 127.0.0.1" "80/tcp -> 127.0.0.1:$PUERTO" 'docker port "$N" | tr "\n" " " | sed "s/ *$//"'
  chk "puerto $PUERTO en el host solo en 127.0.0.1" "127.0.0.1:$PUERTO" 'escucha'
  chk "puerto $PUERTO por la IP privada de esta instancia (debe rechazarse)" "$ESP_PRIV" 'priv'
  chk "/ por HTTP local" 200 'H "$L/"'
  chk "/ contiene la raiz de la aplicacion React" 1 'curl -s -m 25 "$L/" | grep -c "id=\"root\""'
  chk "cabecera Content-Security-Policy en /" 1 'cab "$L/" | grep -ci "^content-security-policy:"'
  chk "cabecera X-Frame-Options en /" "x-frame-options: deny" 'cab "$L/" | grep -i "^x-frame-options:" | tr "A-Z" "a-z"'
  chk "ruta de la SPA /contacto devuelve la aplicacion" igual 'spa contacto'
  chk "ruta de la SPA inexistente devuelve la aplicacion" igual 'spa ruta-que-no-existe'
  chk "archivo JavaScript de /assets" 200 'H "$L$(activo)"'
  chk "cache inmutable en /assets" 1 'cab "$L$(activo)" | grep -ci "^cache-control:.*immutable"'
  chk "/assets inexistente (no debe devolver la aplicacion)" 404 'H "$L/assets/no-existe.js"'
  chk "archivo oculto /.env" 403 'H "$L/.env"'
  chk "archivo oculto /.git/config" 403 'H "$L/.git/config"'
  chk "rutas internas bloqueadas (clinico)" 404 'H "$L/clinico/api/v1/internos/x"'
  chk "rutas internas bloqueadas (autenticacion)" 404 'H "$L/autenticacion/api/internos/x"'
  chk "rutas internas bloqueadas (agenda)" 404 'H "$L/agenda/api/v1/internos"'
  chk "proxy a autenticacion (/v3/api-docs)" 200 'H "$L/autenticacion/v3/api-docs"'
  chk "proxy a clinico (/v3/api-docs)" 200 'H "$L/clinico/v3/api-docs"'
  chk "proxy a agenda (/v3/api-docs)" 200 'H "$L/agenda/v3/api-docs"'
  chk "clinico servicios /api/v1 (lee Atlas, no escribe)" 200 'H "$L/clinico/api/v1/servicios"'
  chk "clinico nutricionistas /api/v1 (lee Atlas, no escribe)" 200 'H "$L/clinico/api/v1/nutricionistas"'
  chk "autenticacion /api/v1/usuarios sin token" 401 'H "$L/autenticacion/api/v1/usuarios"'
  chk "agenda /api/v1/citas sin token" 401 'H "$L/agenda/api/v1/citas"'
  chk "login ficticio por Nginx local con las cabeceras de Caddy (no escribe)" 401 'PB "$L/autenticacion/api/v1/autenticacion/iniciar-sesion" "$U" "$LG" -H "Host: $DOM" -H "X-Forwarded-Proto: https"'
  chk "contacto invalido por Nginx local (400, no escribe)" 400 'PB "$L/clinico/api/v1/solicitudes-contacto" "$U" "$CT" -H "Host: $DOM" -H "X-Forwarded-Proto: https"'
  chk "listado de contacto sin token (401)" 401 'H "$L/clinico/api/v1/solicitudes-contacto"'
  chk "JavaScript: todas las rutas usan /api/v1 e incluyen contacto" "autenticacion/iniciar-sesion usuarios servicios nutricionistas agendas citas pagos reportes solicitudes-contacto" 'verbundle'
  chk "JavaScript: rutas /api sin version" 0 'sinver'
  chk "JavaScript: formulario de contacto con envio al servicio" 1 'js | grep -lF "[Motivo: " >/dev/null && echo 1 || echo 0'
  chk "JavaScript: sin direcciones localhost:808x" 0 'js | grep -c "localhost:808"'
  chk "HTTPS /" 200 'H --resolve "$RES" "$U/"'
  chk "HTTPS ruta de la SPA /contacto" 200 'H --resolve "$RES" "$U/contacto"'
  chk "HTTPS clinico servicios /api/v1" 200 'H --resolve "$RES" "$U/clinico/api/v1/servicios"'
  chk "HTTPS agenda /api/v1/citas sin token" 401 'H --resolve "$RES" "$U/agenda/api/v1/citas"'
  chk "HTTPS login ficticio con Origin del dominio (CORS, no escribe)" 401 'PB "$U/autenticacion/api/v1/autenticacion/iniciar-sesion" "$U" "$LG" --resolve "$RES"'
  chk "HTTPS contacto invalido con Origin del dominio (400, no escribe)" 400 'PB "$U/clinico/api/v1/solicitudes-contacto" "$U" "$CT" --resolve "$RES"'
  chk "HTTPS login ficticio con Origin ajeno (debe rechazarse)" 403 'PB "$U/autenticacion/api/v1/autenticacion/iniciar-sesion" "https://sitio-ajeno.example" "$LG" --resolve "$RES"'
  chk "Caddy, Caddyfile, montajes, volumenes y certificado sin cambios" "$CADDY_ANTES" 'caddy_estado'
  chk "autenticacion, clinico y agenda sin cambios" "$OTROS_ANTES" 'for c in nutrivida-autenticacion nutrivida-clinico nutrivida-agenda; do docker inspect -f "{{.Name}} {{.State.StartedAt}}" "$c" 2>/dev/null; done'
  chk "contenedores -previo anteriores sin cambios" "$PREVIOS_ANTES" 'for c in $(docker ps -a --filter "name=-previo" --format "{{.Names}}" | sort); do docker inspect -f "{{.Name}} {{.Id}} {{.State.Status}} {{.State.FinishedAt}}" "$c"; done'
  chk "errores reales en el registro (se ignoran los rechazos esperados de /.env y /assets)" 0 'docker logs "$N" 2>&1 | grep -iE "emerg|\[error\]|\[crit\]" | grep -vcE "access forbidden by rule|No such file or directory"'
} > /tmp/b8-chk.txt 2>&1
cat /tmp/b8-chk.txt
MAL=$(grep -c '^MAL' /tmp/b8-chk.txt || true); rm -f /tmp/b8-chk.txt
[ "$MAL" = 0 ] || fallo "$MAL verificaciones no pasaron"
echo "== 4. estado final"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
free -m
echo "imagen anterior conservada: $OLD_REF ($OLD_ID) y etiqueta chiguin/nutrivida:frontend-previo-$TS; respaldo de .env y Compose en $B"
echo "### B8 FRONTEND COMPLETADO. Reversion manual: cd $D && sudo ETIQUETA_IMAGENES=$OLD_ETIQUETA docker compose up -d --no-deps --no-build --pull never --force-recreate $S"
