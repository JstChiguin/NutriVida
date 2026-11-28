import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Agenda from '../src/paginas/Agenda.jsx';
import MisCitas from '../src/paginas/MisCitas.jsx';
import SolicitarCita from '../src/paginas/SolicitarCita.jsx';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { ErrorApi } from '../src/servicios/clienteApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/agendaApi.js', () => ({
  agendaApi: {
    listarCitas: vi.fn(), cancelarCita: vi.fn(), pagarCita: vi.fn(), reprogramarCita: vi.fn(), confirmarCita: vi.fn(),
    rechazarCita: vi.fn(), registrarAtencionRealizada: vi.fn(), registrarInasistencia: vi.fn(),
    consultarDisponibilidad: vi.fn(), solicitarCita: vi.fn(), listarRecordatorios: vi.fn(), listarPagosDeCita: vi.fn(),
  },
}));
vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: { listarServicios: vi.fn(), listarNutricionistas: vi.fn(), consultarNutricionista: vi.fn() },
}));

const PAGO_APROBADO = { id: 'pg1', citaId: 'c1', monto: 25000, estado: 'APROBADO_SIMULADO', metodo: 'TARJETA_SIMULADA', comprobante: { numero: 'NV-20261102-ABC123', emitidoEn: '2026-11-02T12:00:00Z', glosa: 'COMPROBANTE FICTICIO - PAGO SIMULADO SIN VALOR TRIBUTARIO' } };

const CITA = {
  id: 'c1', pacienteId: 'p1', nombrePaciente: 'Pedro Ficticio', nutricionistaId: 'n1', nombreNutricionista: 'Ana Ficticia',
  servicioId: 's1', nombreServicio: 'Control nutricional', duracionMinutos: 30, precioReferencial: 25000,
  inicio: '2026-11-03T12:00:00Z', fin: '2026-11-03T12:30:00Z', motivoConsulta: 'Control de peso', estado: 'SOLICITADA', pagada: false,
};

