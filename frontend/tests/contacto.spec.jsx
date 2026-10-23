import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contacto from '../src/components/paginas/Contacto.jsx';

afterEach(() => {
  cleanup();
});

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
      'Chiguin Chiang'
    );
    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'chiguin@correo.cl'
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
      'Chiguin Chiang'
    );
    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'chiguin@correo.cl'
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

    expect(screen.getByText('chiguin@correo.cl')).toBeTruthy();
  });

  it('debe limpiar el formulario al seleccionar enviar otra consulta', async () => {
    const usuario = userEvent.setup();

    render(<Contacto />);

    await usuario.type(
      screen.getByLabelText(/Nombre completo/),
      'Chiguin Chiang'
    );
    await usuario.type(
      screen.getByLabelText(/Correo electrónico/),
      'chiguin@correo.cl'
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

});
