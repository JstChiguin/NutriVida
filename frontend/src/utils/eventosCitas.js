export const EVENTO_CITAS_ACTUALIZADAS = 'nutrivida:citas-actualizadas';

export function notificarCitasActualizadas() {
  window.dispatchEvent(new Event(EVENTO_CITAS_ACTUALIZADAS));
}
