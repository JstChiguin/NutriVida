const CLASE_CONTROL = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base shadow-sm focus:border-exito';

export function Campo({ etiqueta, id, error, ayuda, obligatorio = false, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {etiqueta}
        {obligatorio && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {ayuda && <p id={`ayuda-${id}`} className="mt-1 text-xs text-gray-500">{ayuda}</p>}
      <p id={`error-${id}`} role="alert" className="mt-1 min-h-4 text-xs text-red-600">{error || ''}</p>
    </div>
  );
}

export function CampoTexto({ etiqueta, id, error, ayuda, obligatorio, ...propiedades }) {
  return (
    <Campo etiqueta={etiqueta} id={id} error={error} ayuda={ayuda} obligatorio={obligatorio}>
      <input id={id} name={id} aria-describedby={`error-${id}`} className={CLASE_CONTROL} {...propiedades} />
    </Campo>
  );
}

export function CampoSeleccion({ etiqueta, id, error, obligatorio, opciones, marcador, ...propiedades }) {
  return (
    <Campo etiqueta={etiqueta} id={id} error={error} obligatorio={obligatorio}>
      <select id={id} name={id} aria-describedby={`error-${id}`} className={CLASE_CONTROL} {...propiedades}>
        {marcador !== undefined && <option value="">{marcador}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
        ))}
      </select>
    </Campo>
  );
}

export function CampoAreaTexto({ etiqueta, id, error, ayuda, obligatorio, ...propiedades }) {
  return (
    <Campo etiqueta={etiqueta} id={id} error={error} ayuda={ayuda} obligatorio={obligatorio}>
      <textarea id={id} name={id} aria-describedby={`error-${id}`} className={CLASE_CONTROL} rows={4} {...propiedades} />
    </Campo>
  );
}
