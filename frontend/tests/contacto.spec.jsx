import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contacto from '../src/components/Contacto.jsx';

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
});
