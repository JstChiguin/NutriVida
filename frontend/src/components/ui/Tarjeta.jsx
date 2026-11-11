export function Tarjeta({ titulo, acciones, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 ${className}`}>
      {(titulo || acciones) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-lg font-bold text-exito">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}
