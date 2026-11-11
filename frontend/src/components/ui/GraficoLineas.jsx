const ANCHO = 600;
const ALTO = 220;
const MARGEN = 36;

export function GraficoLineas({ titulo, puntos, unidad = '' }) {
  if (puntos.length === 0) {
    return <p className="py-6 text-center text-gray-500">Aún no hay mediciones registradas.</p>;
  }
  const valores = puntos.map((punto) => punto.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;
  const coordenadaX = (indice) => MARGEN + (puntos.length === 1 ? (ANCHO - 2 * MARGEN) / 2 : (indice * (ANCHO - 2 * MARGEN)) / (puntos.length - 1));
  const coordenadaY = (valor) => ALTO - MARGEN - ((valor - minimo) / rango) * (ALTO - 2 * MARGEN);
  const trazado = puntos.map((punto, indice) => `${coordenadaX(indice)},${coordenadaY(punto.valor)}`).join(' ');

  return (
    <figure>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo} className="w-full">
        <polyline points={trazado} fill="none" stroke="#198754" strokeWidth="3" />
        {puntos.map((punto, indice) => (
          <g key={punto.etiqueta}>
            <circle cx={coordenadaX(indice)} cy={coordenadaY(punto.valor)} r="5" fill="#198754" />
            <text x={coordenadaX(indice)} y={coordenadaY(punto.valor) - 10} textAnchor="middle" fontSize="12">
              {punto.valor}{unidad}
            </text>
            <text x={coordenadaX(indice)} y={ALTO - 10} textAnchor="middle" fontSize="11" fill="#666">
              {punto.etiqueta}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
