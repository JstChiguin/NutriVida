import { describe, expect, it } from 'vitest';
import { validarConfirmacionContrasena, validarContrasena, validarRut } from '../src/utils/validadores.js';

describe('Validaciones de registro y contraseñas', () => {
  it('exige una contraseña con longitud mínima, letras y números', () => {
    expect(validarContrasena('')).toBe('La contraseña es obligatoria');
    expect(validarContrasena('abc123')).toBe('La contraseña debe tener al menos 8 caracteres');
    expect(validarContrasena('abcdefgh')).toBe('La contraseña debe contener letras y números');
    expect(validarContrasena('12345678')).toBe('La contraseña debe contener letras y números');
    expect(validarContrasena('Clave1234')).toBeNull();
  });

  it('verifica que la confirmación coincida con la contraseña', () => {
    expect(validarConfirmacionContrasena('Clave1234', 'Clave1234')).toBeNull();
    expect(validarConfirmacionContrasena('Clave1234', 'Otra1234')).toBe('Las contraseñas no coinciden');
  });

  it('acepta un RUT con dígito verificador correcto o vacío', () => {
    expect(validarRut('')).toBeNull();
    expect(validarRut('12345678-5')).toBeNull();
    expect(validarRut('10000013-k')).toBeNull();
  });

  it('rechaza un RUT con formato o dígito verificador incorrecto', () => {
    expect(validarRut('123456785')).toBe('El RUT debe tener el formato 12345678-5');
    expect(validarRut('12345678-9')).toBe('El dígito verificador del RUT no es válido');
  });
});
