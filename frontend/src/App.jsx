import { useState } from 'react';
import Encabezado from './components/paginas/Encabezado';
import Portada from './components/paginas/Portada';
import Servicios from './components/paginas/Servicios';
import Nutricionistas from './components/paginas/Nutricionistas';
import Contacto from './components/paginas/Contacto';
import PiePagina from './components/paginas/PiePagina';

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState('inicio');

  const navegarA = (seccionId) => {
    setSeccionActiva(seccionId);
    const elemento = document.getElementById(seccionId);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="contenedor-app">
      {/* Encabezado común a toda la aplicación */}
      <Encabezado vistaActual={seccionActiva} onNavegar={navegarA} />

      {/* Vistas agrupadas en una sola página (SPA) */}
      <main>
        {/* Vista Inicio / Portada principal */}
        <Portada />

        {/* Vista / Sección de Servicios */}
        <Servicios />

        {/* Vista / Sección de Nutricionistas */}
        <Nutricionistas />

        {/* Vista de Contacto (anteriormente contacto.html) */}
        <Contacto />
      </main>

      {/* Pie de página común */}
      <PiePagina />
    </div>
  );
}

