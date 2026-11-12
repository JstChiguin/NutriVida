import { Route, Routes } from 'react-router-dom';
import MarcoAplicacion from './components/layout/MarcoAplicacion.jsx';
import RutaProtegida from './rutas/RutaProtegida.jsx';
import Inicio from './components/paginas/Inicio.jsx';
import Servicios from './components/paginas/Servicios.jsx';
import Nutricionistas from './components/paginas/Nutricionistas.jsx';
import Contacto from './components/paginas/Contacto.jsx';
import IniciarSesion from './paginas/IniciarSesion.jsx';
import Registro from './paginas/Registro.jsx';
import Perfil from './paginas/Perfil.jsx';
import MisCitas from './paginas/MisCitas.jsx';
import SolicitarCita from './paginas/SolicitarCita.jsx';
import Agenda from './paginas/Agenda.jsx';
import PacientesAtendidos from './paginas/PacientesAtendidos.jsx';
import FichaClinica from './paginas/FichaClinica.jsx';
import Seguimiento from './paginas/Seguimiento.jsx';
import PlanesAlimentarios from './paginas/PlanesAlimentarios.jsx';
import Administracion from './paginas/Administracion.jsx';
import Reportes from './paginas/Reportes.jsx';
import { NoEncontrada, SinPermiso } from './paginas/PaginasDeError.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<MarcoAplicacion />}>
        <Route index element={<Inicio />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="nutricionistas" element={<Nutricionistas />} />
        <Route path="contacto" element={<Contacto />} />
        <Route path="iniciar-sesion" element={<IniciarSesion />} />
        <Route path="registro" element={<Registro />} />
        <Route path="sin-permiso" element={<SinPermiso />} />

        <Route element={<RutaProtegida />}>
          <Route path="perfil" element={<Perfil />} />
        </Route>

        <Route element={<RutaProtegida roles={['PACIENTE']} />}>
          <Route path="mis-citas" element={<MisCitas />} />
          <Route path="mis-citas/nueva" element={<SolicitarCita />} />
          <Route path="ficha-clinica" element={<FichaClinica />} />
          <Route path="seguimiento" element={<Seguimiento />} />
          <Route path="planes-alimentarios" element={<PlanesAlimentarios />} />
        </Route>

        <Route element={<RutaProtegida roles={['NUTRICIONISTA']} />}>
          <Route path="agenda" element={<Agenda />} />
          <Route path="pacientes" element={<PacientesAtendidos />} />
          <Route path="pacientes/:pacienteId/ficha-clinica" element={<FichaClinica />} />
          <Route path="pacientes/:pacienteId/seguimiento" element={<Seguimiento />} />
          <Route path="pacientes/:pacienteId/planes-alimentarios" element={<PlanesAlimentarios />} />
        </Route>

        <Route element={<RutaProtegida roles={['ADMINISTRADOR']} />}>
          <Route path="administracion" element={<Administracion />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
