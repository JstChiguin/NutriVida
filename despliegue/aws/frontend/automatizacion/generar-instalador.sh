#!/usr/bin/env bash
set -eu

DIRECTORIO_BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIRECTORIO_SALIDA="${1:-$DIRECTORIO_BASE/salida}"
LINEAS_POR_PARTE="${2:-140}"

SCRIPT="$DIRECTORIO_BASE/nutrivida-dominio-automatico.sh"
UNIDAD="$DIRECTORIO_BASE/nutrivida-dominio-automatico.service"
CONFIGURACION="$DIRECTORIO_BASE/dominio-automatico.conf.ejemplo"
PLANTILLA="$DIRECTORIO_BASE/instalador.plantilla.sh"
INSTALADOR="$DIRECTORIO_SALIDA/instalar-dominio-automatico.sh"

huella() {
    sha256sum "$1" | cut -d' ' -f1
}

for archivo in "$SCRIPT" "$UNIDAD" "$CONFIGURACION"; do
    [ "$(tail -c 1 "$archivo" | od -An -c | tr -d ' ')" = '\n' ] || { echo "El archivo no termina en salto de linea: $archivo" >&2; exit 1; }
    ! grep -q '^EOF_' "$archivo" || { echo "El archivo contiene un delimitador reservado: $archivo" >&2; exit 1; }
done

mkdir -p "$DIRECTORIO_SALIDA"

while IFS= read -r linea || [ -n "$linea" ]; do
    case "$linea" in
        '@@CARGA_SCRIPT@@') sed '$a\' "$SCRIPT" ;;
        '@@CARGA_UNIDAD@@') sed '$a\' "$UNIDAD" ;;
        '@@CARGA_CONFIGURACION@@') sed '$a\' "$CONFIGURACION" ;;
        *) printf '%s\n' "$linea" ;;
    esac
done < "$PLANTILLA" > "$INSTALADOR.tmp"

{
    cat "$INSTALADOR.tmp"
} | sed \
    -e "s/@@HUELLA_SCRIPT@@/$(huella "$SCRIPT")/" \
    -e "s/@@HUELLA_UNIDAD@@/$(huella "$UNIDAD")/" \
    -e "s/@@HUELLA_CONFIGURACION@@/$(huella "$CONFIGURACION")/" > "$INSTALADOR"
rm -f "$INSTALADOR.tmp"

rm -f "$DIRECTORIO_SALIDA"/parte-*.txt
total_lineas="$(wc -l < "$INSTALADOR")"
numero=1
inicio=1
while [ "$inicio" -le "$total_lineas" ]; do
    fin=$((inicio + LINEAS_POR_PARTE - 1))
    archivo_parte="$DIRECTORIO_SALIDA/parte-$numero.txt"
    if [ "$numero" -eq 1 ]; then
        operador='>'
    else
        operador='>>'
    fi
    {
        printf "cat %s /tmp/instalar-dominio-automatico.sh <<'EOF_PARTE_%s'\n" "$operador" "$numero"
        sed -n "${inicio},${fin}p" "$INSTALADOR"
        printf 'EOF_PARTE_%s\n' "$numero"
    } > "$archivo_parte"
    numero=$((numero + 1))
    inicio=$((fin + 1))
done

{
    printf 'Instalador: %s\n' "$INSTALADOR"
    printf 'Lineas: %s\n' "$total_lineas"
    printf 'Partes: %s\n' "$((numero - 1))"
    printf 'SHA-256 del instalador: %s\n' "$(huella "$INSTALADOR")"
    printf 'SHA-256 del script principal: %s\n' "$(huella "$SCRIPT")"
} | tee "$DIRECTORIO_SALIDA/resumen.txt"
