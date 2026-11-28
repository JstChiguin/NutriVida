import { useState } from 'react';
import { calcularDistanciaKm, enlaceIndicaciones, formatearDistancia } from '../../utils/geografia.js';

export default function IndicacionesLlegada({ destino }) {
  const [estado, setEstado] = useState({ tipo: 'inicial' });

  const solicitarUbicacion = () => {
    if (!navigator.geolocation) {
      setEstado({ tipo: 'no-disponible' });
      return;
    }
    setEstado({ tipo: 'consultando' });
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const origen = { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
        setEstado({ tipo: 'obtenida', origen, distancia: calcularDistanciaKm(origen, destino) });
      },
      (error) => setEstado({ tipo: error.code === 1 ? 'denegada' : 'no-disponible' }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className="indicaciones-llegada mt-3" aria-live="polite">
      <h3 className="h6 fw-bold">Cómo llegar</h3>
      <p className="small mb-2">
        Puedes ver la ruta indicando tu punto de partida en OpenStreetMap, o permitir que tu navegador calcule
        la distancia desde tu ubicación. Tu ubicación solo se usa en tu navegador y no se envía a NutriVida.
      </p>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <button type="button" className="boton boton-contorno" onClick={solicitarUbicacion} disabled={estado.tipo === 'consultando'}>
          {estado.tipo === 'consultando' ? 'Solicitando permiso…' : 'Usar mi ubicación'}
        </button>
        <a className="boton boton-contorno" href={enlaceIndicaciones(destino)} target="_blank" rel="noopener noreferrer">
          Ver indicaciones en OpenStreetMap
        </a>
      </div>
      {estado.tipo === 'obtenida' && (
        <p className="mt-2 mb-0 small" role="status">
          Estás a {formatearDistancia(estado.distancia)} en línea recta de la clínica.{' '}
          <a href={enlaceIndicaciones(destino, estado.origen)} target="_blank" rel="noopener noreferrer">
            Ver la ruta desde tu ubicación
          </a>{' '}
          (al abrir el enlace, tus coordenadas se envían a OpenStreetMap).
        </p>
      )}
      {estado.tipo === 'denegada' && (
        <p className="mt-2 mb-0 small" role="status">
          No se usó tu ubicación porque no diste permiso. Puedes ver las indicaciones escribiendo tu punto de partida en OpenStreetMap.
        </p>
      )}
      {estado.tipo === 'no-disponible' && (
        <p className="mt-2 mb-0 small" role="status">
          No fue posible obtener tu ubicación en este dispositivo. Usa el enlace de indicaciones para ver la ruta.
        </p>
      )}
    </div>
  );
}
