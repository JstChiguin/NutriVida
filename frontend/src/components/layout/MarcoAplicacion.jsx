import { Outlet } from 'react-router-dom';
import Encabezado from '../paginas/Encabezado.jsx';
import PiePagina from '../paginas/PiePagina.jsx';

export default function MarcoAplicacion() {
  return (
    <div className="flex min-h-screen flex-col">
      <Encabezado />
      <main className="flex-1">
        <Outlet />
      </main>
      <PiePagina />
    </div>
  );
}
