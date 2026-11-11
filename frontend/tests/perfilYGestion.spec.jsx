import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Administracion from '../src/paginas/Administracion.jsx';
import Agenda from '../src/paginas/Agenda.jsx';
import PacientesAtendidos from '../src/paginas/PacientesAtendidos.jsx';
import Perfil from '../src/paginas/Perfil.jsx';
import { agendaApi } from '../src/servicios/agendaApi.js';
import { autenticacionApi } from '../src/servicios/autenticacionApi.js';
import { ErrorApi } from '../src/servicios/clienteApi.js';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/autenticacionApi.js', () => ({
  autenticacionApi: { cambiarContrasena: vi.fn(), listarUsuarios: vi.fn() },
}));
vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: {
    consultarMiPerfilPaciente: vi.fn(), actualizarMiPerfilPaciente: vi.fn(), listarPacientes: vi.fn(),
    listarServicios: vi.fn(), crearServicio: vi.fn(), actualizarServicio: vi.fn(), cambiarEstadoServicio: vi.fn(),
    listarNutricionistas: vi.fn(), crearNutricionista: vi.fn(), cambiarEstadoNutricionista: vi.fn(),
    consultarMiPerfilNutricionista: vi.fn(), actualizarMiPerfilNutricionista: vi.fn(),
  },
}));
vi.mock('../src/servicios/agendaApi.js', () => ({
  agendaApi: {
    listarCitas: vi.fn(), consultarAgenda: vi.fn(), definirHorarios: vi.fn(), agregarBloqueo: vi.fn(), quitarBloqueo: vi.fn(),
  },
}));

const PERFIL_PACIENTE = {
  id: 'p1', nombreCompleto: 'Ana Prueba Demo', rut: '12345678-5', telefono: '56912345678',
  fechaNacimiento: '1990-05-20', sexo: 'FEMENINO', direccion: null,
};

describe('Perfil', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('permite al paciente actualizar sus datos personales', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarMiPerfilPaciente.mockResolvedValue(PERFIL_PACIENTE);
    clinicoApi.actualizarMiPerfilPaciente.mockResolvedValue({});
    renderizarEn(<Perfil />);

    const telefono = await screen.findByLabelText('Teléfono');
    await userEvent.clear(telefono);
    await userEvent.type(telefono, '9 8765 4321');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(clinicoApi.actualizarMiPerfilPaciente).toHaveBeenCalledWith(expect.objectContaining({
      nombreCompleto: 'Ana Prueba Demo', telefono: '987654321', rut: '12345678-5',
    }));
    expect(await screen.findByText('Datos actualizados correctamente')).toBeTruthy();
  });

  it('valida el RUT antes de guardar el perfil', async () => {
    guardarSesionDePrueba('PACIENTE');
    clinicoApi.consultarMiPerfilPaciente.mockResolvedValue(PERFIL_PACIENTE);
    renderizarEn(<Perfil />);

    const rut = await screen.findByLabelText('RUT');
    await userEvent.clear(rut);
    await userEvent.type(rut, '12345678-9');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('El dígito verificador del RUT no es válido')).toBeTruthy();
    expect(clinicoApi.actualizarMiPerfilPaciente).not.toHaveBeenCalled();
  });

  it('cambia la contraseña validando la confirmación', async () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    autenticacionApi.cambiarContrasena.mockResolvedValue(null);
    clinicoApi.consultarMiPerfilNutricionista.mockResolvedValue({
      id: 'n1', nombreCompleto: 'Ana Ficticia', especialidades: ['Nutrición clínica'], serviciosIds: [],
    });
    renderizarEn(<Perfil />);

    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'Antigua123');
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Nueva1234');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña nueva'), 'Distinta1');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();

    await userEvent.clear(screen.getByLabelText('Confirmar contraseña nueva'));
    await userEvent.type(screen.getByLabelText('Confirmar contraseña nueva'), 'Nueva1234');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

    expect(autenticacionApi.cambiarContrasena).toHaveBeenCalledWith('Antigua123', 'Nueva1234');
    expect(await screen.findByText('Contraseña actualizada')).toBeTruthy();
    expect(clinicoApi.consultarMiPerfilPaciente).not.toHaveBeenCalled();
  });

  it('muestra el error cuando la contraseña actual es incorrecta', async () => {
    guardarSesionDePrueba('ADMINISTRADOR');
    autenticacionApi.cambiarContrasena.mockRejectedValue(new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'La contraseña actual es incorrecta'));
    renderizarEn(<Perfil />);

    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'Incorrecta1');
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'Nueva1234');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña nueva'), 'Nueva1234');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));

    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeTruthy();
  });
});

