import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import FichaClinica from '../src/paginas/FichaClinica.jsx';
import PlanesAlimentarios from '../src/paginas/PlanesAlimentarios.jsx';
import Seguimiento from '../src/paginas/Seguimiento.jsx';
import { ErrorApi } from '../src/servicios/clienteApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: {
    consultarMiPerfilPaciente: vi.fn(), consultarPaciente: vi.fn(), consultarFicha: vi.fn(), abrirFicha: vi.fn(),
    registrarEvolucion: vi.fn(), corregirEvolucion: vi.fn(), consultarEvolucionMediciones: vi.fn(),
    registrarMedicion: vi.fn(), consultarPlanVigente: vi.fn(), listarVersionesPlan: vi.fn(), crearPlan: vi.fn(),
    actualizarPlan: vi.fn(), actualizarFicha: vi.fn(), listarMediciones: vi.fn(), anularMedicion: vi.fn(),
  },
}));

const PACIENTE = { id: 'p1', nombreCompleto: 'Pedro Ficticio' };
const FICHA = {
  id: 'f1', pacienteId: 'p1', motivoConsulta: 'Control de peso', alergias: ['Maní'], intolerancias: [],
  habitosAlimentarios: 'Almuerza fuera', objetivosNutricionales: ['Reducir 5 kg'], estado: 'ABIERTA', correcciones: [], antecedentes: null, actividadFisica: null,
  evoluciones: [{ identificador: 'e1', fecha: '2026-10-01T12:00:00Z', descripcion: 'Primera evaluación', corregida: false }],
};

function rutaDePaciente(elemento) {
  return (
    <Routes>
      <Route path="/pacientes/:pacienteId/ficha-clinica" element={elemento} />
      <Route path="/pacientes/:pacienteId/seguimiento" element={elemento} />
      <Route path="/pacientes/:pacienteId/planes-alimentarios" element={elemento} />
      <Route path="/ficha-clinica" element={elemento} />
      <Route path="/seguimiento" element={elemento} />
      <Route path="/planes-alimentarios" element={elemento} />
    </Routes>
  );
}

