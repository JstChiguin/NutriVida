
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../../hooks/useAutenticacion.js';

const enlacesPublicos = [
  { ruta: '/', etiqueta: 'Inicio' },
  { ruta: '/servicios', etiqueta: 'Servicios' },
  { ruta: '/nutricionistas', etiqueta: 'Nutricionistas' },
  { ruta: '/contacto', etiqueta: 'Contacto' },
];

const enlacesPorRol = {
  PACIENTE: [
    { ruta: '/mis-citas', etiqueta: 'Mis citas' },
    { ruta: '/seguimiento', etiqueta: 'Seguimiento' },
    { ruta: '/planes-alimentarios', etiqueta: 'Mi plan' },
  ],
  NUTRICIONISTA: [
    { ruta: '/agenda', etiqueta: 'Agenda' },
    { ruta: '/pacientes', etiqueta: 'Pacientes' },
  ],
  ADMINISTRADOR: [
    { ruta: '/administracion', etiqueta: 'Administración' },
    { ruta: '/reportes', etiqueta: 'Reportes' },
  ],
};

const claseEnlace = ({ isActive }) => {
  const activo = isActive ? 'border-bottom border-2 pb-1' : '';
  return `text-white text-decoration-none fw-semibold ${activo}`;
};

export default function Encabezado() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, autenticado, cerrarSesion } = useAutenticacion();
  const navegar = useNavigate();

  const cerrarMenu = () => setAbierto(false);

  const enlaces = [
    ...enlacesPublicos,
    ...(usuario ? enlacesPorRol[usuario.rol] ?? [] : []),
  ];

  const salir = async () => {
    cerrarMenu();
    await cerrarSesion();
    navegar('/');
  };

  return (
    <header className="encabezado-principal sticky-top shadow-sm bg-success">
      <div className="mx-auto w-full max-w-[64rem] px-4 py-2 d-flex flex-wrap justify-content-between align-items-center">
        <Link
          to="/"
          className="logo d-flex align-items-center gap-2 text-white text-decoration-none"
          onClick={cerrarMenu}
        >
          <img
            src="/img/logo-nutrivida.png"
            alt="Logo de NutriVida"
            style={{ width: '45px', height: '45px', objectFit: 'contain' }}
          />
          <span className="fs-4 fw-bold">NutriVida</span>
        </Link>

        <button
          type="button"
          className="btn btn-outline-light d-md-none d-flex flex-column justify-content-center align-items-center p-2"
          aria-expanded={abierto}
          aria-controls="menu-secciones"
          onClick={() => setAbierto(!abierto)}
        >
          <span className="visually-hidden">
            {abierto ? 'Cerrar menú' : 'Abrir menú'}
          </span>
          <span className="d-flex flex-column gap-1" aria-hidden="true">
            {[1, 2, 3].map((linea) => (
              <span
                key={linea}
                className="d-block"
                style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: 'currentColor',
                }}
              />
            ))}
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
            {enlaces.map((enlace) => (
              <li key={enlace.ruta}>
                <NavLink
                  to={enlace.ruta}
                  end={enlace.ruta === '/'}
                  className={claseEnlace}
                  onClick={cerrarMenu}
                >
                  {enlace.etiqueta}
                </NavLink>
              </li>
            ))}

            {autenticado && usuario ? (
              <>
                <li>
                  <NavLink
                    to="/perfil"
                    className={claseEnlace}
                    onClick={cerrarMenu}
                  >
                    {usuario.nombreCompleto?.split(' ')[0] ?? 'Perfil'}
                  </NavLink>
                </li>
                <li>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm fw-semibold"
                    onClick={salir}
                  >
                    Cerrar sesión
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink
                    to="/iniciar-sesion"
                    className={claseEnlace}
                    onClick={cerrarMenu}
                  >
                    Iniciar sesión
                  </NavLink>
                </li>
                <li>
                  <Link
                    to="/registro"
                    className="btn btn-light btn-sm fw-semibold text-success"
                    onClick={cerrarMenu}
                  >
                    Registrarse
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
