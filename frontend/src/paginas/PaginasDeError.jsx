import { EnlaceBoton } from '../components/ui/Boton.jsx';
import Contenedor from '../components/layout/Contenedor.jsx';

export function NoEncontrada() {
  return (
    <Contenedor titulo="Página no encontrada" descripcion="La dirección que buscas no existe o fue movida.">
      <EnlaceBoton to="/">Volver al inicio</EnlaceBoton>
    </Contenedor>
  );
}

export function SinPermiso() {
  return (
    <Contenedor titulo="Acceso restringido" descripcion="Tu rol no tiene autorización para ver esta sección.">
      <EnlaceBoton to="/">Volver al inicio</EnlaceBoton>
    </Contenedor>
  );
}