describe('Ficha clínica', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    clinicoApi.consultarPaciente.mockResolvedValue(PACIENTE);
    clinicoApi.consultarMiPerfilPaciente.mockResolvedValue(PACIENTE);
  });

  it('muestra a un nutricionista autorizado la ficha y el formulario de nueva evolución', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarFicha.mockResolvedValue(FICHA);
    renderizarEn(rutaDePaciente(<FichaClinica />), '/pacientes/p1/ficha-clinica');

    expect(await screen.findByText('Primera evaluación')).toBeTruthy();
    expect(screen.getByLabelText('Nueva evolución')).toBeTruthy();
    expect(clinicoApi.consultarPaciente).toHaveBeenCalledWith('p1');
  });

  it('registra una nueva evolución', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarFicha.mockResolvedValue(FICHA);
    clinicoApi.registrarEvolucion.mockResolvedValue({});
    renderizarEn(rutaDePaciente(<FichaClinica />), '/pacientes/p1/ficha-clinica');

    await userEvent.type(await screen.findByLabelText('Nueva evolución'), 'Buena adherencia');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar evolución' }));

    expect(clinicoApi.registrarEvolucion).toHaveBeenCalledWith('p1', { descripcion: 'Buena adherencia', indicaciones: null });
  });

  it('permite al paciente leer su ficha sin formularios de escritura', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarFicha.mockResolvedValue(FICHA);
    renderizarEn(rutaDePaciente(<FichaClinica />), '/ficha-clinica');

    expect(await screen.findByText('Primera evaluación')).toBeTruthy();
    expect(screen.queryByLabelText('Nueva evolución')).toBeNull();
    expect(clinicoApi.consultarMiPerfilPaciente).toHaveBeenCalled();
  });

  it('ofrece abrir la ficha al nutricionista cuando el paciente aún no tiene una', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarFicha.mockRejectedValue(new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'El paciente aún no tiene ficha clínica'));
    renderizarEn(rutaDePaciente(<FichaClinica />), '/pacientes/p1/ficha-clinica');

    expect(await screen.findByRole('button', { name: 'Abrir ficha' })).toBeTruthy();
  });

  it('informa al paciente que aún no tiene ficha', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarFicha.mockRejectedValue(new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'El paciente aún no tiene ficha clínica'));
    renderizarEn(rutaDePaciente(<FichaClinica />), '/ficha-clinica');

    expect(await screen.findByText(/Aún no tienes una ficha clínica/)).toBeTruthy();
  });

  it('muestra el acceso denegado cuando el nutricionista no está autorizado', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarPaciente.mockRejectedValue(new ErrorApi(403, 'PERMISO_DENEGADO', 'No tiene autorización para acceder a la información de este paciente'));
    clinicoApi.consultarFicha.mockResolvedValue(FICHA);
    renderizarEn(rutaDePaciente(<FichaClinica />), '/pacientes/p2/ficha-clinica');

    expect(await screen.findByText(/No tiene autorización/)).toBeTruthy();
  });

  it('permite al nutricionista corregir los datos base exigiendo el motivo del cambio', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarFicha.mockResolvedValue(FICHA);
    clinicoApi.actualizarFicha.mockResolvedValue({});
    renderizarEn(rutaDePaciente(<FichaClinica />), '/pacientes/p1/ficha-clinica');

    await userEvent.click(await screen.findByRole('button', { name: 'Corregir datos base' }));
    const guardar = screen.getByRole('button', { name: 'Guardar corrección' });
    expect(guardar.disabled).toBe(true);
    await userEvent.type(screen.getByLabelText(/Alergias/), ', Mariscos');
    await userEvent.type(screen.getByLabelText(/Motivo del cambio/), 'Alergia informada después');
    await userEvent.click(guardar);

    expect(clinicoApi.actualizarFicha).toHaveBeenCalledTimes(1);
    const [pacienteId, datos, motivo] = clinicoApi.actualizarFicha.mock.calls[0];
    expect(pacienteId).toBe('p1');
    expect(datos.alergias).toEqual(['Maní', 'Mariscos']);
    expect(motivo).toBe('Alergia informada después');
  });

  it('no muestra la corrección de datos base al paciente', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarFicha.mockResolvedValue(FICHA);
    renderizarEn(rutaDePaciente(<FichaClinica />), '/ficha-clinica');

    await screen.findByText('Control de peso');

    expect(screen.queryByRole('button', { name: 'Corregir datos base' })).toBeNull();
  });
});

describe('Seguimiento nutricional', () => {
  const EVOLUCION = {
    pacienteId: 'p1',
    puntos: [
      { fecha: '2026-08-01T12:00:00Z', pesoKg: 82.4, imc: 29.2, cinturaCm: 96 },
      { fecha: '2026-09-01T12:00:00Z', pesoKg: 80.1, imc: 28.4, cinturaCm: 94 },
    ],
    resumen: { cantidadMediciones: 2, pesoInicialKg: 82.4, pesoActualKg: 80.1, variacionPesoKg: -2.3, imcActual: 28.4 },
  };

  const MEDICIONES = [
    { id: 'm1', fecha: '2026-08-01T12:00:00Z', pesoKg: 82.4, estaturaCm: 168, imc: 29.2, estado: 'VIGENTE' },
    { id: 'm2', fecha: '2026-09-01T12:00:00Z', pesoKg: 70, estaturaCm: 168, imc: 24.8, estado: 'ANULADA', motivoAnulacion: 'Error de digitación' },
  ];

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    clinicoApi.consultarPaciente.mockResolvedValue(PACIENTE);
    clinicoApi.consultarMiPerfilPaciente.mockResolvedValue(PACIENTE);
    clinicoApi.consultarEvolucionMediciones.mockResolvedValue(EVOLUCION);
    clinicoApi.listarMediciones.mockResolvedValue({ contenido: MEDICIONES, totalPaginas: 1 });
  });

  it('presenta el resumen y los gráficos al paciente sin formulario de registro', async () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(rutaDePaciente(<Seguimiento />), '/seguimiento');

    expect((await screen.findAllByText('80.1 kg')).length).toBeGreaterThan(0);
    expect(screen.getByText('-2.3 kg')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Evolución del peso en kilogramos' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('permite al nutricionista registrar una medición y refrescar la evolución', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.registrarMedicion.mockResolvedValue({});
    renderizarEn(rutaDePaciente(<Seguimiento />), '/pacientes/p1/seguimiento');

    await userEvent.type(await screen.findByLabelText(/Peso \(kg\)/), '79.5');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(clinicoApi.registrarMedicion).toHaveBeenCalledWith('p1', {
      pesoKg: 79.5, estaturaCm: null, cinturaCm: null, observaciones: null,
    });
    expect(clinicoApi.consultarEvolucionMediciones).toHaveBeenCalledTimes(2);
  });

  it('muestra el error del servidor cuando la medición es inválida', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.registrarMedicion.mockRejectedValue(new ErrorApi(400, 'SOLICITUD_INVALIDA', 'Debe indicar la estatura en la primera medición'));
    renderizarEn(rutaDePaciente(<Seguimiento />), '/pacientes/p1/seguimiento');

    await userEvent.type(await screen.findByLabelText(/Peso \(kg\)/), '70');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Debe indicar la estatura en la primera medición')).toBeTruthy();
  });
});