describe('Mis citas del paciente', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    agendaApi.listarRecordatorios.mockResolvedValue([]);
    guardarSesionDePrueba('PACIENTE');
  });

  it('lista las citas con su estado y precio', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    renderizarEn(<MisCitas />);

    expect(await screen.findByText('Control nutricional')).toBeTruthy();
    expect(screen.getByText('Solicitada')).toBeTruthy();
    expect(screen.getByText(/Ana Ficticia/)).toBeTruthy();
  });

  it('muestra un mensaje cuando el paciente no tiene citas', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [], totalPaginas: 0 });
    renderizarEn(<MisCitas />);

    expect(await screen.findByText('Aún no tienes citas. ¡Solicita la primera!')).toBeTruthy();
  });

  it('cancela una cita activa y recarga el listado', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    agendaApi.cancelarCita.mockResolvedValue({});
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar cita' }));

    expect(agendaApi.cancelarCita).toHaveBeenCalledWith('c1', 'Cancelada por el paciente');
    expect(await screen.findByText('Cita cancelada')).toBeTruthy();
    expect(agendaApi.listarCitas).toHaveBeenCalledTimes(2);
  });

  it('muestra el resumen antes de pagar y no invoca el pago hasta confirmar', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Pagar (simulado)' }));

    expect(screen.getByRole('heading', { name: 'Resumen y pago simulado' })).toBeTruthy();
    expect(screen.getByText(/no se usa dinero ni tarjetas reales/i)).toBeTruthy();
    expect(agendaApi.pagarCita).not.toHaveBeenCalled();
  });

  it('un pago aprobado muestra el comprobante y recarga el listado al cerrar', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    agendaApi.pagarCita.mockResolvedValue(PAGO_APROBADO);
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Pagar (simulado)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));

    expect(agendaApi.pagarCita).toHaveBeenCalledWith('c1', 'TARJETA_SIMULADA', false);
    expect(await screen.findByRole('heading', { name: 'Comprobante de pago simulado' })).toBeTruthy();
    expect(screen.getByText('NV-20261102-ABC123')).toBeTruthy();
    expect(screen.getByText(/COMPROBANTE FICTICIO/)).toBeTruthy();
    expect(agendaApi.listarCitas).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(agendaApi.listarCitas).toHaveBeenCalledTimes(2));
  });

  it('un pago rechazado informa el motivo, no muestra comprobante y permite reintentar', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    agendaApi.pagarCita.mockResolvedValueOnce({ id: 'pg0', estado: 'RECHAZADO_SIMULADO', comprobante: null });
    agendaApi.pagarCita.mockResolvedValueOnce(PAGO_APROBADO);
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Pagar (simulado)' }));
    await userEvent.click(screen.getByLabelText('Simular un pago rechazado (demostración)'));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));

    expect(agendaApi.pagarCita).toHaveBeenLastCalledWith('c1', 'TARJETA_SIMULADA', true);
    expect(await screen.findByText(/pago simulado fue rechazado/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Comprobante de pago simulado' })).toBeNull();

    await userEvent.click(screen.getByLabelText('Simular un pago rechazado (demostración)'));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar pago' }));

    expect(agendaApi.pagarCita).toHaveBeenLastCalledWith('c1', 'TARJETA_SIMULADA', false);
    expect(await screen.findByRole('heading', { name: 'Comprobante de pago simulado' })).toBeTruthy();
    expect(agendaApi.pagarCita).toHaveBeenCalledTimes(2);
  });

  it('muestra el conflicto del backend cuando la cita ya tiene un pago aprobado', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    agendaApi.pagarCita.mockRejectedValue(new ErrorApi(409, 'CONFLICTO_DE_NEGOCIO', 'La cita ya tiene un pago aprobado'));
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Pagar (simulado)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pago simulado' }));

    expect(await screen.findByText('La cita ya tiene un pago aprobado')).toBeTruthy();
  });

  it('una cita pagada permite consultar su comprobante', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [{ ...CITA, estado: 'CONFIRMADA', pagada: true }], totalPaginas: 1 });
    agendaApi.listarPagosDeCita.mockResolvedValue([PAGO_APROBADO]);
    renderizarEn(<MisCitas />);

    expect(screen.queryByRole('button', { name: 'Pagar (simulado)' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Ver comprobante' }));

    expect(await screen.findByText('NV-20261102-ABC123')).toBeTruthy();
    expect(agendaApi.listarPagosDeCita).toHaveBeenCalledWith('c1');
  });

  it('muestra los recordatorios de citas próximas confirmadas', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [], totalPaginas: 1 });
    agendaApi.listarRecordatorios.mockResolvedValue([
      { citaId: 'c1', nombreServicio: 'Control nutricional', nombreNutricionista: 'Ana Ficticia', inicio: '2026-11-03T12:00:00Z', minutosRestantes: 1200 },
    ]);
    renderizarEn(<MisCitas />);

    expect(await screen.findByRole('heading', { name: 'Recordatorios' })).toBeTruthy();
    expect(screen.getByText(/Tienes Control nutricional con Ana Ficticia/)).toBeTruthy();
  });

  it('muestra el error del backend cuando una acción es rechazada', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA], totalPaginas: 1 });
    agendaApi.cancelarCita.mockRejectedValue(new ErrorApi(409, 'CONFLICTO_DE_NEGOCIO', 'Solo es posible cancelar con al menos 2 horas de anticipación'));
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar cita' }));

    expect(await screen.findByText(/al menos 2 horas de anticipación/)).toBeTruthy();
  });

  it('no ofrece acciones sobre citas ya finalizadas', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [{ ...CITA, estado: 'REALIZADA' }], totalPaginas: 1 });
    renderizarEn(<MisCitas />);

    expect(await screen.findByText('Realizada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).toBeNull();
  });
});

