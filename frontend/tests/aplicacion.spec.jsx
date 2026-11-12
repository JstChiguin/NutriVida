import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../src/App.jsx';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: {
    listarServicios: vi.fn().mockResolvedValue({ contenido: [] }),
    listarNutricionistas: vi.fn().mockResolvedValue({ contenido: [] }),
    enviarSolicitudContacto: vi.fn(),
  },
}));

describe('Navegación de la aplicación con React Router', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    clinicoApi.listarServicios.mockResolvedValue({ contenido: [] });
    clinicoApi.listarNutricionistas.mockResolvedValue({ contenido: [] });
  });

  it('muestra la portada en la ruta raíz', () => {
    renderizarEn(<App />, '/');

    expect(screen.getByRole('heading', { name: 'Tu bienestar comienza aquí' })).toBeTruthy();
  });

  it('muestra la página de servicios en su ruta', async () => {
    renderizarEn(<App />, '/servicios');

    expect(await screen.findByRole('heading', { name: 'Nuestros servicios' })).toBeTruthy();
  });

  it('muestra el formulario de contacto en su ruta', () => {
    renderizarEn(<App />, '/contacto');

    expect(screen.getByRole('heading', { name: 'Formulario de Consulta' })).toBeTruthy();
  });

  it('redirige un recurso privado al inicio de sesión cuando no hay sesión', () => {
    renderizarEn(<App />, '/mis-citas');

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  it('impide a un paciente entrar al panel de administración', () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(<App />, '/administracion');

    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy();
  });

  it('impide a un nutricionista entrar a los reportes administrativos', () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    renderizarEn(<App />, '/reportes');

    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy();
  });

  it('muestra una página de error para rutas inexistentes', () => {
    renderizarEn(<App />, '/ruta-que-no-existe');

    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeTruthy();
  });
});
