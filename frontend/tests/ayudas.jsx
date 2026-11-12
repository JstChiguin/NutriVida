import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorAutenticacion } from '../src/contexto/ProveedorAutenticacion.jsx';

export function guardarSesionDePrueba(rol = 'PACIENTE', nombreCompleto = 'Ana Prueba Demo') {
  sessionStorage.setItem('nutrivida.sesion', JSON.stringify({
    token: 'token-de-prueba',
    usuario: { id: 'usuario-1', correo: 'ana@nutrivida.test', nombreCompleto, rol, activo: true },
  }));
}

export function renderizarEn(interfaz, ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorAutenticacion>{interfaz}</ProveedorAutenticacion>
    </MemoryRouter>,
  );
}
