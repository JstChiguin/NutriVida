import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import SelectorHorario from '../src/components/citas/SelectorHorario.jsx';
import { Boton, EnlaceBoton } from '../src/components/ui/Boton.jsx';
import Agenda from '../src/paginas/Agenda.jsx';
import MisCitas from '../src/paginas/MisCitas.jsx';
import SolicitarCita from '../src/paginas/SolicitarCita.jsx';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { ErrorApi } from '../src/servicios/clienteApi.js';
import { formatearFechaHora } from '../src/utils/formatos.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/agendaApi.js', () => ({
  agendaApi: {
    consultarDisponibilidad: vi.fn(), solicitarCita: vi.fn(), listarCitas: vi.fn(), registrarInasistencia: vi.fn(),
    cancelarCita: vi.fn(), pagarCita: vi.fn(), reprogramarCita: vi.fn(), listarRecordatorios: vi.fn(() => Promise.resolve([])),
  },
}));
vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: { listarServicios: vi.fn(), listarNutricionistas: vi.fn(), consultarNutricionista: vi.fn() },
}));

const SERVICIOS = [
  { id: 's-control', nombre: 'Control ficticio', duracionMinutos: 30, precioReferencial: 20000 },
  { id: 's-deporte', nombre: 'Nutrición deportiva ficticia', duracionMinutos: 45, precioReferencial: 30000 },
];
const PROFESIONAL_UNO = { id: 'n-ficticio', nombreCompleto: 'Profesional Ficticio Uno', activo: true, serviciosIds: ['s-control'] };
const PROFESIONAL_DOS = {
  id: 'n-ficticio-2', nombreCompleto: 'Profesional Ficticio Dos', activo: true, serviciosIds: ['s-control', 's-deporte'],
};
const PROFESIONALES = [PROFESIONAL_UNO, PROFESIONAL_DOS];

function generarHorarios(cantidad) {
  return Array.from({ length: cantidad }, (_, indice) => {
    const inicio = new Date(Date.UTC(2026, 10, 20, 12, 0) + indice * 30 * 60000);
    return { inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + 30 * 60000).toISOString() };
  });
}

function prepararDisponibilidad(horarios) {
  agendaApi.consultarDisponibilidad.mockResolvedValue([{ fecha: '2026-11-20', horarios }]);
}

function renderizarSolicitud(ruta) {
  return renderizarEn(
    <Routes>
      <Route path="/mis-citas/nueva" element={<SolicitarCita />} />
      <Route path="/mis-citas" element={<p>Listado de mis citas</p>} />
    </Routes>,
    ruta,
  );
}

async function elegirPrimerHorarioYEnviar() {
  const horarios = await screen.findByRole('list', { name: 'Horarios disponibles' });
  await userEvent.click(within(horarios).getAllByRole('button')[0]);
  await userEvent.type(screen.getByLabelText('Motivo'), 'Consulta ficticia de control');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
  await screen.findByText('Listado de mis citas');
}

