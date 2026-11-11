import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Administracion from '../src/paginas/Administracion.jsx';
import Reportes from '../src/paginas/Reportes.jsx';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { autenticacionApi } from '../src/servicios/autenticacionApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/autenticacionApi.js', () => ({
  autenticacionApi: { listarUsuarios: vi.fn(), crearUsuario: vi.fn(), cambiarEstadoUsuario: vi.fn(), cambiarRolUsuario: vi.fn(), actualizarUsuario: vi.fn() },
}));
vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: {
    listarServicios: vi.fn(), listarNutricionistas: vi.fn(), listarSolicitudesContacto: vi.fn(), listarAuditorias: vi.fn(),
    cambiarEstadoSolicitudContacto: vi.fn(), resumirPacientes: vi.fn(), crearServicio: vi.fn(), listarPacientes: vi.fn(), autorizarNutricionista: vi.fn(),
    retirarNutricionista: vi.fn(),
  },
}));
vi.mock('../src/servicios/agendaApi.js', () => ({
  agendaApi: {
    contarCitasPorEstado: vi.fn(), listarServiciosMasSolicitados: vi.fn(), resumirActividadPorDia: vi.fn(),
    resumirAtencionesPorNutricionista: vi.fn(), contarEventosDeCitas: vi.fn(), contarPacientesAtendidos: vi.fn(), listarPagos: vi.fn(), anularPago: vi.fn(),
  },
}));

const USUARIOS = {
  contenido: [
    { id: 'usuario-1', nombreCompleto: 'Ana Prueba Demo', correo: 'ana@nutrivida.test', rol: 'ADMINISTRADOR', activo: true },
    { id: 'u2', nombreCompleto: 'Luis Prueba Demo', correo: 'luis@nutrivida.test', rol: 'PACIENTE', activo: true },
  ],
  totalPaginas: 1,
};

describe('Administración', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('ADMINISTRADOR');
    autenticacionApi.listarUsuarios.mockResolvedValue(USUARIOS);
  });

  it('lista usuarios y desactiva una cuenta ajena', async () => {
    autenticacionApi.cambiarEstadoUsuario.mockResolvedValue({});
    renderizarEn(<Administracion />);

    expect(await screen.findByText('Luis Prueba Demo')).toBeTruthy();
    await userEvent.click(screen.getAllByRole('button', { name: 'Desactivar' })[1]);

    expect(autenticacionApi.cambiarEstadoUsuario).toHaveBeenCalledWith('u2', false);
  });

  it('impide que el administrador desactive su propia cuenta', async () => {
    renderizarEn(<Administracion />);
    await screen.findByText('Luis Prueba Demo');

    expect(screen.getAllByRole('button', { name: 'Desactivar' })[0].disabled).toBe(true);
    expect(screen.getByLabelText('Rol de Ana Prueba Demo').disabled).toBe(true);
  });

  it('cambia el rol de otro usuario', async () => {
    autenticacionApi.cambiarRolUsuario.mockResolvedValue({});
    renderizarEn(<Administracion />);

    await userEvent.selectOptions(await screen.findByLabelText('Rol de Luis Prueba Demo'), 'NUTRICIONISTA');

    expect(autenticacionApi.cambiarRolUsuario).toHaveBeenCalledWith('u2', 'NUTRICIONISTA');
  });

  it('valida el formulario antes de crear un usuario', async () => {
    renderizarEn(<Administracion />);
    await screen.findByText('Luis Prueba Demo');

    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(autenticacionApi.crearUsuario).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent.includes('obligatori'))).toBe(true);
  });

  it('cambia de sección y muestra las solicitudes de contacto', async () => {
    clinicoApi.listarSolicitudesContacto.mockResolvedValue({
      contenido: [{ id: 'sc1', nombre: 'Visitante Demo', correo: 'v@nutrivida.test', mensaje: 'Consulta por planes', estado: 'PENDIENTE', creadoEn: '2026-10-01T12:00:00Z' }],
      totalPaginas: 1,
    });
    clinicoApi.cambiarEstadoSolicitudContacto.mockResolvedValue({});
    renderizarEn(<Administracion />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solicitudes de contacto' }));
    await userEvent.selectOptions(await screen.findByLabelText('Estado de la solicitud de Visitante Demo'), 'RESUELTA');

    expect(clinicoApi.cambiarEstadoSolicitudContacto).toHaveBeenCalledWith('sc1', 'RESUELTA');
  });

  it('muestra la bitácora de auditoría', async () => {
    clinicoApi.listarAuditorias.mockResolvedValue({
      contenido: [{ id: 'a1', fecha: '2026-10-01T12:00:00Z', servicioOrigen: 'servicio-agenda', entidad: 'citas', operacion: 'CANCELAR_CITA', rol: 'PACIENTE' }],
      totalPaginas: 1,
    });
    renderizarEn(<Administracion />);

    await userEvent.click(screen.getByRole('tab', { name: 'Auditoría' }));

    expect(await screen.findByText('CANCELAR_CITA')).toBeTruthy();
  });
});

