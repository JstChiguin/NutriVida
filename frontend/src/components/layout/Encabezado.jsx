import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const claseEnlace = ({ isActive }) => {
  const activo = isActive ? 'border-bottom border-2 pb-1' : '';
  return `text-white text-decoration-none fw-semibold ${activo}`;
};

export default function Encabezado({ cantidad = 0 }) {
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();

  const cerrar = () => setAbierto(false);

  const navegarSeccion = (e, seccionId) => {
    cerrar();
    if (location.pathname === '/') {
      e.preventDefault();
      const elemento = document.getElementById(seccionId);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="encabezado-principal sticky-top shadow-sm bg-success">
      <div className="mx-auto w-full max-w-[64rem] px-4 py-2 d-flex flex-wrap justify-content-between align-items-center">
        <NavLink
          to="/"
          className="logo d-flex align-items-center gap-2 text-white"
          onClick={cerrar}
          style={{ textDecoration: 'none' }}
        >
          <img
            src="img/logo-nutrivida.png"
            alt="Logo de NutriVida"
            style={{ width: '45px', height: '45px', objectFit: 'contain' }}
          />
          <span className="fs-4 fw-bold">NutriVida</span>
        </NavLink>

        <button
          type="button"
          className="btn btn-outline-light d-md-none d-flex flex-column justify-content-center align-items-center p-2"
          aria-expanded={abierto}
          aria-controls="menu-secciones"
          onClick={() => setAbierto(!abierto)}
        >
          <span className="visually-hidden">{abierto ? 'Cerrar menú' : 'Abrir menú'}</span>
          <span className="d-flex flex-column gap-1" aria-hidden="true">
            <span
              className="d-block"
              style={{ width: '20px', height: '2px', backgroundColor: 'currentColor' }}
            />
            <span
              className="d-block"
              style={{ width: '20px', height: '2px', backgroundColor: 'currentColor' }}
            />
            <span
              className="d-block"
              style={{ width: '20px', height: '2px', backgroundColor: 'currentColor' }}
            />
          </span>
        </button>

        <nav
          id="menu-secciones"
          aria-label="Secciones"
          className={`navegacion-principal ${
            abierto ? 'd-block w-100 mt-3' : 'd-none d-md-block'
          }`}
        >
          <ul className="d-flex flex-column flex-md-row gap-3 gap-md-4 list-unstyled mb-0 align-items-md-center">
            <li>
              <NavLink to="/" end className={claseEnlace} onClick={cerrar}>
                Inicio
              </NavLink>
            </li>
            <li>
              <a
                href="/#servicios"
                onClick={(e) => navegarSeccion(e, 'servicios')}
                className="text-white text-decoration-none fw-semibold"
              >
                Servicios
              </a>
            </li>
            <li>
              <a
                href="/#nutricionistas"
                onClick={(e) => navegarSeccion(e, 'nutricionistas')}
                className="text-white text-decoration-none fw-semibold"
              >
                Nutricionistas
              </a>
            </li>
            <li>
              <NavLink to="/contacto" className={claseEnlace} onClick={cerrar}>
                Contacto
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
