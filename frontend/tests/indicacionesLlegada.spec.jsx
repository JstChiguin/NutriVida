import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IndicacionesLlegada from '../src/components/paginas/IndicacionesLlegada.jsx';
import { calcularDistanciaKm, enlaceIndicaciones, formatearDistancia } from '../src/utils/geografia.js';

const CLINICA = { latitud: -33.044541, longitud: -71.615485 };

function simularGeolocalizacion(implementacion) {
  Object.defineProperty(window.navigator, 'geolocation', { value: implementacion, configurable: true });
}

describe('Utilidades geográficas', () => {
  it('calcula la distancia entre dos puntos de Valparaíso y Viña del Mar', () => {
    const kilometros = calcularDistanciaKm(CLINICA, { latitud: -33.0245, longitud: -71.5518 });
    expect(kilometros).toBeGreaterThan(5);
    expect(kilometros).toBeLessThan(7);
  });

  it('la distancia entre un punto y sí mismo es cero', () => {
    expect(calcularDistanciaKm(CLINICA, CLINICA)).toBeCloseTo(0, 5);
  });

  it('formatea metros y kilómetros en español', () => {
    expect(formatearDistancia(0.35)).toBe('350 m');
    expect(formatearDistancia(6.24)).toBe('6,2 km');
  });

  it('genera el enlace de indicaciones con y sin origen', () => {
    expect(enlaceIndicaciones(CLINICA)).toBe('https://www.openstreetmap.org/directions?route=%3B-33.044541%2C-71.615485');
    expect(enlaceIndicaciones(CLINICA, { latitud: 1, longitud: 2 })).toContain('route=1%2C2%3B-33.044541%2C-71.615485');
  });
});

describe('Indicaciones para llegar', () => {
  afterEach(() => {
    delete window.navigator.geolocation;
  });

  it('no solicita la ubicación hasta que la persona pulsa el botón y ofrece siempre la alternativa', () => {
    const obtener = vi.fn();
    simularGeolocalizacion({ getCurrentPosition: obtener });
    render(<IndicacionesLlegada destino={CLINICA} />);

    expect(obtener).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Ver indicaciones en OpenStreetMap' }).getAttribute('rel')).toContain('noopener');
  });

  it('con permiso concedido muestra la distancia y el enlace de ruta desde la ubicación', async () => {
    simularGeolocalizacion({
      getCurrentPosition: (exito) => exito({ coords: { latitude: -33.0245, longitude: -71.5518 } }),
    });
    render(<IndicacionesLlegada destino={CLINICA} />);

    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    expect(await screen.findByText(/en línea recta de la clínica/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver la ruta desde tu ubicación' }).getAttribute('href')).toContain('route=-33.0245%2C-71.5518');
  });

  it('con permiso denegado no usa la ubicación y mantiene la alternativa', async () => {
    simularGeolocalizacion({ getCurrentPosition: (_exito, error) => error({ code: 1 }) });
    render(<IndicacionesLlegada destino={CLINICA} />);

    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    expect(await screen.findByText(/porque no diste permiso/)).toBeTruthy();
    expect(screen.queryByText(/en línea recta/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver indicaciones en OpenStreetMap' })).toBeTruthy();
  });

  it('si el dispositivo no ofrece geolocalización informa y mantiene la alternativa', async () => {
    simularGeolocalizacion(undefined);
    render(<IndicacionesLlegada destino={CLINICA} />);

    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    expect(await screen.findByText(/No fue posible obtener tu ubicación/)).toBeTruthy();
  });

  it('un error de posición distinto de la denegación se informa como no disponible', async () => {
    simularGeolocalizacion({ getCurrentPosition: (_exito, error) => error({ code: 2 }) });
    render(<IndicacionesLlegada destino={CLINICA} />);

    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    expect(await screen.findByText(/No fue posible obtener tu ubicación/)).toBeTruthy();
  });
});