describe('Pacientes del nutricionista', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('NUTRICIONISTA');
  });

  it('lista los pacientes autorizados con accesos a su información clínica', async () => {
    clinicoApi.listarPacientes.mockResolvedValue({
      contenido: [{ id: 'p1', nombreCompleto: 'Pedro Ficticio', correo: 'pedro@nutrivida.test' }], totalPaginas: 1,
    });
    renderizarEn(<PacientesAtendidos />);

    expect(await screen.findByText('Pedro Ficticio')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ficha clínica' }).getAttribute('href')).toBe('/pacientes/p1/ficha-clinica');
    expect(screen.getByRole('link', { name: 'Seguimiento' }).getAttribute('href')).toBe('/pacientes/p1/seguimiento');
    expect(screen.getByRole('link', { name: 'Plan alimentario' }).getAttribute('href')).toBe('/pacientes/p1/planes-alimentarios');
  });

  it('busca pacientes por texto', async () => {
    clinicoApi.listarPacientes.mockResolvedValue({ contenido: [], totalPaginas: 0 });
    renderizarEn(<PacientesAtendidos />);
    await screen.findByText('No hay pacientes para mostrar.');

    await userEvent.type(screen.getByLabelText(/Buscar por nombre/), 'ped');

    expect(clinicoApi.listarPacientes).toHaveBeenLastCalledWith(expect.objectContaining({ texto: 'ped' }));
  });
});

describe('Configuración de la agenda del nutricionista', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('NUTRICIONISTA');
    agendaApi.listarCitas.mockResolvedValue({ contenido: [] });
    clinicoApi.consultarMiPerfilNutricionista.mockResolvedValue({ id: 'n1' });
    agendaApi.consultarAgenda.mockResolvedValue({
      horariosSemanales: [{ dia: 'MONDAY', horaInicio: '09:00', horaFin: '13:00' }],
      bloqueos: [{ identificador: 'b1', inicio: '2026-11-03T13:00:00Z', fin: '2026-11-03T14:00:00Z', motivo: 'Capacitación', tipo: 'BLOQUEO' }],
    });
  });

  it('guarda la jornada semanal con los días activos', async () => {
    agendaApi.definirHorarios.mockResolvedValue({});
    renderizarEn(<Agenda />);

    await userEvent.click(screen.getByRole('tab', { name: 'Horarios y bloqueos' }));
    await userEvent.click(await screen.findByLabelText('Martes'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));

    expect(agendaApi.definirHorarios).toHaveBeenCalledWith('n1', [
      { dia: 'MONDAY', horaInicio: '09:00', horaFin: '13:00' },
      { dia: 'TUESDAY', horaInicio: '09:00', horaFin: '13:00' },
    ]);
  });

  it('muestra los bloqueos y permite quitarlos', async () => {
    agendaApi.quitarBloqueo.mockResolvedValue({});
    renderizarEn(<Agenda />);

    await userEvent.click(screen.getByRole('tab', { name: 'Horarios y bloqueos' }));
    expect(await screen.findByText(/Capacitación/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));

    expect(agendaApi.quitarBloqueo).toHaveBeenCalledWith('n1', 'b1');
  });

  it('muestra el error cuando el bloqueo afecta citas activas', async () => {
    agendaApi.agregarBloqueo.mockRejectedValue(new ErrorApi(409, 'CONFLICTO_DE_NEGOCIO', 'El bloqueo afecta 1 cita(s) activa(s); reprográmelas antes'));
    renderizarEn(<Agenda />);

    await userEvent.click(screen.getByRole('tab', { name: 'Horarios y bloqueos' }));
    await userEvent.type(await screen.findByLabelText('Inicio'), '2026-11-03T10:00');
    await userEvent.type(screen.getByLabelText('Término'), '2026-11-03T11:00');
    await userEvent.type(screen.getByLabelText('Motivo'), 'Ausencia');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(await screen.findByText(/afecta 1 cita/)).toBeTruthy();
  });
});

