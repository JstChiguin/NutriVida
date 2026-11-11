import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import RutaProtegida from '../src/rutas/RutaProtegida.jsx';
import { useAutenticacion } from '../src/hooks/useAutenticacion.js';
import { autenticacionApi } from '../src/servicios/autenticacionApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/autenticacionApi.js', () => ({
  autenticacionApi: { iniciarSesion: vi.fn(), cerrarSesion: vi.fn(), registrarPaciente: vi.fn() },
}));

function PanelDeSesion() {
  const { usuario, autenticado, iniciarSesion, cerrarSesion } = useAutenticacion();
  return (
    <div>
      <p>{autenticado ? `Sesión de ${usuario.nombreCompleto}` : 'Sin sesión'}</p>
      <button type="button" onClick={() => iniciarSesion('ana@nutrivida.test', 'Clave1234')}>Entrar</button>
      <button type="button" onClick={cerrarSesion}>Salir</button>
    </div>
  );
}

function RutasDePrueba() {
  return (
    <Routes>
      <Route path="/iniciar-sesion" element={<p>Pantalla de inicio de sesión</p>} />
      <Route path="/sin-permiso" element={<p>Pantalla sin permiso</p>} />
      <Route element={<RutaProtegida />}>
        <Route path="/perfil" element={<p>Contenido privado</p>} />
      </Route>
      <Route element={<RutaProtegida roles={['ADMINISTRADOR']} />}>
        <Route path="/administracion" element={<p>Panel de administración</p>} />
      </Route>
    </Routes>
  );
}

describe('Contexto de autenticación', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('inicia sesión, conserva el usuario y lo persiste en la sesión del navegador', async () => {
    autenticacionApi.iniciarSesion.mockResolvedValue({
      token: 'jwt-falso', usuario: { id: '1', nombreCompleto: 'Ana Prueba Demo', rol: 'PACIENTE' },
    });
    renderizarEn(<PanelDeSesion />);

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Sesión de Ana Prueba Demo')).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nutrivida.sesion')).token).toBe('jwt-falso');
  });

  it('cierra la sesión localmente aunque el servidor falle', async () => {
    guardarSesionDePrueba();
    autenticacionApi.cerrarSesion.mockRejectedValue(new Error('sin conexión'));
    renderizarEn(<PanelDeSesion />);
    expect(screen.getByText('Sesión de Ana Prueba Demo')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));

    expect(await screen.findByText('Sin sesión')).toBeTruthy();
    expect(sessionStorage.getItem('nutrivida.sesion')).toBeNull();
  });

  it('recupera la sesión guardada al recargar la página', () => {
    guardarSesionDePrueba('NUTRICIONISTA', 'Bruno Prueba Demo');
    renderizarEn(<PanelDeSesion />);

    expect(screen.getByText('Sesión de Bruno Prueba Demo')).toBeTruthy();
  });

  it('exige usar el hook dentro del proveedor', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAutenticacion())).toThrow('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
    consola.mockRestore();
  });
});

describe('Rutas protegidas', () => {
  beforeEach(() => sessionStorage.clear());

  it('redirige a inicio de sesión cuando no hay sesión', () => {
    renderizarEn(<RutasDePrueba />, '/perfil');

    expect(screen.getByText('Pantalla de inicio de sesión')).toBeTruthy();
  });

  it('permite el acceso a un usuario autenticado', () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(<RutasDePrueba />, '/perfil');

    expect(screen.getByText('Contenido privado')).toBeTruthy();
  });

  it('bloquea una ruta cuando el rol no está autorizado', () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(<RutasDePrueba />, '/administracion');

    expect(screen.getByText('Pantalla sin permiso')).toBeTruthy();
  });

  it('permite una ruta restringida al rol correcto', () => {
    guardarSesionDePrueba('ADMINISTRADOR');
    renderizarEn(<RutasDePrueba />, '/administracion');

    expect(screen.getByText('Panel de administración')).toBeTruthy();
  });
});