describe('Apariencia de botones', () => {
  it('asigna una clase real a cada variante', () => {
    render(
      <>
        <Boton>Guardar</Boton>
        <Boton variante="contorno">Editar</Boton>
        <Boton variante="suave">Cerrar</Boton>
        <Boton variante="peligro">Eliminar</Boton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Guardar' }).className).toContain('boton-primario');
    expect(screen.getByRole('button', { name: 'Editar' }).className).toContain('boton-contorno');
    expect(screen.getByRole('button', { name: 'Cerrar' }).className).toContain('boton-contorno');
    expect(screen.getByRole('button', { name: 'Eliminar' }).className).toContain('boton-peligro');
  });

  it('conserva el atributo disabled sin alterar la variante', () => {
    render(<Boton disabled>Confirmar</Boton>);
    const boton = screen.getByRole('button', { name: 'Confirmar' });
    expect(boton.disabled).toBe(true);
    expect(boton.className).toContain('boton-primario');
  });

  it('aplica las mismas clases a los enlaces con forma de botón', () => {
    renderizarEn(<EnlaceBoton variante="contorno" to="/mis-citas/nueva">Reservar</EnlaceBoton>);
    expect(screen.getByRole('link', { name: 'Reservar' }).className).toContain('boton-contorno');
  });

  it('muestra Inasistencia como acción delicada en la agenda', async () => {
    sessionStorage.clear();
    guardarSesionDePrueba('NUTRICIONISTA');
    agendaApi.listarCitas.mockResolvedValue({
      contenido: [{
        id: 'c-ficticia', pacienteId: 'p-ficticio', nombrePaciente: 'Paciente Ficticio', nutricionistaId: 'n-ficticio',
        servicioId: 's-control', nombreServicio: 'Control ficticio', inicio: '2026-11-20T12:00:00Z',
        motivoConsulta: 'Control', estado: 'CONFIRMADA',
      }],
    });
    renderizarEn(<Agenda />);
    expect((await screen.findByRole('button', { name: 'Inasistencia' })).className).toContain('boton-peligro');
  });
});

describe('Reserva de citas', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.listarServicios.mockResolvedValue({ contenido: SERVICIOS });
    clinicoApi.listarNutricionistas.mockImplementation(async ({ servicioId }) => ({
      contenido: PROFESIONALES.filter((profesional) => profesional.serviciosIds.includes(servicioId)),
      pagina: 0, tamano: 100, totalElementos: 2, totalPaginas: 1,
    }));
    clinicoApi.consultarNutricionista.mockImplementation(async (id) => PROFESIONALES.find((profesional) => profesional.id === id));
    agendaApi.solicitarCita.mockResolvedValue({ id: 'c-nueva' });
    prepararDisponibilidad(generarHorarios(2));
  });

  it('conserva al nutricionista elegido desde su tarjeta y lo envía al backend', async () => {
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio');

    expect(await screen.findByText('Profesional Ficticio Uno')).toBeTruthy();
    expect(screen.getByText('Nutricionista: Profesional Ficticio Uno')).toBeTruthy();
    expect(screen.queryByText(/^Servicio:/)).toBeNull();

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    expect(await screen.findByRole('list', { name: 'Horarios disponibles' })).toBeTruthy();
    expect(screen.queryByLabelText('Nutricionista')).toBeNull();
    expect(screen.getByText('Servicio: Control ficticio')).toBeTruthy();
    expect(screen.getByText(/30 min · \$20\.000/)).toBeTruthy();

    await elegirPrimerHorarioYEnviar();
    expect(agendaApi.solicitarCita).toHaveBeenCalledWith(expect.objectContaining({
      nutricionistaId: 'n-ficticio', servicioId: 's-control', inicio: '2026-11-20T12:00:00.000Z',
    }));
  });

  it('mantiene al profesional al cambiar entre servicios que ofrece', async () => {
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio-2');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.selectOptions(screen.getByLabelText('Servicio'), 's-deporte');
    await screen.findByRole('list', { name: 'Horarios disponibles' });

    expect(screen.queryByLabelText('Nutricionista')).toBeNull();
    expect(screen.getByText('Nutricionista: Profesional Ficticio Dos')).toBeTruthy();
    expect(clinicoApi.listarNutricionistas).toHaveBeenCalledWith({ servicioId: 's-deporte', pagina: 0, tamano: 100 });
  });

  it('informa cuando el servicio no está disponible con el profesional y ofrece alternativas', async () => {
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-deporte');
    expect(await screen.findByText(/no ofrece «Nutrición deportiva ficticia»/)).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Horarios disponibles' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Elegir otro servicio' }));
    expect(screen.getByLabelText('Servicio').value).toBe('');
    expect(screen.getByText('Nutricionista: Profesional Ficticio Uno')).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText('Servicio'), 's-deporte');
    await screen.findByText(/no ofrece/);
    await userEvent.click(screen.getAllByRole('button', { name: 'Cambiar profesional' })[1]);
    const selector = await screen.findByLabelText('Nutricionista');
    expect(within(selector).queryByRole('option', { name: 'Profesional Ficticio Uno' })).toBeNull();
    await userEvent.selectOptions(selector, 'n-ficticio-2');

    await elegirPrimerHorarioYEnviar();
    expect(agendaApi.solicitarCita).toHaveBeenCalledWith(expect.objectContaining({
      nutricionistaId: 'n-ficticio-2', servicioId: 's-deporte',
    }));
  });

  it('permite cambiar voluntariamente de profesional', async () => {
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar profesional' }));

    const selector = await screen.findByLabelText('Nutricionista');
    expect(selector.value).toBe('n-ficticio');
    await userEvent.selectOptions(selector, 'n-ficticio-2');

    await elegirPrimerHorarioYEnviar();
    expect(agendaApi.solicitarCita).toHaveBeenCalledWith(expect.objectContaining({ nutricionistaId: 'n-ficticio-2' }));
  });

  it('continúa con el flujo normal si el profesional indicado no existe', async () => {
    clinicoApi.consultarNutricionista.mockRejectedValue(new ErrorApi(404, 'RECURSO_NO_ENCONTRADO', 'No existe el nutricionista solicitado'));
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-inexistente');

    expect(await screen.findByText(/El profesional seleccionado no está disponible/)).toBeTruthy();
    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    const selector = await screen.findByLabelText('Nutricionista');
    expect(selector.value).toBe('');
  });

  it('trata como no disponible a un profesional inactivo', async () => {
    clinicoApi.consultarNutricionista.mockResolvedValue({ ...PROFESIONAL_UNO, activo: false });
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio');

    expect(await screen.findByText(/El profesional seleccionado no está disponible/)).toBeTruthy();
    expect(screen.queryByText('Nutricionista: Profesional Ficticio Uno')).toBeNull();
  });

  it('solicita servicio y luego profesional cuando no hay preselección', async () => {
    renderizarSolicitud('/mis-citas/nueva');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    expect(screen.queryByText(/^Nutricionista:/)).toBeNull();
    await userEvent.selectOptions(await screen.findByLabelText('Nutricionista'), 'n-ficticio');
    expect(screen.getByText('Nutricionista: Profesional Ficticio Uno')).toBeTruthy();

    await elegirPrimerHorarioYEnviar();
    expect(agendaApi.solicitarCita).toHaveBeenCalledWith(expect.objectContaining({
      nutricionistaId: 'n-ficticio', servicioId: 's-control',
    }));
    expect(clinicoApi.consultarNutricionista).not.toHaveBeenCalled();
  });

  it('recorre todas las páginas de nutricionistas sin excluir profesionales', async () => {
    clinicoApi.listarNutricionistas.mockImplementation(async ({ pagina }) => ({
      contenido: [pagina === 0 ? PROFESIONAL_UNO : PROFESIONAL_DOS], pagina, tamano: 1, totalElementos: 2, totalPaginas: 2,
    }));
    renderizarSolicitud('/mis-citas/nueva');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    const selector = await screen.findByLabelText('Nutricionista');
    expect(within(selector).getByRole('option', { name: 'Profesional Ficticio Dos' })).toBeTruthy();
    expect(clinicoApi.listarNutricionistas).toHaveBeenCalledWith({ servicioId: 's-control', pagina: 0, tamano: 100 });
    expect(clinicoApi.listarNutricionistas).toHaveBeenCalledWith({ servicioId: 's-control', pagina: 1, tamano: 100 });
  });

  it('recorre todas las páginas de servicios sin excluir ninguno', async () => {
    clinicoApi.listarServicios.mockImplementation(async ({ pagina }) => ({
      contenido: [SERVICIOS[pagina]], pagina, tamano: 1, totalElementos: 2, totalPaginas: 2,
    }));
    renderizarSolicitud('/mis-citas/nueva');

    const selector = await screen.findByLabelText('Servicio');
    expect(within(selector).getByRole('option', { name: 'Control ficticio' })).toBeTruthy();
    expect(within(selector).getByRole('option', { name: 'Nutrición deportiva ficticia' })).toBeTruthy();
    expect(clinicoApi.listarServicios).toHaveBeenCalledWith({ pagina: 0, tamano: 100 });
    expect(clinicoApi.listarServicios).toHaveBeenCalledWith({ pagina: 1, tamano: 100 });
  });

  it('conserva al profesional en el resumen al quitar el servicio sin preselección', async () => {
    renderizarSolicitud('/mis-citas/nueva');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    await userEvent.selectOptions(await screen.findByLabelText('Nutricionista'), 'n-ficticio-2');
    await userEvent.click(screen.getByRole('button', { name: /^Quitar Servicio/ }));

    expect(screen.getByText('Nutricionista: Profesional Ficticio Dos')).toBeTruthy();
    expect(screen.queryByText(/^Servicio:/)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Servicio'), 's-deporte');
    expect((await screen.findByLabelText('Nutricionista')).value).toBe('n-ficticio-2');
    await elegirPrimerHorarioYEnviar();
    expect(agendaApi.solicitarCita).toHaveBeenCalledWith(expect.objectContaining({
      nutricionistaId: 'n-ficticio-2', servicioId: 's-deporte',
    }));
  });

  it('muestra la fecha y hora del resumen en formato de 24 horas', async () => {
    prepararDisponibilidad([{ inicio: '2026-11-20T20:30:00.000Z', fin: '2026-11-20T21:00:00.000Z' }]);
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    const horarios = await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(within(horarios).getByRole('button', { name: '17:30' }));

    expect(screen.getByText('Fecha y hora: 20-11-2026, 17:30')).toBeTruthy();
  });

  it('quita solo el elemento indicado del resumen', async () => {
    renderizarSolicitud('/mis-citas/nueva?nutricionistaId=n-ficticio');

    await userEvent.selectOptions(await screen.findByLabelText('Servicio'), 's-control');
    const horarios = await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(within(horarios).getAllByRole('button')[0]);
    expect(screen.getByText(/^Fecha y hora:/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /^Quitar Fecha y hora/ }));
    expect(screen.queryByText(/^Fecha y hora:/)).toBeNull();
    expect(screen.getByText('Servicio: Control ficticio')).toBeTruthy();
    expect(screen.getByText('Nutricionista: Profesional Ficticio Uno')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /^Quitar Servicio/ }));
    expect(screen.queryByText(/^Servicio:/)).toBeNull();
    expect(screen.getByLabelText('Servicio').value).toBe('');
    expect(screen.getByText('Nutricionista: Profesional Ficticio Uno')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /^Quitar Nutricionista/ }));
    expect(screen.queryByText(/^Nutricionista:/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cambiar profesional' })).toBeNull();
  });
});

