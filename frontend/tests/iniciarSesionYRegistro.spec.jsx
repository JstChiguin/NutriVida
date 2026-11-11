import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import IniciarSesion from '../src/paginas/IniciarSesion.jsx';
import Registro from '../src/paginas/Registro.jsx';
import { ErrorApi } from '../src/servicios/clienteApi.js';
import { autenticacionApi } from '../src/servicios/autenticacionApi.js';
import { renderizarEn } from './ayudas.jsx';

vi.mock('../src/servicios/autenticacionApi.js', () => ({
  autenticacionApi: { iniciarSesion: vi.fn(), registrarPaciente: vi.fn(), cerrarSesion: vi.fn() },
}));

function Rutas() {
  return (
    <Routes>
      <Route path="/iniciar-sesion" element={<IniciarSesion />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/mis-citas" element={<p>Pantalla de mis citas</p>} />
      <Route path="/agenda" element={<p>Pantalla de agenda</p>} />
    </Routes>
  );
}

describe('Inicio de sesión', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('valida los campos antes de llamar al servidor', async () => {
    renderizarEn(<Rutas />, '/iniciar-sesion');

    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(screen.getByText('El correo es obligatorio')).toBeTruthy();
    expect(screen.getByText('La contraseña es obligatoria')).toBeTruthy();
    expect(autenticacionApi.iniciarSesion).not.toHaveBeenCalled();
  });

  it('redirige según el rol al iniciar sesión correctamente', async () => {
    autenticacionApi.iniciarSesion.mockResolvedValue({
      token: 't', usuario: { id: '1', nombreCompleto: 'Bruno Prueba Demo', rol: 'NUTRICIONISTA' },
    });
    renderizarEn(<Rutas />, '/iniciar-sesion');

    await userEvent.type(screen.getByLabelText(/Correo electrónico/), 'bruno@nutrivida.test');
    await userEvent.type(screen.getByLabelText(/Contraseña/), 'Clave1234');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Pantalla de agenda')).toBeTruthy();
    expect(autenticacionApi.iniciarSesion).toHaveBeenCalledWith('bruno@nutrivida.test', 'Clave1234');
  });

  it('muestra el mensaje del servidor cuando las credenciales son incorrectas', async () => {
    autenticacionApi.iniciarSesion.mockRejectedValue(new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos'));
    renderizarEn(<Rutas />, '/iniciar-sesion');

    await userEvent.type(screen.getByLabelText(/Correo electrónico/), 'ana@nutrivida.test');
    await userEvent.type(screen.getByLabelText(/Contraseña/), 'Incorrecta1');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeTruthy();
  });
});

describe('Registro de pacientes', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('informa los errores de validación del formulario', async () => {
    renderizarEn(<Rutas />, '/registro');

    await userEvent.type(screen.getByLabelText(/^Contraseña/), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/Confirmar contraseña/), 'distinta1');
    await userEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    expect(screen.getByText('La contraseña debe contener letras y números')).toBeTruthy();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(autenticacionApi.registrarPaciente).not.toHaveBeenCalled();
  });

  it('registra al paciente sin enviar un rol y lo lleva a sus citas', async () => {
    autenticacionApi.registrarPaciente.mockResolvedValue({
      token: 't', usuario: { id: '2', nombreCompleto: 'Paciente Nuevo Demo', rol: 'PACIENTE' },
    });
    renderizarEn(<Rutas />, '/registro');

    await userEvent.type(screen.getByLabelText(/Nombre completo/), 'Paciente Nuevo Demo');
    await userEvent.type(screen.getByLabelText(/Correo electrónico/), 'nuevo@nutrivida.test');
    await userEvent.type(screen.getByLabelText(/^Contraseña/), 'Clave1234');
    await userEvent.type(screen.getByLabelText(/Confirmar contraseña/), 'Clave1234');
    await userEvent.click(screen.getByRole('button', { name: 'Registrarme' }));

    expect(await screen.findByText('Pantalla de mis citas')).toBeTruthy();
    const datosEnviados = autenticacionApi.registrarPaciente.mock.calls[0][0];
    expect(datosEnviados.rol).toBeUndefined();
    expect(datosEnviados.correo).toBe('nuevo@nutrivida.test');
  });
});
