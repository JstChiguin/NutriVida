import { Link } from 'react-router-dom';
import { useState } from 'react';
import { EnlaceBoton } from '../ui/Boton.jsx';
import { useAutenticacion } from '../../hooks/useAutenticacion.js';
import Portada from './Portada.jsx';

const BENEFICIOS = [
  {
    titulo: 'Profesionales certificados',
    texto: 'Conoce los perfiles de nuestro equipo y descubre sus especialidades.',
  },
  {
    titulo: 'Reserva en línea',
    texto: 'Consulta los servicios disponibles y solicita una hora desde tu cuenta de paciente.',
  },
  {
    titulo: 'Seguimiento continuo',
    texto: 'Accede a tus controles, mediciones y planes alimentarios desde tu perfil.',
  },
];

const OPCIONES = [
  {
    id: 'servicios',
    etiqueta: 'Quiero conocer los servicios',
    titulo: 'Encuentra el servicio adecuado',
    descripcion: 'Explora las prestaciones nutricionales disponibles, sus características y valores referenciales.',
    ruta: '/servicios',
    accion: 'Explorar servicios',
  },
  {
    id: 'profesionales',
    etiqueta: 'Quiero conocer al equipo',
    titulo: 'Conoce a nuestros profesionales',
    descripcion: 'Revisa las especialidades de los nutricionistas y elige con quién deseas atenderte.',
    ruta: '/nutricionistas',
    accion: 'Ver nutricionistas',
  },
  {
    id: 'contacto',
    etiqueta: 'Tengo una consulta',
    titulo: 'Estamos para orientarte',
    descripcion: 'Utiliza el formulario de contacto para enviar tus dudas antes de solicitar una atención.',
    ruta: '/contacto',
    accion: 'Ir a contacto',
  },
];

export default function Inicio() {
  const { autenticado, usuario } = useAutenticacion();
  const [opcionActiva, setOpcionActiva] = useState('servicios');
  const seleccion = OPCIONES.find((opcion) => opcion.id === opcionActiva) ?? OPCIONES[0];

  const accesoPrincipal = !autenticado
    ? { ruta: '/registro', texto: 'Crear mi cuenta' }
    : usuario?.rol === 'PACIENTE'
      ? { ruta: '/mis-citas/nueva', texto: 'Reservar una cita' }
      : usuario?.rol === 'NUTRICIONISTA'
        ? { ruta: '/agenda', texto: 'Ir a mi agenda' }
        : usuario?.rol === 'ADMINISTRADOR'
          ? { ruta: '/administracion', texto: 'Ir a administración' }
          : { ruta: '/perfil', texto: 'Ir a mi perfil' };


  const rutasPasos = [
    '/nutricionistas',
    !autenticado
      ? '/registro'
      : usuario?.rol === 'PACIENTE'
        ? '/mis-citas/nueva'
        : '/servicios',
    !autenticado
      ? '/iniciar-sesion'
      : usuario?.rol === 'PACIENTE'
        ? '/seguimiento'
        : usuario?.rol === 'NUTRICIONISTA'
          ? '/pacientes'
          : '/administracion',
  ];


  return (
    <>
      <Portada titulo="Tu bienestar comienza aquí">
        <p className="mb-4">
          Atención nutricional personalizada, profesionales especializados y herramientas para acompañarte en cada etapa.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <EnlaceBoton to={accesoPrincipal.ruta} variante="claro">
            {accesoPrincipal.texto}
          </EnlaceBoton>
          <EnlaceBoton to="/servicios" variante="contornoClaro">
            Ver servicios
          </EnlaceBoton>
        </div>
      </Portada>

      <section className="seccion-interactiva-inicio mx-auto w-full max-w-[64rem] px-4 sm:px-6">
        <h2>¿Cómo podemos ayudarte?</h2>
        <p className="text-gray-600">Selecciona una opción para encontrar rápidamente lo que necesitas.</p>
        <div className="selector-inicio" role="group" aria-label="Opciones para comenzar">
          {OPCIONES.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={opcionActiva === opcion.id}
              onClick={() => setOpcionActiva(opcion.id)}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
        <div className="panel-seleccion-inicio" aria-live="polite">
          <h3>{seleccion.titulo}</h3>
          <p>{seleccion.descripcion}</p>
          <EnlaceBoton to={seleccion.ruta}>{seleccion.accion}</EnlaceBoton>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[64rem] px-4 py-8 sm:px-6">
        <h2 className="mb-4">Tu atención, paso a paso</h2>

        <ul className="beneficios-inicio grid gap-5 md:grid-cols-3">
          {BENEFICIOS.map((beneficio, indice) => (
            <li key={beneficio.titulo}>
              <Link to={rutasPasos[indice]} className="tarjeta-paso">
                <h3>{beneficio.titulo}</h3>
                <p>{beneficio.texto}</p>
                <span className="accion-paso">
                  Explorar
                  <span aria-hidden="true"> →</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

      </section>

      <section className="preguntas-inicio mx-auto w-full max-w-[64rem] px-4 sm:px-6">
        <h2 className="mb-4">Preguntas frecuentes</h2>
        <details>
          <summary>¿Cómo puedo solicitar una cita?</summary>
          <p>Revisa los servicios y el equipo profesional. Para enviar una solicitud de cita necesitas iniciar sesión como paciente.</p>
        </details>
        <details>
          <summary>¿Puedo ver los servicios antes de registrarme?</summary>
          <p>Sí. El catálogo y los perfiles públicos de los nutricionistas pueden consultarse sin iniciar sesión.</p>
        </details>
        <details>
          <summary>¿Dónde reviso mis citas y mi seguimiento?</summary>
          <p>Después de iniciar sesión como paciente, encontrarás las opciones Mis citas, Seguimiento y Mi plan en el menú.</p>
        </details>
      </section>
    </>
  );
}
