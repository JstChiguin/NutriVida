import { Boton } from './Boton.jsx';

export function Paginador({ pagina, totalPaginas, onCambiar }) {
  if (!totalPaginas || totalPaginas <= 1) {
    return null;
  }
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-center gap-3">
      <Boton variante="contorno" disabled={pagina === 0} onClick={() => onCambiar(pagina - 1)}>Anterior</Boton>
      <span className="text-sm">Página {pagina + 1} de {totalPaginas}</span>
      <Boton variante="contorno" disabled={pagina + 1 >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</Boton>
    </nav>
  );
}