describe('Formato de fecha y hora', () => {
  it('usa 24 horas con la fecha chilena en la zona horaria de la clínica', () => {
    expect(formatearFechaHora('2026-11-19T12:00:00Z')).toBe('19-11-2026, 09:00');
    expect(formatearFechaHora('2026-11-19T20:30:00Z')).toBe('19-11-2026, 17:30');
    expect(formatearFechaHora('2026-07-15T03:05:00Z')).toBe('14-07-2026, 23:05');
    expect(formatearFechaHora('')).toBe('');
  });
});

describe('Selector de horarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra horas individuales ordenadas, sin duplicados y limitadas a tres filas', async () => {
    const horarios = generarHorarios(20);
    prepararDisponibilidad([...horarios].reverse().concat(horarios[0]));
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado="" onSeleccionar={vi.fn()} />);

    const lista = await screen.findByRole('list', { name: 'Horarios disponibles' });
    const botones = within(lista).getAllByRole('button');
    expect(botones).toHaveLength(12);
    expect(botones[0].textContent).toBe('09:00');
    expect(botones[1].textContent).toBe('09:30');

    await userEvent.click(screen.getByRole('button', { name: 'Ver más horarios (8)' }));
    expect(within(lista).getAllByRole('button')).toHaveLength(20);
    expect(within(lista).getAllByRole('button')[19].textContent).toBe('18:30');
    expect(screen.getByRole('button', { name: 'Ver menos' }).getAttribute('aria-expanded')).toBe('true');

    await userEvent.click(screen.getByRole('button', { name: 'Ver menos' }));
    expect(within(lista).getAllByRole('button')).toHaveLength(12);
  });

  it('mantiene reconocible un horario seleccionado oculto al contraer', async () => {
    const horarios = generarHorarios(20);
    prepararDisponibilidad(horarios);
    const onSeleccionar = vi.fn();
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado={horarios[15].inicio}
      onSeleccionar={onSeleccionar} />);

    expect(await screen.findByText('Horario seleccionado: 16:30')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Ver más horarios (8)' }));
    expect(screen.getByRole('button', { name: '16:30' }).getAttribute('aria-pressed')).toBe('true');
    expect(onSeleccionar).not.toHaveBeenCalled();
  });

  it('no limpia la selección válida al montar y usa su fecha', async () => {
    const horarios = generarHorarios(3);
    prepararDisponibilidad(horarios);
    const onSeleccionar = vi.fn();
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado={horarios[1].inicio}
      onSeleccionar={onSeleccionar} />);

    await screen.findByRole('list', { name: 'Horarios disponibles' });
    expect(screen.getByLabelText('Fecha').value).toBe('2026-11-20');
    expect(agendaApi.consultarDisponibilidad).toHaveBeenCalledWith('n-ficticio', { servicioId: 's-control', fecha: '2026-11-20' });
    expect(onSeleccionar).not.toHaveBeenCalled();
  });

  it('no invoca la selección al montar sin horario elegido', async () => {
    prepararDisponibilidad(generarHorarios(3));
    const onSeleccionar = vi.fn();
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado="" onSeleccionar={onSeleccionar} />);

    await screen.findByRole('list', { name: 'Horarios disponibles' });
    expect(onSeleccionar).not.toHaveBeenCalled();
  });

  it('limpia la selección cuando cambia realmente la fecha', async () => {
    const horarios = generarHorarios(3);
    prepararDisponibilidad(horarios);
    const onSeleccionar = vi.fn();
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado={horarios[0].inicio}
      onSeleccionar={onSeleccionar} />);

    await screen.findByRole('list', { name: 'Horarios disponibles' });
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-25' } });
    expect(onSeleccionar).toHaveBeenCalledWith('');
  });

  it('limpia la selección solo después de confirmar que dejó de estar disponible', async () => {
    const horarios = generarHorarios(3);
    prepararDisponibilidad(horarios.slice(1));
    const onSeleccionar = vi.fn();
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado={horarios[0].inicio}
      onSeleccionar={onSeleccionar} />);

    expect(onSeleccionar).not.toHaveBeenCalled();
    await waitFor(() => expect(onSeleccionar).toHaveBeenCalledWith(''));
  });

  it('informa cuando no existen horarios disponibles', async () => {
    prepararDisponibilidad([]);
    render(<SelectorHorario nutricionistaId="n-ficticio" servicioId="s-control" seleccionado="" onSeleccionar={vi.fn()} />);

    expect(await screen.findByText('No hay horarios disponibles para esta fecha.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ver más/ })).toBeNull();
  });

  it('en la reprogramación exige un nuevo horario tras cambiar de fecha', async () => {
    sessionStorage.clear();
    guardarSesionDePrueba('PACIENTE');
    prepararDisponibilidad(generarHorarios(3));
    agendaApi.listarCitas.mockResolvedValue({
      contenido: [{
        id: 'c-ficticia', nutricionistaId: 'n-ficticio', nombreNutricionista: 'Profesional Ficticio Uno', servicioId: 's-control',
        nombreServicio: 'Control ficticio', duracionMinutos: 30, precioReferencial: 20000, inicio: '2026-11-19T12:00:00Z',
        estado: 'CONFIRMADA', pagada: true,
      }],
    });
    renderizarEn(<MisCitas />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reprogramar' }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar nuevo horario' });
    expect(confirmar.disabled).toBe(true);

    const lista = await screen.findByRole('list', { name: 'Horarios disponibles' });
    await userEvent.click(within(lista).getAllByRole('button')[0]);
    expect(confirmar.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-26' } });
    expect(screen.getByRole('button', { name: 'Confirmar nuevo horario' }).disabled).toBe(true);
  });
});
