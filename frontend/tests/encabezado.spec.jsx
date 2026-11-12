import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Encabezado from '../src/components/paginas/Encabezado.jsx';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

describe('Encabezado y navegación', () => {
  beforeEach(() => sessionStorage.clear());

  it('muestra los enlaces públicos y el acceso para visitantes', () => {
    renderizarEn(<Encabezado />);

    ['Inicio', 'Servicios', 'Nutricionistas', 'Contacto', 'Iniciar sesión', 'Registrarse'].forEach((etiqueta) => {
      expect(screen.getByRole('link', { name: etiqueta })).toBeTruthy();
    });
    expect(screen.queryByRole('link', { name: 'Mis citas' })).toBeNull();
  });

  it('muestra las secciones propias del paciente', () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(<Encabezado />);

    expect(screen.getByRole('link', { name: 'Mis citas' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Seguimiento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Administración' })).toBeNull();
  });

  it('muestra las secciones del nutricionista', () => {
    guardarSesionDePrueba('NUTRICIONISTA');
    renderizarEn(<Encabezado />);

    expect(screen.getByRole('link', { name: 'Agenda' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Pacientes' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Mis citas' })).toBeNull();
  });

  it('muestra las secciones del administrador', () => {
    guardarSesionDePrueba('ADMINISTRADOR');
    renderizarEn(<Encabezado />);

    expect(screen.getByRole('link', { name: 'Administración' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Reportes' })).toBeTruthy();
  });

  it('abre y cierra el menú móvil con el botón de menú', async () => {
    renderizarEn(<Encabezado />);
    const boton = screen.getByRole('button', { name: 'Abrir menú' });

    expect(boton.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(boton);

    expect(screen.getByRole('button', { name: 'Cerrar menú' }).getAttribute('aria-expanded')).toBe('true');
  });
});