describe('Solicitud de cita', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.listarServicios.mockResolvedValue({
      contenido: [{ id: 's1', nombre: 'Control nutricional', duracionMinutos: 30, precioReferencial: 25000 }],
    });
    clinicoApi.listarNutricionistas.mockResolvedValue({ contenido: [{ id: 'n1', nombreCompleto: 'Ana Ficticia' }] });
    clinicoApi.consultarNutricionista.mockResolvedValue({ id: 'n1', nombreCompleto: 'Ana Ficticia', activo: true });
    agendaApi.consultarDisponibilidad.mockResolvedValue([
      { fecha: '2026-11-03', horarios: [{ inicio: '2026-11-03T12:00:00Z', fin: '2026-11-03T12:30:00Z' }] },
    ]);
  });

  it('guía el flujo servicio, profesional, horario y motivo hasta enviar la solicitud', async () => {
    agendaApi.solicitarCita.mockResolvedValue({ id: 'c9' });
    renderizarEn(
      <Routes>
        <Route path="/mis-citas/nueva" element={<SolicitarCita />} />
        <Route path="/mis-citas" element={<p>Listado de mis citas</p>} />
      </Routes>,
      '/mis-citas/nueva',
    );

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's1');
    await userEvent.selectOptions(await screen.findByLabelText('Nutricionista'), 'n1');
    const horarios = await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(within(horarios).getAllByRole('button')[0]);
    await userEvent.type(screen.getByLabelText('Motivo'), 'Control de peso mensual');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('Listado de mis citas')).toBeTruthy();
    expect(agendaApi.solicitarCita).toHaveBeenCalledWith({
      nutricionistaId: 'n1', servicioId: 's1', inicio: '2026-11-03T12:00:00Z', motivoConsulta: 'Control de peso mensual',
    });
  });

  it('exige un motivo antes de enviar y muestra el resumen seleccionado', async () => {
    renderizarEn(<SolicitarCita />, '/mis-citas/nueva?servicioId=s1&nutricionistaId=n1');

    const horarios = await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(within(horarios).getAllByRole('button')[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(screen.getByText(/Describe brevemente el motivo/)).toBeTruthy();
    expect(screen.getByText('Nutricionista: Ana Ficticia')).toBeTruthy();
    expect(agendaApi.solicitarCita).not.toHaveBeenCalled();
  });

  it('muestra el conflicto cuando el horario fue tomado por otra persona', async () => {
    agendaApi.solicitarCita.mockRejectedValue(new ErrorApi(409, 'CONFLICTO_DE_NEGOCIO', 'El horario seleccionado ya no está disponible'));
    renderizarEn(<SolicitarCita />, '/mis-citas/nueva?servicioId=s1&nutricionistaId=n1');

    const horarios = await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(within(horarios).getAllByRole('button')[0]);
    await userEvent.type(screen.getByLabelText('Motivo'), 'Control mensual');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('El horario seleccionado ya no está disponible')).toBeTruthy();
  });
});

describe('Agenda del nutricionista', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('NUTRICIONISTA');
  });

  it('confirma una cita solicitada', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA] });
    agendaApi.confirmarCita.mockResolvedValue({});
    renderizarEn(<Agenda />);

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    expect(agendaApi.confirmarCita).toHaveBeenCalledWith('c1');
    expect(await screen.findByText('Cita confirmada')).toBeTruthy();
  });

  it('exige un motivo para rechazar una cita', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [CITA] });
    agendaApi.rechazarCita.mockResolvedValue({});
    renderizarEn(<Agenda />);

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    expect(screen.getByRole('button', { name: 'Confirmar rechazo' }).disabled).toBe(true);
    await userEvent.type(screen.getByLabelText('Motivo del rechazo'), 'Agenda completa');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));

    expect(agendaApi.rechazarCita).toHaveBeenCalledWith('c1', 'Agenda completa');
  });

  it('reprograma una cita desde el perfil profesional con nueva fecha y motivo', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [{ ...CITA, estado: 'CONFIRMADA' }] });
    agendaApi.reprogramarCita.mockResolvedValue({});
    renderizarEn(<Agenda />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reprogramar' }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar reprogramación' });
    expect(confirmar.disabled).toBe(true);
    await userEvent.type(screen.getByLabelText('Nueva fecha y hora'), '2026-11-10T10:30');
    await userEvent.type(screen.getByLabelText('Motivo de la reprogramación'), 'Cambio de turno');
    await userEvent.click(confirmar);

    expect(agendaApi.reprogramarCita).toHaveBeenCalledWith('c1', new Date('2026-11-10T10:30').toISOString(), 'Cambio de turno');
    expect(await screen.findByText('Cita reprogramada')).toBeTruthy();
  });

  it('no ofrece reprogramar una cita ya cancelada', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [{ ...CITA, estado: 'CANCELADA' }] });
    renderizarEn(<Agenda />);

    await screen.findByText('Pedro Ficticio');

    expect(screen.queryByRole('button', { name: 'Reprogramar' })).toBeNull();
  });

  it('registra la atención realizada de una cita confirmada', async () => {
    agendaApi.listarCitas.mockResolvedValue({ contenido: [{ ...CITA, estado: 'CONFIRMADA' }] });
    agendaApi.registrarAtencionRealizada.mockResolvedValue({});
    renderizarEn(<Agenda />);

    await userEvent.click(await screen.findByRole('button', { name: 'Atención realizada' }));

    expect(agendaApi.registrarAtencionRealizada).toHaveBeenCalledWith('c1');
    expect((await screen.findByRole('link', { name: 'Ver ficha clínica' })).getAttribute('href')).toBe('/pacientes/p1/ficha-clinica');
  });
});
