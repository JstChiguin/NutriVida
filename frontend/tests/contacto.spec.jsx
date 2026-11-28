import { beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contacto from '../src/components/paginas/Contacto.jsx';
import { clinicoApi } from '../src/servicios/clinicoApi.js';
import { ErrorApi } from '../src/servicios/clienteApi.js';

vi.mock('../src/servicios/clinicoApi.js', () => ({
  clinicoApi: { enviarSolicitudContacto: vi.fn() },
}));

beforeEach(() => {
  clinicoApi.enviarSolicitudContacto.mockReset();
  clinicoApi.enviarSolicitudContacto.mockResolvedValue({ id: 'solicitud-ficticia' });
});

afterEach(() => {
  cleanup();
});

async function completarFormulario(usuario, { telefono } = {}) {
  await usuario.type(screen.getByLabelText(/Nombre completo/), 'Consulta Prueba Demo');
  await usuario.type(screen.getByLabelText(/Correo electrónico/), 'evidencia.contacto@example.com');
  if (telefono) {
    await usuario.type(screen.getByLabelText(/Teléfono celular/), telefono);
  }
  await usuario.selectOptions(screen.getByLabelText(/Motivo de consulta/), 'metabolica');
  await usuario.type(
    screen.getByLabelText(/^Mensaje/),
    'Consulta ficticia para comprobar el envío.',
  );
  await usuario.click(screen.getByLabelText(/Acepto el uso y tratamiento confidencial/));
}

describe('Pruebas de interacción del formulario de contacto', () => {
  it('debe mostrar el error del nombre al enviar el formulario vacío', async () => {
    const usuario = userEvent.setup();

    render(<Contacto />);

    await usuario.click(
      screen.getByRole('button', { name: /Enviar Mensaje/i })
    );

    expect(
      screen.getByText('El nombre es obligatorio')
    ).toBeTruthy();
  });

  it('debe mostrar el error cuando se envía un correo inválido', async () => {
    const usuario = userEvent.setup();

    render(<Contacto />);

    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'correo-invalido'
    );

    await usuario.click(
      screen.getByRole('button', { name: /Enviar Mensaje/i })
    );

    expect(
      screen.getByText(
        'El correo ingresado no es válido (ej: paciente@correo.cl)'
      )
    ).toBeTruthy();
  });

  it('debe impedir el envío si no se acepta la privacidad', async () => {
    const usuario = userEvent.setup();

    render(<Contacto />);

    await usuario.type(
      screen.getByLabelText(/Nombre completo/),
      'Ana Pérez Soto'
    );
    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'persona.prueba@correo.cl'
    );
    await usuario.selectOptions(
      screen.getByLabelText(/Motivo de consulta/),
      'consulta_inicial'
    );
    await usuario.type(
      screen.getByLabelText(/^Mensaje/),
      'Necesito orientación nutricional.'
    );

    await usuario.click(
      screen.getByRole('button', { name: /Enviar Mensaje/i })
    );

    expect(
      screen.getByText(
        'Debes aceptar el tratamiento confidencial de tus datos para enviar la consulta'
      )
    ).toBeTruthy();

    expect(
      screen.queryByText('¡Mensaje recibido con éxito!')
    ).toBeNull();
  });

  it('debe mostrar la confirmación cuando el formulario es válido', async () => {
    const usuario = userEvent.setup();

    render(<Contacto />);

    await usuario.type(
      screen.getByLabelText(/Nombre completo/),
      'Ana Pérez Soto'
    );
    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'persona.prueba@correo.cl'
    );
    await usuario.selectOptions(
      screen.getByLabelText(/Motivo de consulta/),
      'consulta_inicial'
    );
    await usuario.type(
      screen.getByLabelText(/^Mensaje/),
      'Necesito orientación nutricional.'
    );
    await usuario.click(
      screen.getByLabelText(/Acepto el uso y tratamiento confidencial/)
    );

    await usuario.click(
      screen.getByRole('button', { name: /Enviar Mensaje/i })
    );

    expect(
      screen.getByText('¡Mensaje recibido con éxito!')
    ).toBeTruthy();

    expect(screen.getByText('persona.prueba@correo.cl')).toBeTruthy();
  });

  it('debe limpiar el formulario al seleccionar enviar otra consulta', async () => {
    const usuario = userEvent.setup();

    render(<Contacto />);

    await usuario.type(
      screen.getByLabelText(/Nombre completo/),
      'Ana Pérez Soto'
    );
    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'persona.prueba@correo.cl'
    );
    await usuario.selectOptions(
      screen.getByLabelText(/Motivo de consulta/),
      'consulta_inicial'
    );
    await usuario.type(
      screen.getByLabelText(/^Mensaje/),
      'Necesito orientación nutricional.'
    );
    await usuario.click(
      screen.getByLabelText(/Acepto el uso y tratamiento confidencial/)
    );

    await usuario.click(
      screen.getByRole('button', { name: /Enviar Mensaje/i })
    );

    await usuario.click(
      screen.getByRole('button', { name: /Enviar otra consulta/i })
    );

    expect(
      screen.getByLabelText(/Nombre completo/).value
    ).toBe('');

    expect(
      screen.getByLabelText(/Correo electrónico/).value
    ).toBe('');
  });

  it('debe enviar la solicitud al servicio clínico antes de confirmar', async () => {
    const usuario = userEvent.setup();
    render(<Contacto />);

    await completarFormulario(usuario, { telefono: '9 1234 5678' });
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    expect(await screen.findByText('¡Mensaje recibido con éxito!')).toBeTruthy();
    expect(clinicoApi.enviarSolicitudContacto).toHaveBeenCalledTimes(1);
    expect(clinicoApi.enviarSolicitudContacto).toHaveBeenCalledWith({
      nombre: 'Consulta Prueba Demo',
      correo: 'evidencia.contacto@example.com',
      telefono: '912345678',
      mensaje: '[Motivo: Control Diabetes / Hipertensión] Consulta ficticia para comprobar el envío.',
    });
  });

  it('debe omitir el teléfono cuando el campo queda vacío', async () => {
    const usuario = userEvent.setup();
    render(<Contacto />);

    await completarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    await screen.findByText('¡Mensaje recibido con éxito!');
    expect(clinicoApi.enviarSolicitudContacto.mock.calls[0][0]).not.toHaveProperty('telefono');
  });

  it('no debe llamar al servicio cuando el formulario es inválido', async () => {
    const usuario = userEvent.setup();
    render(<Contacto />);

    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    expect(clinicoApi.enviarSolicitudContacto).not.toHaveBeenCalled();
  });

  it('debe confirmar también cuando el servicio responde que la consulta ya estaba registrada', async () => {
    clinicoApi.enviarSolicitudContacto.mockResolvedValue({ id: 'solicitud-existente' });
    const usuario = userEvent.setup();
    render(<Contacto />);

    await completarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    expect(await screen.findByText('¡Mensaje recibido con éxito!')).toBeTruthy();
  });

  it('no debe confirmar y debe mostrar el error cuando el servicio rechaza la solicitud', async () => {
    clinicoApi.enviarSolicitudContacto.mockRejectedValue(
      new ErrorApi(400, 'VALIDACION', 'Datos inválidos', ['mensaje: tamaño inválido']),
    );
    const usuario = userEvent.setup();
    render(<Contacto />);

    await completarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    expect(await screen.findByText('Datos inválidos: mensaje: tamaño inválido')).toBeTruthy();
    expect(screen.queryByText('¡Mensaje recibido con éxito!')).toBeNull();
    expect(screen.getByLabelText(/Nombre completo/).value).toBe('Consulta Prueba Demo');
  });

  it('no debe confirmar cuando no hay conexión o el servicio no está disponible', async () => {
    const usuario = userEvent.setup();
    render(<Contacto />);
    await completarFormulario(usuario);

    clinicoApi.enviarSolicitudContacto.mockRejectedValueOnce(
      new ErrorApi(0, 'SIN_CONEXION', 'No fue posible comunicarse con el servidor. Intente nuevamente.'),
    );
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));
    expect(await screen.findByText(/No fue posible comunicarse con el servidor/)).toBeTruthy();
    expect(screen.queryByText('¡Mensaje recibido con éxito!')).toBeNull();

    clinicoApi.enviarSolicitudContacto.mockRejectedValueOnce(
      new ErrorApi(503, 'SERVICIO_NO_DISPONIBLE', 'Servicio no disponible'),
    );
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));
    expect(await screen.findByText('Servicio no disponible')).toBeTruthy();
    expect(screen.queryByText('¡Mensaje recibido con éxito!')).toBeNull();
  });

  it('debe permitir reintentar tras un error y confirmar cuando el servicio responde', async () => {
    clinicoApi.enviarSolicitudContacto.mockRejectedValueOnce(new ErrorApi(503, 'X', 'Servicio no disponible'));
    const usuario = userEvent.setup();
    render(<Contacto />);

    await completarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));
    await screen.findByText('Servicio no disponible');
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    expect(await screen.findByText('¡Mensaje recibido con éxito!')).toBeTruthy();
    expect(clinicoApi.enviarSolicitudContacto).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Servicio no disponible')).toBeNull();
  });

  it('debe bloquear el botón y evitar envíos dobles mientras la solicitud está en curso', async () => {
    let resolver;
    clinicoApi.enviarSolicitudContacto.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    const usuario = userEvent.setup();
    render(<Contacto />);

    await completarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /Enviar Mensaje/i }));

    const boton = screen.getByRole('button', { name: /Enviando/i });
    expect(boton.disabled).toBe(true);
    await usuario.click(boton);
    expect(clinicoApi.enviarSolicitudContacto).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('¡Mensaje recibido con éxito!')).toBeNull();

    resolver({ id: 'solicitud-ficticia' });
    expect(await screen.findByText('¡Mensaje recibido con éxito!')).toBeTruthy();
  });
});
