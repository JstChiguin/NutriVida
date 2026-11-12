import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { solicitar } from '../src/servicios/clienteApi.js';
import { guardarSesionDePrueba, renderizarEn } from './ayudas.jsx';

function PantallaProtegida() {
  const [estado, setEstado] = useState('cargando');
  useEffect(() => {
    solicitar('clinico', 'GET', '/api/pacientes/yo').then(() => setEstado('listo')).catch(() => setEstado('error'));
  }, []);
  return <p>{estado}</p>;
}

describe('Sesión restaurada al recargar la página', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envía el token guardado en la primera consulta de una pantalla protegida', async () => {
    guardarSesionDePrueba('PACIENTE');
    renderizarEn(<PantallaProtegida />);

    await waitFor(() => expect(screen.getByText('listo')).toBeTruthy());

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-de-prueba');
  });
});
