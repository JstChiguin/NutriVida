import { useCallback, useEffect, useState } from 'react';
import { useAutenticacion } from '../../hooks/useAutenticacion.js';
import { agendaApi } from '../../servicios/agendaApi.js';
import { EVENTO_CITAS_ACTUALIZADAS } from '../../utils/eventosCitas.js';
import { formatearFechaHora } from '../../utils/formatos.js';

export const INTERVALO_RECORDATORIOS_MS = 5 * 60 * 1000;

export default function AvisoRecordatorios() {
  const { usuario } = useAutenticacion();
  const esPaciente = usuario?.rol === 'PACIENTE';
  const usuarioId = usuario?.id;
  const [recordatorios, setRecordatorios] = useState([]);

  const actualizar = useCallback(() => {
    agendaApi.listarRecordatorios()
      .then((datos) => setRecordatorios(Array.isArray(datos) ? datos : []))
      .catch(() => setRecordatorios([]));
  }, []);

  useEffect(() => {
    if (!esPaciente) {
      return undefined;
    }
    actualizar();
    const temporizador = setInterval(actualizar, INTERVALO_RECORDATORIOS_MS);
    const alVolverVisible = () => {
      if (document.visibilityState === 'visible') {
        actualizar();
      }
    };
    window.addEventListener('focus', actualizar);
    window.addEventListener(EVENTO_CITAS_ACTUALIZADAS, actualizar);
    document.addEventListener('visibilitychange', alVolverVisible);
    return () => {
      clearInterval(temporizador);
      window.removeEventListener('focus', actualizar);
      window.removeEventListener(EVENTO_CITAS_ACTUALIZADAS, actualizar);
      document.removeEventListener('visibilitychange', alVolverVisible);
    };
  }, [esPaciente, usuarioId, actualizar]);

  if (!esPaciente || recordatorios.length === 0) {
    return null;
  }

  return (
    <section className="aviso-recordatorios container mt-3" role="status" aria-live="polite" aria-label="Recordatorios de citas">
      <div className="alert alert-warning mb-0">
        <h2 className="h6 fw-bold mb-1">Recordatorios</h2>
        <ul className="mb-0 small">
          {recordatorios.map((recordatorio) => (
            <li key={recordatorio.citaId}>
              Tienes {recordatorio.nombreServicio} con {recordatorio.nombreNutricionista} el {formatearFechaHora(recordatorio.inicio)}.
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