describe('Gestión de servicios y nutricionistas', () => {
  const SERVICIO = { id: 's1', nombre: 'Control nutricional', descripcion: 'Seguimiento', categoria: 'Control', duracionMinutos: 30, precioReferencial: 25000, activo: true };

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('ADMINISTRADOR');
    clinicoApi.listarServicios.mockResolvedValue({ contenido: [SERVICIO] });
    autenticacionApi.listarUsuarios.mockResolvedValue({
      contenido: [{ id: 'u9', nombreCompleto: 'Carla Prueba Demo', correo: 'carla@nutrivida.test', rol: 'NUTRICIONISTA', activo: true }],
    });
    clinicoApi.listarNutricionistas.mockResolvedValue({
      contenido: [{ id: 'n1', nombreCompleto: 'Ana Ficticia', especialidades: ['Deportiva'], activo: true }],
    });
  });

  it('crea un servicio nuevo desde el formulario', async () => {
    clinicoApi.crearServicio.mockResolvedValue({});
    renderizarEn(<Administracion />);
    await userEvent.click(screen.getByRole('tab', { name: 'Servicios' }));

    await userEvent.type(await screen.findByLabelText('Nombre'), 'Evaluación corporal');
    await userEvent.type(screen.getByLabelText('Categoría'), 'Evaluación');
    await userEvent.clear(screen.getByLabelText(/Duración/));
    await userEvent.type(screen.getByLabelText(/Duración/), '45');
    await userEvent.type(screen.getByLabelText(/Precio referencial/), '30000');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Medición antropométrica');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(clinicoApi.crearServicio).toHaveBeenCalledWith({
      nombre: 'Evaluación corporal', descripcion: 'Medición antropométrica', categoria: 'Evaluación',
      duracionMinutos: 45, precioReferencial: 30000,
    });
  });

  it('edita y desactiva un servicio existente', async () => {
    clinicoApi.actualizarServicio.mockResolvedValue({});
    clinicoApi.cambiarEstadoServicio.mockResolvedValue({});
    renderizarEn(<Administracion />);
    await userEvent.click(screen.getByRole('tab', { name: 'Servicios' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(clinicoApi.actualizarServicio).toHaveBeenCalledWith('s1', expect.objectContaining({ nombre: 'Control nutricional', duracionMinutos: 30 }));

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    expect(clinicoApi.cambiarEstadoServicio).toHaveBeenCalledWith('s1', false);
  });

  it('crea el perfil de un nutricionista asociado a un usuario', async () => {
    clinicoApi.crearNutricionista.mockResolvedValue({});
    renderizarEn(<Administracion />);
    await userEvent.click(screen.getByRole('tab', { name: 'Nutricionistas' }));

    await userEvent.selectOptions(await screen.findByLabelText('Usuario con rol Nutricionista'), 'u9');
    await userEvent.type(screen.getByLabelText('Nombre profesional'), 'Carla Prueba Demo');
    await userEvent.type(screen.getByLabelText(/Especialidades/), 'Pediátrica, Familiar');
    await userEvent.click(screen.getByLabelText('Control nutricional'));
    await userEvent.click(screen.getByRole('button', { name: 'Crear perfil' }));

    expect(clinicoApi.crearNutricionista).toHaveBeenCalledWith({
      usuarioId: 'u9', nombreCompleto: 'Carla Prueba Demo', titulo: 'Nutricionista',
      especialidades: ['Pediátrica', 'Familiar'], serviciosIds: ['s1'],
    });
  });

  it('desactiva a un nutricionista del equipo', async () => {
    clinicoApi.cambiarEstadoNutricionista.mockResolvedValue({});
    renderizarEn(<Administracion />);
    await userEvent.click(screen.getByRole('tab', { name: 'Nutricionistas' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));

    expect(clinicoApi.cambiarEstadoNutricionista).toHaveBeenCalledWith('n1', false);
  });
});

describe('Perfil profesional del nutricionista', () => {
  const PERFIL = {
    id: 'n1', nombreCompleto: 'Ana Ficticia', titulo: 'Nutricionista', especialidades: ['Nutrición clínica'],
    biografia: 'Presentación inicial', fotoUrl: null, serviciosIds: ['s1'], activo: true,
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    guardarSesionDePrueba('NUTRICIONISTA');
    clinicoApi.consultarMiPerfilNutricionista.mockResolvedValue(PERFIL);
  });

  it('actualiza el perfil conservando los servicios que ofrece', async () => {
    clinicoApi.actualizarMiPerfilNutricionista.mockResolvedValue({});
    renderizarEn(<Perfil />);

    const especialidades = await screen.findByLabelText(/Especialidades/);
    await userEvent.clear(especialidades);
    await userEvent.type(especialidades, 'Nutrición clínica, Deportiva');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(clinicoApi.actualizarMiPerfilNutricionista).toHaveBeenCalledWith({
      nombreCompleto: 'Ana Ficticia', titulo: 'Nutricionista', especialidades: ['Nutrición clínica', 'Deportiva'],
      biografia: 'Presentación inicial', fotoUrl: null, serviciosIds: ['s1'],
    });
    expect(await screen.findByText('Perfil profesional actualizado')).toBeTruthy();
  });

  it('exige al menos una especialidad', async () => {
    renderizarEn(<Perfil />);

    await userEvent.clear(await screen.findByLabelText(/Especialidades/));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    expect(await screen.findByText('Indica al menos una especialidad')).toBeTruthy();
    expect(clinicoApi.actualizarMiPerfilNutricionista).not.toHaveBeenCalled();
  });
});