describe('Reportes', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('ADMINISTRADOR');
    agendaApi.contarCitasPorEstado.mockResolvedValue([{ estado: 'CONFIRMADA', cantidad: 5 }, { estado: 'CANCELADA', cantidad: 1 }]);
    agendaApi.listarServiciosMasSolicitados.mockResolvedValue([{ servicioId: 's1', nombreServicio: 'Control nutricional', solicitudes: 4 }]);
    agendaApi.resumirActividadPorDia.mockResolvedValue([{ fecha: '2026-11-03', citas: 3 }, { fecha: '2026-11-04', citas: 2 }]);
    agendaApi.resumirAtencionesPorNutricionista.mockResolvedValue([
      { nutricionistaId: 'n1', nombreNutricionista: 'Ana Ficticia', total: 6, realizadas: 4, inasistencias: 1, canceladas: 1 },
    ]);
    agendaApi.contarEventosDeCitas.mockResolvedValue([{ evento: 'SOLICITUD', cantidad: 6 }]);
    agendaApi.contarPacientesAtendidos.mockResolvedValue({ pacientes: 3, atenciones: 4 });
    clinicoApi.resumirPacientes.mockResolvedValue({ totalRegistrados: 8, activos: 7, inactivos: 1, registradosPorMes: [] });
  });

  it('presenta indicadores, gráficos y la tabla de atenciones por profesional', async () => {
    renderizarEn(<Reportes />);

    expect(await screen.findByText('Pacientes registrados')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByLabelText('Citas por estado')).toBeTruthy();
    expect(screen.getByText('Control nutricional')).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Ana Ficticia' })).toBeTruthy();
  });

  it('vuelve a consultar con el rango de fechas elegido', async () => {
    renderizarEn(<Reportes />);
    await screen.findByText('Pacientes registrados');

    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-01');

    const ultimaLlamada = agendaApi.contarCitasPorEstado.mock.calls.at(-1)[0];
    expect(ultimaLlamada.desde).toBeTruthy();
  });
});

describe('Administración: edición, asignaciones y pagos', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('ADMINISTRADOR');
    autenticacionApi.listarUsuarios.mockResolvedValue(USUARIOS);
  });

  it('edita el nombre y el correo de un usuario', async () => {
    autenticacionApi.actualizarUsuario.mockResolvedValue({});
    renderizarEn(<Administracion />);

    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[1]);
    const formulario = screen.getByRole('form', { name: 'Editar a Luis Prueba Demo' });
    const nombre = within(formulario).getByLabelText('Nombre completo');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Luis Editado Demo');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar cambios' }));

    expect(autenticacionApi.actualizarUsuario).toHaveBeenCalledWith('u2', { nombreCompleto: 'Luis Editado Demo', correo: 'luis@nutrivida.test' });
    expect(await screen.findByText('Usuario actualizado')).toBeTruthy();
  });

  it('no envía la edición de un usuario con correo inválido', async () => {
    renderizarEn(<Administracion />);

    await userEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[1]);
    const correo = within(screen.getByRole('form', { name: 'Editar a Luis Prueba Demo' })).getByLabelText('Correo');
    await userEvent.clear(correo);
    await userEvent.type(correo, 'sin-arroba');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(autenticacionApi.actualizarUsuario).not.toHaveBeenCalled();
  });

  it('asigna y retira nutricionistas de un paciente', async () => {
    clinicoApi.listarPacientes.mockResolvedValue({
      contenido: [{ id: 'p1', nombreCompleto: 'Pedro Ficticio', correo: 'pedro@nutrivida.test', nutricionistasAutorizados: ['n1'] }],
      totalPaginas: 1,
    });
    clinicoApi.listarNutricionistas.mockResolvedValue({
      contenido: [{ id: 'n1', nombreCompleto: 'Ana Ficticia' }, { id: 'n2', nombreCompleto: 'Bruno Ficticio' }],
      totalPaginas: 1,
    });
    clinicoApi.autorizarNutricionista.mockResolvedValue({});
    clinicoApi.retirarNutricionista.mockResolvedValue({});
    renderizarEn(<Administracion />);

    await userEvent.click(screen.getByRole('tab', { name: 'Asignaciones' }));
    await userEvent.selectOptions(await screen.findByLabelText('Asignar nutricionista'), 'n2');
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));
    expect(clinicoApi.autorizarNutricionista).toHaveBeenCalledWith('p1', 'n2');

    await userEvent.click(await screen.findByRole('button', { name: 'Retirar a Ana Ficticia de Pedro Ficticio' }));
    expect(clinicoApi.retirarNutricionista).toHaveBeenCalledWith('p1', 'n1');
  });

  it('lista pagos simulados y anula solo los aprobados', async () => {
    agendaApi.listarPagos.mockResolvedValue({
      contenido: [
        { id: 'g1', creadoEn: '2026-11-03T12:00:00Z', monto: 25000, estado: 'APROBADO_SIMULADO', comprobante: { numero: 'SIM-001' } },
        { id: 'g2', creadoEn: '2026-11-03T13:00:00Z', monto: 18000, estado: 'ANULADO', comprobante: { numero: 'SIM-002' } },
      ],
      totalPaginas: 1,
    });
    agendaApi.anularPago.mockResolvedValue({});
    renderizarEn(<Administracion />);

    await userEvent.click(screen.getByRole('tab', { name: 'Pagos simulados' }));
    expect(await screen.findByText('SIM-002')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Anular pago/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Anular pago SIM-001' }));

    expect(agendaApi.anularPago).toHaveBeenCalledWith('g1');
    expect(await screen.findByText('Pago simulado anulado')).toBeTruthy();
  });
});