describe('Plan alimentario', () => {
  const PLAN = {
    id: 'pl1', numeroVersion: 2, estado: 'VIGENTE', vigenteDesde: '2026-10-01', objetivos: ['Mantener peso'],
    comidas: [{ nombre: 'Desayuno', horario: '08:00', alimentos: [{ alimento: 'Avena', cantidad: 40, unidad: 'g' }] }],
    recomendacionesGenerales: 'Hidratación constante',
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    clinicoApi.consultarPaciente.mockResolvedValue(PACIENTE);
    clinicoApi.consultarMiPerfilPaciente.mockResolvedValue(PACIENTE);
    clinicoApi.listarVersionesPlan.mockResolvedValue({ contenido: [PLAN] });
  });

  it('muestra el plan vigente con sus comidas y alimentos', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarPlanVigente.mockResolvedValue(PLAN);
    renderizarEn(rutaDePaciente(<PlanesAlimentarios />), '/planes-alimentarios');

    expect(await screen.findByText('Plan vigente · versión 2')).toBeTruthy();
    expect(screen.getByText('Avena: 40 g')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar nueva versión' })).toBeNull();
  });

  it('informa al paciente cuando no tiene plan vigente', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarPlanVigente.mockRejectedValue(new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'El paciente no tiene un plan alimentario vigente'));
    renderizarEn(rutaDePaciente(<PlanesAlimentarios />), '/planes-alimentarios');

    expect(await screen.findByText('Aún no tienes un plan alimentario vigente.')).toBeTruthy();
  });

  it('permite al nutricionista crear una nueva versión del plan vigente', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarPlanVigente.mockResolvedValue(PLAN);
    clinicoApi.actualizarPlan.mockResolvedValue({});
    renderizarEn(rutaDePaciente(<PlanesAlimentarios />), '/pacientes/p1/planes-alimentarios');

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar nueva versión' }));

    expect(clinicoApi.actualizarPlan).toHaveBeenCalledWith('pl1', {
      objetivos: ['Mantener peso'],
      comidas: [{ nombre: 'Desayuno', horario: '08:00', alimentos: [{ alimento: 'Avena', cantidad: 40, unidad: 'g' }] }],
      recomendacionesGenerales: 'Hidratación constante',
    });
  });

  it('permite al nutricionista anular una medición con motivo y muestra las anuladas', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.anularMedicion.mockResolvedValue({});
    renderizarEn(rutaDePaciente(<Seguimiento />), '/pacientes/p1/seguimiento');

    expect(await screen.findByText('Motivo: Error de digitación')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Anular medición del/ }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar anulación' });
    expect(confirmar.disabled).toBe(true);
    await userEvent.type(screen.getByLabelText('Motivo de la anulación'), 'Peso mal ingresado');
    await userEvent.click(confirmar);

    expect(clinicoApi.anularMedicion).toHaveBeenCalledWith('p1', 'm1', 'Peso mal ingresado');
    expect(await screen.findByText(/Medición anulada/)).toBeTruthy();
  });

  it('no ofrece anular mediciones al paciente', async () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(rutaDePaciente(<Seguimiento />), '/seguimiento');

    await screen.findByText('Motivo: Error de digitación');

    expect(screen.queryByRole('button', { name: /Anular medición del/ })).toBeNull();
  });
});
