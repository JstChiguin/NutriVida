export default function Contenedor({ titulo, descripcion, acciones, children }) {
  return (
    <div className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8">
      {(titulo || acciones) && (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            {titulo && <h1 className="text-3xl font-bold text-exito">{titulo}</h1>}
            {descripcion && <p className="mt-1 text-gray-600">{descripcion}</p>}
          </div>
          {acciones}
        </header>
      )}
      {children}
    </div>
  );
}
