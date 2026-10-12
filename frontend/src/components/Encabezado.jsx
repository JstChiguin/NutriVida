import { useState } from 'react';

export default function Encabezado({ vistaActual, onNavegar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const manejarClick = (e, seccionId) => {
    e.preventDefault();
    setMenuAbierto(false);
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
    <header className="encabezado-principal sticky-top shadow-sm bg-success">
      <div className="container-fluid px-3 px-md-5 d-flex flex-wrap justify-content-between align-items-center py-2">
        <div
          className="logo d-flex align-items-center gap-2 text-white"
          onClick={(e) => manejarClick(e, 'inicio')}
          style={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          <img
            src="img/logo-nutrivida.png"
            alt="Logo de NutriVida"
            style={{ width: '45px', height: '45px', objectFit: 'contain' }}
          />
          <span className="fs-4 fw-bold">NutriVida</span>
        </div>

        <button
          className="btn btn-outline-light d-md-none"
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          ☰
        </button>

        <nav
          className={`navegacion-principal ${
            menuAbierto ? 'd-block w-100 mt-3' : 'd-none d-md-block'
          }`}
          aria-label="Navegación principal"
        >
          <ul className="d-flex flex-column flex-md-row gap-3 gap-md-4 list-unstyled mb-0 align-items-md-center">
            <li>
              <a
                href="#inicio"
                onClick={(e) => manejarClick(e, 'inicio')}
                className={`text-white text-decoration-none fw-semibold ${
                  vistaActual === 'inicio' ? 'border-bottom border-2 pb-1' : ''
                }`}
              >
                Inicio
              </a>
            </li>
            <li>
              <a
                href="#servicios"
                onClick={(e) => manejarClick(e, 'servicios')}
                className={`text-white text-decoration-none fw-semibold ${
                  vistaActual === 'servicios' ? 'border-bottom border-2 pb-1' : ''
                }`}
              >
                Servicios
              </a>
            </li>
            <li>
              <a
                href="#nutricionistas"
                onClick={(e) => manejarClick(e, 'nutricionistas')}
                className={`text-white text-decoration-none fw-semibold ${
                  vistaActual === 'nutricionistas' ? 'border-bottom border-2 pb-1' : ''
                }`}
              >
                Nutricionistas
              </a>
            </li>
            <li>
              <a
                href="#contacto"
                onClick={(e) => manejarClick(e, 'contacto')}
                className={`text-white text-decoration-none fw-semibold ${
                  vistaActual === 'contacto' ? 'border-bottom border-2 pb-1' : ''
                }`}
              >
                Contacto
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
