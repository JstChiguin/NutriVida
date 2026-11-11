const COLORES = {
  SOLICITADA: 'bg-amber-100 text-amber-800',
  CONFIRMADA: 'bg-green-100 text-green-800',
  RECHAZADA: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-gray-200 text-gray-700',
  REALIZADA: 'bg-blue-100 text-blue-800',
  INASISTENCIA: 'bg-orange-100 text-orange-800',
  neutro: 'bg-gray-100 text-gray-700',
  positivo: 'bg-green-100 text-green-800',
  negativo: 'bg-red-100 text-red-800',
};

export function Insignia({ tipo = 'neutro', children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORES[tipo] ?? COLORES.neutro}`}>
      {children}
    </span>
  );
}
