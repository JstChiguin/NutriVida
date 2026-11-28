const RADIO_TIERRA_KM = 6371;

function aRadianes(grados) {
  return (grados * Math.PI) / 180;
}

export function calcularDistanciaKm(origen, destino) {
  const diferenciaLatitud = aRadianes(destino.latitud - origen.latitud);
  const diferenciaLongitud = aRadianes(destino.longitud - origen.longitud);
  const a = Math.sin(diferenciaLatitud / 2) ** 2
    + Math.cos(aRadianes(origen.latitud)) * Math.cos(aRadianes(destino.latitud)) * Math.sin(diferenciaLongitud / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
}

export function formatearDistancia(kilometros) {
  if (kilometros < 1) {
    return `${Math.round(kilometros * 1000)} m`;
  }
  return `${kilometros.toFixed(1).replace('.', ',')} km`;
}

export function enlaceIndicaciones(destino, origen = null) {
  const desde = origen ? `${origen.latitud},${origen.longitud}` : '';
  return `https://www.openstreetmap.org/directions?route=${encodeURIComponent(`${desde};${destino.latitud},${destino.longitud}`)}`;
}
