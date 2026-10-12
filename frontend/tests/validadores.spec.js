import {
  validarNombre,
  validarCorreo,
  validarTelefono,
  validarMotivo,
  validarMensaje,
  validarPrivacidad,
} from '../src/utils/validadores.js';


describe('Validaciones del formulario de contacto', () => {
  it('Debe aceptar un nombre válido', () => {
    const resultado = validarNombre('Chiguin Chiang');

    expect(resultado).toBeNull();
  });
});


it('Debe rechazar un nombre vacío', () => {
  const resultado = validarNombre('');

  expect(resultado).toBe('El nombre es obligatorio');
});



it('Debe rechazar un nombre con menos de 3 caracteres', () => {
  const resultado = validarNombre('Ch');

  expect(resultado).toBe('El nombre debe tener al menos 3 caracteres');
});


it('Debe rechazar un nombre que contenga números', () => {
  const resultado = validarNombre('Chiguin123');

  expect(resultado).toBe('El nombre solo puede contener letras y espacios');
});


it('Debe aceptar un correo electrónico válido', () => {
  const resultado = validarCorreo('chiguin@correo.cl');

  expect(resultado).toBeNull();
});


it('Debe rechazar un correo electrónico sin arroba', () => {
  const resultado = validarCorreo('chiguincorreo.cl');

  expect(resultado).toBe(
    'El correo ingresado no es válido (ej: paciente@correo.cl)'
  );
});



it('Debe aceptar un número de celular chileno válido', () => {
  const resultado = validarTelefono('9 1234 5678');

  expect(resultado).toBeNull();
});


it('Debe rechazar un celular chileno con menos de 9 dígitos', () => {
  const resultado = validarTelefono('91234567');

  expect(resultado).toBe(
    'Ingresa un celular válido de 9 dígitos (ej: 9 1234 5678)'
  );
});


it('Debe rechazar un motivo de consulta vacío', () => {
  const resultado = validarMotivo('');

  expect(resultado).toBe('Selecciona el motivo de tu consulta');
});


it('Debe rechazar un mensaje con menos de 15 caracteres', () => {
  const resultado = validarMensaje('Hola');

  expect(resultado).toBe(
    'El mensaje debe tener al menos 15 caracteres para poder orientarte'
  );
});


it('Debe impedir el envío si no se acepta la privacidad', () => {
  const resultado = validarPrivacidad(false);

  expect(resultado).toBe(
    'Debes aceptar el tratamiento confidencial de tus datos para enviar la consulta'
  );
});
