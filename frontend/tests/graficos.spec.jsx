import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraficoBarras } from '../src/components/ui/GraficoBarras.jsx';
import { GraficoLineas } from '../src/components/ui/GraficoLineas.jsx';
import { convertirFechaAInstante, formatearPrecio } from '../src/utils/formatos.js';
import { interpretarComidas } from '../src/utils/planes.js';

describe('Gráficos y utilidades de presentación', () => {
  it('dibuja una barra proporcional por cada dato', () => {
    render(<GraficoBarras titulo="Citas por estado" datos={[
      { etiqueta: 'Confirmada', valor: 4 }, { etiqueta: 'Cancelada', valor: 2 },
    ]} />);

    expect(screen.getByLabelText('Citas por estado')).toBeTruthy();
    expect(screen.getByText('Confirmada')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('muestra un mensaje cuando el gráfico de líneas no tiene puntos', () => {
    render(<GraficoLineas titulo="Peso" puntos={[]} />);

    expect(screen.getByText('Aún no hay mediciones registradas.')).toBeTruthy();
  });

  it('dibuja los puntos del gráfico de líneas con sus valores', () => {
    render(<GraficoLineas titulo="Evolución del peso" unidad=" kg" puntos={[
      { etiqueta: 'ene', valor: 80 }, { etiqueta: 'feb', valor: 78.5 },
    ]} />);

    expect(screen.getByRole('img', { name: 'Evolución del peso' })).toBeTruthy();
    expect(screen.getByText('80 kg')).toBeTruthy();
    expect(screen.getByText('78.5 kg')).toBeTruthy();
  });

  it('formatea precios en pesos chilenos', () => {
    expect(formatearPrecio(25000)).toContain('25.000');
  });

  it('convierte fechas de filtro en instantes ISO e incluye el día completo del límite superior', () => {
    expect(convertirFechaAInstante('')).toBeUndefined();
    const inicio = new Date(convertirFechaAInstante('2026-11-03'));
    const fin = new Date(convertirFechaAInstante('2026-11-03', true));
    expect(fin.getTime() - inicio.getTime()).toBeGreaterThanOrEqual(23 * 3600 * 1000);
  });

  it('interpreta el texto del editor de planes en comidas con alimentos', () => {
    const comidas = interpretarComidas('Desayuno | 08:00 | Avena, 40, g | Leche, 200, ml\nColación');

    expect(comidas).toEqual([
      { nombre: 'Desayuno', horario: '08:00', alimentos: [
        { alimento: 'Avena', cantidad: 40, unidad: 'g' }, { alimento: 'Leche', cantidad: 200, unidad: 'ml' }] },
      { nombre: 'Colación', horario: null, alimentos: [] },
    ]);
  });
});
