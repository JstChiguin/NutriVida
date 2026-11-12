export function GraficoBarras({ titulo, datos, etiqueta = 'etiqueta', valor = 'valor' }) {
  const maximo = Math.max(1, ...datos.map((dato) => dato[valor]));
  return (
    <figure aria-label={titulo}>
      <ul className="space-y-2">
        {datos.map((dato) => (
          <li key={dato[etiqueta]} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 truncate" title={dato[etiqueta]}>{dato[etiqueta]}</span>
            <span className="h-4 flex-1 rounded bg-gray-100" aria-hidden="true">
              <span className="block h-4 rounded bg-primario" style={{ width: `${(dato[valor] / maximo) * 100}%` }} />
            </span>
            <span className="w-10 text-right font-semibold">{dato[valor]}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
