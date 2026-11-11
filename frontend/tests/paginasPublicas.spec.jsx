import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Nutricionistas from '../src/components/paginas/Nutricionistas.jsx';
import Servicios from '../src/components/paginas/Servicios.jsx';
import Inicio from '../src/components/paginas/Inicio.jsx';
import { ErrorApi } from '../src/servicios/clienteApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: { listarServicios: vi.fn(), listarNutricionistas: vi.fn() },
}));

const SERVICIOS = {
  contenido: [
    { id: 's1', nombre: 'Control nutricional', descripcion: 'Seguimiento de avances', categoria: 'Control', duracionMinutos: 30, precioReferencial: 25000 },
    { id: 's2', nombre: 'Nutrición deportiva', descripcion: 'Rendimiento y composición corporal', categoria: 'Deportiva', duracionMinutos: 45, precioReferencial: 40000 },
  ],
};

describe('Página de servicios', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('muestra el catálogo entregado por la API', async () => {
    clinicoApi.listarServicios.mockResolvedValue(SERVICIOS);
    renderizarEn(<Servicios />);

    expect(await screen.findByText('Control nutricional')).toBeTruthy();
    expect(screen.getByText('Nutrición deportiva')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Reservar' })).toHaveLength(2);
  });

  it('filtra por texto y por categoría', async () => {
    clinicoApi.listarServicios.mockResolvedValue(SERVICIOS);
    renderizarEn(<Servicios />);
    await screen.findByText('Control nutricional');

    await userEvent.type(screen.getByLabelText('Buscar servicio'), 'rendimiento');
    expect(screen.queryByText('Control nutricional')).toBeNull();
    expect(screen.getByText('Nutrición deportiva')).toBeTruthy();

    await userEvent.clear(screen.getByLabelText('Buscar servicio'));
    await userEvent.click(screen.getByRole('button', { name: 'Control' }));
    expect(screen.queryByText('Nutrición deportiva')).toBeNull();
  });

  it('informa cuando ninguna prestación coincide con la búsqueda', async () => {
    clinicoApi.listarServicios.mockResolvedValue(SERVICIOS);
    renderizarEn(<Servicios />);
    await screen.findByText('Control nutricional');

    await userEvent.type(screen.getByLabelText('Buscar servicio'), 'inexistente');

    expect(screen.getByText('No se encontraron servicios que coincidan con la búsqueda.')).toBeTruthy();
  });

  it('muestra contenido referencial sin reservas cuando no hay conexión', async () => {
    clinicoApi.listarServicios.mockRejectedValue(new ErrorApi(0, 'SIN_CONEXION', 'No fue posible comunicarse'));
    renderizarEn(<Servicios />);

    expect(await screen.findByText('Control de peso')).toBeTruthy();
    expect(screen.getByText(/Sin conexión con el servidor/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Reservar' })).toBeNull();
  });

  it('muestra el error y permite reintentar ante un fallo del servidor', async () => {
    clinicoApi.listarServicios.mockRejectedValueOnce(new ErrorApi(500, 'ERROR_INTERNO', 'Ocurrió un error interno'));
    clinicoApi.listarServicios.mockResolvedValueOnce(SERVICIOS);
    renderizarEn(<Servicios />);

    expect(await screen.findByText('Ocurrió un error interno')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Control nutricional')).toBeTruthy();
  });
});

describe('Página de nutricionistas', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('muestra los profesionales con su especialidad y un acceso para reservar', async () => {
    clinicoApi.listarNutricionistas.mockResolvedValue({
      contenido: [{ id: 'n1', nombreCompleto: 'Ana Ficticia', especialidades: ['Nutrición clínica'], fotoUrl: null }],
    });
    renderizarEn(<Nutricionistas />);

    expect(await screen.findByText('Ana Ficticia')).toBeTruthy();
    expect(screen.getByText('Nutrición clínica')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Reservar' }).getAttribute('href')).toBe('/mis-citas/nueva?nutricionistaId=n1');
  });

  it('usa el equipo referencial cuando no hay conexión', async () => {
    clinicoApi.listarNutricionistas.mockRejectedValue(new ErrorApi(0, 'SIN_CONEXION', 'No fue posible comunicarse'));
    renderizarEn(<Nutricionistas />);

    expect(await screen.findByText('Carolina Fuentes M.')).toBeTruthy();
    expect(screen.getByAltText('Nutricionista Felipe Araya R.')).toBeTruthy();
  });
});

describe('Página de inicio', () => {
  beforeEach(() => sessionStorage.clear());

  it('invita a crear una cuenta a los visitantes', () => {
    renderizarEn(<Inicio />);

    expect(screen.getByRole('heading', { name: 'Tu bienestar comienza aquí' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Crear mi cuenta' })).toBeTruthy();
  });

  it('ofrece reservar una cita a los usuarios autenticados', () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(<Inicio />);

    expect(screen.getByRole('link', { name: 'Reservar una cita' })).toBeTruthy();
  });
});
