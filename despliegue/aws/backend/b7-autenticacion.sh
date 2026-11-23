#!/bin/bash
set -uo pipefail
umask 077
S=autenticacion
N=nutrivida-autenticacion
P=8081
D=/opt/nutrivida/backend
R=/opt/nutrivida/respaldo
ETIQUETA="${1:-}"
HUELLA="${2:-}"
IMG="chiguin/nutrivida:autenticacion-${ETIQUETA}"
DIG="chiguin/nutrivida@${HUELLA}"
IMG_CLI=chiguin/nutrivida:clinico-899e328

[ "${CONFIRMO:-}" = "SI" ] || { echo "falta CONFIRMO=SI: no se hizo nada"; exit 1; }
[[ "$ETIQUETA" =~ ^[0-9a-f]{7}$ ]] && [[ "$HUELLA" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "uso: sudo -n env CONFIRMO=SI bash b7-autenticacion.sh <etiqueta-de-7-hex> <sha256:digest>"; exit 1; }
[ "$(id -u)" = 0 ] || { echo "ejecute con sudo -n"; exit 1; }
mkdir -p "$R"
exec > >(tee -a "$R/b7-$S-$(date +%Y%m%d-%H%M%S).log") 2>&1
cd "$D" || { echo "no existe $D: ejecute antes B2"; exit 1; }
IP=$(grep '^IP_ESCUCHA=' .env | cut -d= -f2-)
[[ "$IP" =~ ^10\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "IP_ESCUCHA del .env no es una IP privada valida"; exit 1; }

esperar_http() { for _ in $(seq 1 "$2"); do [ "$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://$IP:$1/v3/api-docs")" = "200" ] && return 0; sleep 5; done; return 1; }
revertir() {
  echo "!! REVIRTIENDO a la imagen anterior $OLD_REF"
  ETIQUETA_IMAGENES="$OLD_ETIQUETA" docker compose up -d --no-deps --force-recreate "servicio-$S" || { echo "REVERSION FALLIDA: compose no pudo recrear con $OLD_REF. Intervencion manual (imagen y .env respaldados en $B)"; exit 2; }
  if esperar_http "$P" 40 && [ "$(docker inspect -f '{{.Image}}' "$N")" = "$OLD_ID" ]; then
    echo "REVERSION COMPLETA: $N responde 200 con la imagen anterior $OLD_ID"
  else
    echo "REVERSION INCOMPLETA: $N no responde 200 con la imagen anterior. Intervencion manual (respaldo en $B)"; exit 2
  fi
  exit 1
}
fallo() { echo "!! FALLO: $1"; revertir; }

echo "== 0. puertas de seguridad (sin cambios hasta pasarlas)"
[ -f .env ] && [ -f docker-compose.yml ] || { echo "faltan .env o docker-compose.yml: ejecute antes B2"; exit 1; }
[ "$(docker inspect -f '{{.State.Status}}' "$N" 2>/dev/null)" = running ] || { echo "$N no esta en ejecucion"; exit 1; }
OLD_REF=$(docker inspect -f '{{.Config.Image}}' "$N")
[[ "$OLD_REF" =~ ^chiguin/nutrivida:autenticacion-([0-9a-f]{7})$ ]] || { echo "la imagen actual ($OLD_REF) no tiene el formato esperado: no se sabria revertir. No se hizo nada."; exit 1; }
OLD_ETIQUETA="${BASH_REMATCH[1]}"
OLD_ID=$(docker inspect -f '{{.Image}}' "$N")
[ "$(docker image inspect "$OLD_REF" --format '{{.Id}}' 2>/dev/null)" = "$OLD_ID" ] || { echo "la etiqueta $OLD_REF no apunta a la imagen en uso: no se hizo nada"; exit 1; }
[ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$N")" = "nutrivida-backend" ] || { echo "$N no pertenece al proyecto Compose nutrivida-backend: no se hizo nada"; exit 1; }
docker pull "$IMG" >/dev/null || { echo "no se pudo descargar $IMG (inicie sesion en Docker Hub con un token de solo lectura)"; exit 1; }
[ "$(docker image inspect "$IMG" --format '{{index .RepoDigests 0}}' 2>/dev/null)" = "$DIG" ] || { echo "el digest de $IMG no coincide con el esperado: no se hizo ningun cambio"; exit 1; }
ID_NUEVA=$(docker image inspect "$IMG" --format '{{.Id}}')
[ "$OLD_ID" != "$ID_NUEVA" ] || { echo "$N ya usa $IMG: no hay nada que actualizar"; exit 0; }
[ "$(docker inspect -f '{{.Image}}' nutrivida-clinico 2>/dev/null)" = "$(docker image inspect "$IMG_CLI" --format '{{.Id}}' 2>/dev/null)" ] || { echo "nutrivida-clinico no usa la imagen nueva $IMG_CLI: complete antes B3"; exit 1; }
[ "$(docker inspect -f '{{.State.Health.Status}}' nutrivida-clinico 2>/dev/null)" = healthy ] || { echo "nutrivida-clinico no esta healthy"; exit 1; }
SWAP_LIBRE=$(free -m | awk '/^Swap/ {print $4}')
echo "swap libre: ${SWAP_LIBRE} MB (minimo 300)"; [ "${SWAP_LIBRE:-0}" -ge 300 ] || { echo "swap libre insuficiente"; exit 1; }
[ "$(curl -s -m 8 -o /dev/null -w '%{http_code}' "http://$IP:$P/v3/api-docs")" = "200" ] || { echo "el $S actual no responde 200"; exit 1; }
DEFINIDAS='NUTRIVIDA_MONGO_URI NUTRIVIDA_JWT_SECRETO NUTRIVIDA_JWT_EXPIRACION_MINUTOS NUTRIVIDA_ORIGENES_PERMITIDOS NUTRIVIDA_FORWARD_HEADERS JAVA_TOOL_OPTIONS NUTRIVIDA_URL_CLINICO NUTRIVIDA_ADMIN_CORREO NUTRIVIDA_ADMIN_CONTRASENA'
EXTRAS=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$N" | cut -d= -f1 | sort | comm -23 - <(printf '%s\n' $DEFINIDAS | sort) | grep -vE '^(PATH|HOME|HOSTNAME|LANG|LANGUAGE|LC_ALL|JAVA_HOME|JAVA_VERSION)$' || true)
[ -z "$EXTRAS" ] || { echo "El contenedor actual tiene variables que el Compose no define: $(echo $EXTRAS | tr '\n' ' '). No se hizo ningun cambio."; exit 1; }
echo "variables del contenedor actual: todas cubiertas por el Compose"
vct() { docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" | { grep "^$2=" || true; } | sha256sum | cut -d' ' -f1; }
venv() { { grep "^$1=" .env || true; } | sha256sum | cut -d' ' -f1; }
VACIO=$(printf '' | sha256sum | cut -d' ' -f1)
DIF=0
for v in NUTRIVIDA_MONGO_URI NUTRIVIDA_JWT_SECRETO NUTRIVIDA_JWT_EXPIRACION_MINUTOS NUTRIVIDA_ADMIN_CORREO NUTRIVIDA_ADMIN_CONTRASENA; do
  a=$(vct "$N" "$v")
  if [ "$a" = "$VACIO" ]; then echo "$v: no definida en el contenedor actual (se usara el valor del Compose)"
  elif [ "$a" = "$(venv "$v")" ]; then echo "$v: igual en el contenedor actual y en el .env (se conserva)"
  else echo "$v: DIFERENTE entre el contenedor actual y el .env"; DIF=1; fi
done
[ "$DIF" = 0 ] || { echo "El .env no conserva la configuracion actual. No se hizo ningun cambio."; exit 1; }
ORIGEN=$(grep '^NUTRIVIDA_ORIGENES_PERMITIDOS=' .env | cut -d= -f2-)
case "$ORIGEN" in https://*) echo "origen permitido en el .env: $ORIGEN";; *) echo "NUTRIVIDA_ORIGENES_PERMITIDOS del .env no es un origen https: no se hizo nada"; exit 1;; esac
SONDA='{"correo":"ficticio.sonda@nutrivida.test","contrasena":"Clave-Ficticia-1"}'
sonda() { local a=(); [ -n "$1" ] && a=(-H "Origin: $1"); curl -s -m 25 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' "${a[@]}" -d "$SONDA" "http://$IP:$P$2"; }
echo "info (imagen ACTUAL): login ficticio con Origin $ORIGEN = $(sonda "$ORIGEN" /api/autenticacion/iniciar-sesion) (403 = la imagen actual rechaza el origen https; tras el reemplazo debe dar 401). No escribe en Atlas."
ID_NUEVA=$(docker image inspect "$IMG" --format '{{.Id}}')
OTROS_ANTES=$(for c in nutrivida-clinico nutrivida-agenda; do docker inspect -f '{{.Name}} {{.State.StartedAt}}' "$c"; done)
PREVIOS_ANTES=$(for c in $(docker ps -a --filter 'name=-previo' --format '{{.Names}}' | sort); do docker inspect -f '{{.Name}} {{.Id}} {{.State.Status}} {{.State.FinishedAt}}' "$c"; done)
echo "contenedores -previo existentes (se conservan intactos): $(echo "$PREVIOS_ANTES" | grep -c . || true)"
free -m; vmstat 1 3
TS=$(date +%Y%m%d-%H%M%S)
B="$R/b7-respaldo-$TS"
mkdir -p "$B"
cp -p .env docker-compose.yml "$B/"
VARS_ANTES="$B/variables-antes.sha256"
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$N" | sort | while IFS= read -r l; do [ -n "$l" ] && printf '%s %s
' "${l%%=*}" "$(printf '%s' "${l#*=}" | sha256sum | cut -d' ' -f1)"; done > "$VARS_ANTES"
docker inspect -f 'imagen={{.Image}} etiqueta={{.Config.Image}} memoria={{.HostConfig.Memory}} reinicio={{.HostConfig.RestartPolicy.Name}} puertos={{json .HostConfig.PortBindings}} inicio={{.State.StartedAt}}' "$N" > "$B/autenticacion-config.txt"
docker tag "$OLD_ID" "chiguin/nutrivida:autenticacion-previo-$TS" || { echo "no se pudo etiquetar la imagen anterior: no se hizo nada"; exit 1; }
echo "respaldo: $B (.env y Compose copiados, 600) y etiqueta chiguin/nutrivida:autenticacion-previo-$TS sobre la imagen anterior $OLD_ID"

echo "== 1. reemplazo con Compose en su propio proyecto nutrivida-backend (corte desde ahora)"
T0=$(date +%s)
ETIQUETA_IMAGENES="$ETIQUETA" docker compose up -d --no-deps --force-recreate "servicio-$S" || fallo "docker compose up fallo"

echo "== 2. espera de salud (maximo 250 s)"
OK=0
for _ in $(seq 1 50); do
  E=$(docker inspect -f '{{.State.Status}}/{{.State.Health.Status}}' "$N" 2>/dev/null)
  case "$E" in
    running/healthy) OK=1; break;;
    exited/*|dead/*|restarting/*|*/unhealthy) fallo "el contenedor nuevo quedo en estado $E";;
  esac
  sleep 5
done
[ "$OK" = 1 ] || fallo "no llego a healthy en 250 s"
echo "healthy; corte total aproximado: $(( $(date +%s) - T0 )) s"

echo "== 3. verificaciones automaticas (hasta 3 intentos cada una, por el arranque en frio)"
read -r -d '' PROBE <<'EOS'
if command -v curl >/dev/null 2>&1; then curl -s -m 25 -o /dev/null -w "%{http_code}" "$1"; elif command -v wget >/dev/null 2>&1; then wget -q -T 25 -S -O /dev/null "$1" 2>&1 | awk '/HTTP\//{c=$2} END{print c}'; else echo sin-herramienta; fi
EOS
cmpvar() { local a b; a=$(grep "^$1 " "$VARS_ANTES" | cut -d' ' -f2); b=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$N" | grep "^$1=" | cut -d= -f2- | tr -d '
' | sha256sum | cut -d' ' -f1); if [ -z "$a" ] || [ "$a" = "$b" ]; then echo igual; else echo distinta; fi; }
export IP P N PROBE ORIGEN SONDA VACIO VARS_ANTES
export PREVIOS_ANTES
export -f vct sonda cmpvar
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
  chk "reinicio automatico" "unless-stopped" 'docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" "$N"'
  chk "limite de memoria (384 MiB)" "402653184" 'docker inspect -f "{{.HostConfig.Memory}}" "$N"'
  chk "imagen en uso (la descargada y verificada)" "$ID_NUEVA" 'docker inspect -f "{{.Image}}" "$N"'
  chk "/v3/api-docs" 200 'curl -s -m 25 -o /dev/null -w "%{http_code}" "http://$IP:$P/v3/api-docs"'
  chk "swagger-ui" 200 'curl -s -m 25 -o /dev/null -w "%{http_code}" "http://$IP:$P/swagger-ui/index.html"'
  chk "GET /api/v1/usuarios sin token" 401 'curl -s -m 15 -o /dev/null -w "%{http_code}" "http://$IP:$P/api/v1/usuarios"'
  chk "GET /api/usuarios (ruta antigua) sin token" 401 'curl -s -m 15 -o /dev/null -w "%{http_code}" "http://$IP:$P/api/usuarios"'
  chk "login ficticio con Origin del dominio (CORS y lectura de Atlas, sin escribir)" 401 'sonda "$ORIGEN" /api/v1/autenticacion/iniciar-sesion'
  chk "login ficticio por la ruta antigua con Origin del dominio" 401 'sonda "$ORIGEN" /api/autenticacion/iniciar-sesion'
  chk "login ficticio sin Origin" 401 'sonda "" /api/v1/autenticacion/iniciar-sesion'
  if [ "${PRUEBA_409:-}" = "SI" ]; then
    chk "RUT ya existente (ficticio) -> 409 y sin usuario nuevo" "409 401" 'r=$(curl -s -m 40 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"nombreCompleto\":\"PRUEBA DUPLICADO RUT\",\"correo\":\"prueba.rut.duplicado@example.com\",\"contrasena\":\"Clave-Ficticia-1\",\"rut\":\"97000422-K\"}" "http://$IP:$P/api/v1/autenticacion/registro"); l=$(curl -s -m 25 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"correo\":\"prueba.rut.duplicado@example.com\",\"contrasena\":\"Clave-Ficticia-1\"}" "http://$IP:$P/api/v1/autenticacion/iniciar-sesion"); echo "$r $l"'
  fi
  chk "login ficticio con Origin ajeno (debe rechazarse)" 403 'sonda "https://sitio-ajeno.example" /api/v1/autenticacion/iniciar-sesion'
  chk "desde autenticacion a servicio-clinico" 200 'docker exec "$N" sh -c "$PROBE" _ http://servicio-clinico:8082/v3/api-docs'
  chk "desde autenticacion a nutrivida-clinico" 200 'docker exec "$N" sh -c "$PROBE" _ http://nutrivida-clinico:8082/v3/api-docs'
  for v in NUTRIVIDA_MONGO_URI NUTRIVIDA_JWT_SECRETO NUTRIVIDA_JWT_EXPIRACION_MINUTOS NUTRIVIDA_ADMIN_CORREO NUTRIVIDA_ADMIN_CONTRASENA; do
    chk "variable $v conservada" igual "cmpvar $v"
  done
  chk "errores reales en el registro (se ignoran cierres de conexion en /v3/api-docs)" 0 'docker logs "$N" 2>&1 | grep " ERROR " | grep -vc "/v3/api-docs"'
  echo "info: lineas ERROR por conexiones cerradas en /v3/api-docs (inocuas): $(docker logs "$N" 2>&1 | grep ' ERROR ' | grep -c '/v3/api-docs' || true)"
  echo "info: creaciones del administrador inicial en este arranque (esperado 0; solo ocurre si la base no tiene administrador): $(docker logs "$N" 2>&1 | grep -c 'administrador inicial' || true)"
  chk "clinico y agenda sin cambios" "$OTROS_ANTES" 'for c in nutrivida-clinico nutrivida-agenda; do docker inspect -f "{{.Name}} {{.State.StartedAt}}" "$c"; done'
  echo "info: variables solo en la version anterior (esperado: ninguna): $(cut -d' ' -f1 "$VARS_ANTES" | grep -vxFf <(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$N" | cut -d= -f1) | grep -vE '^(PATH|JAVA_HOME|JAVA_VERSION|LANG|LANGUAGE|LC_ALL)$' | tr '
' ' ' || true)"
  chk "contenedores -previo anteriores sin cambios" "$PREVIOS_ANTES" 'for c in $(docker ps -a --filter "name=-previo" --format "{{.Names}}" | sort); do docker inspect -f "{{.Name}} {{.Id}} {{.State.Status}} {{.State.FinishedAt}}" "$c"; done'
  chk "memoria del contenedor por debajo del 90% de su limite" "ok" 'p=$(docker stats --no-stream --format "{{.MemPerc}}" "$N" | tr -d "%" | cut -d. -f1); [ "${p:-100}" -lt 90 ] && echo ok || echo "${p}%"'
  chk "swap libre tras el reemplazo (minimo 200 MB)" "ok" 's=$(free -m | awk "/^Swap/ {print \$4}"); [ "${s:-0}" -ge 200 ] && echo ok || echo "${s} MB"'
} > /tmp/b7-chk.txt 2>&1
cat /tmp/b7-chk.txt
MAL=$(grep -c '^MAL' /tmp/b7-chk.txt || true); rm -f /tmp/b7-chk.txt
[ "$MAL" = 0 ] || fallo "$MAL verificaciones no pasaron"
echo "== 4. estado final"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}'
free -m; vmstat 1 3
echo "conexiones establecidas a Atlas (27017): $(ss -tn state established '( dport = :27017 )' | tail -n +2 | wc -l)"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' | grep -E 'NAMES|nutrivida-(clinico|autenticacion|agenda)'
echo "imagen anterior conservada: $OLD_REF ($OLD_ID) y etiqueta chiguin/nutrivida:autenticacion-previo-$TS; respaldo de .env y Compose en $B"
echo "### B7 AUTENTICACION COMPLETADO. Reversion manual: cd $D && sudo ETIQUETA_IMAGENES=$OLD_ETIQUETA docker compose up -d --no-deps --force-recreate servicio-$S"
