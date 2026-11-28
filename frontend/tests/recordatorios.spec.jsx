import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import AvisoRecordatorios, { INTERVALO_RECORDATORIOS_MS } from '../src/components/citas/AvisoRecordatorios.jsx';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { notificarCitasActualizadas } from '../src/utils/eventosCitas.js';
import { formatearFechaHora } from '../src/utils/formatos.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/agendaApi.js', () => ({
  agendaApi: { listarRecordatorios: vi.fn() },
}));

const RECORDATORIO = {
  citaId: 'c1', nombreServicio: 'Control nutricional', nombreNutricionista: 'Ana Ficticia',
  inicio: '2026-11-03T12:00:00Z', minutosRestantes: 600,
};

async function vaciarPromesas() {
  await act(async () => {});
}

describe('Aviso automático de recordatorios', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aparece solo al abrir la aplicación como paciente, sin acción manual', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValue([RECORDATORIO]);
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();

    expect(screen.getByRole('status', { name: 'Recordatorios de citas' })).toBeTruthy();
    expect(screen.getByText(`Tienes Control nutricional con Ana Ficticia el ${formatearFechaHora(RECORDATORIO.inicio)}.`)).toBeTruthy();
  });

  it('no consulta ni muestra recordatorios a visitantes, nutricionistas ni administradores', async () => {
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();
    expect(agendaApi.listarRecordatorios).not.toHaveBeenCalled();

    sessionStorage.clear();
    guardarSesionDePrueba('NUTRICIONISTA');
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();
    expect(agendaApi.listarRecordatorios).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('no muestra nada cuando no hay citas próximas', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValue([]);
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('se actualiza periódicamente durante la sesión', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValueOnce([]);
    agendaApi.listarRecordatorios.mockResolvedValueOnce([RECORDATORIO]);
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(INTERVALO_RECORDATORIOS_MS);
    });

    expect(agendaApi.listarRecordatorios).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Tienes Control nutricional/)).toBeTruthy();
  });

  it('se actualiza al cancelar o reprogramar una cita y desaparece el recordatorio', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValueOnce([RECORDATORIO]);
    agendaApi.listarRecordatorios.mockResolvedValueOnce([]);
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();
    expect(screen.getByText(/Tienes Control nutricional/)).toBeTruthy();

    await act(async () => {
      notificarCitasActualizadas();
    });

    expect(screen.queryByText(/Tienes Control nutricional/)).toBeNull();
  });

  it('se actualiza al recuperar el foco de la ventana', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValue([]);
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(agendaApi.listarRecordatorios).toHaveBeenCalledTimes(2);
  });

  it('un error de red no rompe la página ni deja recordatorios obsoletos', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValueOnce([RECORDATORIO]);
    agendaApi.listarRecordatorios.mockRejectedValueOnce(new Error('sin red'));
    renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();

    await act(async () => {
      notificarCitasActualizadas();
    });

    expect(screen.queryByText(/Tienes Control nutricional/)).toBeNull();
  });

  it('libera los temporizadores y escuchas al desmontarse', async () => {
    guardarSesionDePrueba('PACIENTE');
    agendaApi.listarRecordatorios.mockResolvedValue([]);
    const { unmount } = renderizarEn(<AvisoRecordatorios />);
    await vaciarPromesas();

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new Event('focus'));
    expect(agendaApi.listarRecordatorios).toHaveBeenCalledTimes(1);
  });
});
