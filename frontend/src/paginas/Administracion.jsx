import { useState } from 'react';
import Contenedor from '../components/layout/Contenedor.jsx';
import AsignacionNutricionistas from './administracion/AsignacionNutricionistas.jsx';
import Auditoria from './administracion/Auditoria.jsx';
import GestionNutricionistas from './administracion/GestionNutricionistas.jsx';
import GestionPagos from './administracion/GestionPagos.jsx';
import GestionServicios from './administracion/GestionServicios.jsx';
import GestionSolicitudes from './administracion/GestionSolicitudes.jsx';
import GestionUsuarios from './administracion/GestionUsuarios.jsx';

const SECCIONES = [
  { clave: 'usuarios', etiqueta: 'Usuarios', componente: GestionUsuarios },
  { clave: 'nutricionistas', etiqueta: 'Nutricionistas', componente: GestionNutricionistas },
  { clave: 'asignaciones', etiqueta: 'Asignaciones', componente: AsignacionNutricionistas },
  { clave: 'servicios', etiqueta: 'Servicios', componente: GestionServicios },
  { clave: 'pagos', etiqueta: 'Pagos simulados', componente: GestionPagos },
  { clave: 'solicitudes', etiqueta: 'Solicitudes de contacto', componente: GestionSolicitudes },
  { clave: 'auditoria', etiqueta: 'Auditoría', componente: Auditoria },
];

export default function Administracion() {
  const [seccionActiva, setSeccionActiva] = useState('usuarios');
  const Seccion = SECCIONES.find((seccion) => seccion.clave === seccionActiva).componente;

  return (
    <Contenedor titulo="Administración" descripcion="Gestión de cuentas, profesionales, prestaciones y solicitudes.">
      <div role="tablist" className="mb-5 flex flex-wrap gap-2">
        {SECCIONES.map((seccion) => (
          <button key={seccion.clave} type="button" role="tab" aria-selected={seccionActiva === seccion.clave}
            onClick={() => setSeccionActiva(seccion.clave)}
            className={`rounded-lg px-4 py-2 font-semibold ${seccionActiva === seccion.clave ? 'bg-exito text-white' : 'bg-white text-exito'}`}>
            {seccion.etiqueta}
          </button>
        ))}
      </div>
      <Seccion />
    </Contenedor>
  );
}
