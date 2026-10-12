export default function Encabezado({ vistaActual, onNavegar }) {
  const manejarClick = (e, seccionId) => {
    e.preventDefault();
    if (onNavegar) {
      onNavegar(seccionId);
    } else {
      const elemento = document.getElementById(seccionId);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="encabezado-principal">
      <div
        className="logo"
        onClick={(e) => manejarClick(e, 'inicio')}
        style={{ cursor: 'pointer' }}
      >
        <img src="img/logo-nutrivida.png" alt="Logo de NutriVida" />
        <span>NutriVida</span>
      </div>

      <nav className="navegacion-principal" aria-label="Navegación principal">
        <ul>
          <li>
            <a
              href="#inicio"
              onClick={(e) => manejarClick(e, 'inicio')}
              className={vistaActual === 'inicio' ? 'activo' : ''}
            >
              Inicio
            </a>
          </li>
          <li>
            <a
              href="#servicios"
              onClick={(e) => manejarClick(e, 'servicios')}
              className={vistaActual === 'servicios' ? 'activo' : ''}
            >
              Servicios
            </a>
          </li>
          <li>
            <a
              href="#nutricionistas"
              onClick={(e) => manejarClick(e, 'nutricionistas')}
              className={vistaActual === 'nutricionistas' ? 'activo' : ''}
            >
              Nutricionistas
            </a>
          </li>
          <li>
            <a
              href="#contacto"
              onClick={(e) => manejarClick(e, 'contacto')}
              className={vistaActual === 'contacto' ? 'activo' : ''}
            >
              Contacto
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

