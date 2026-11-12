
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const UBICACION_CLINICA = {
    latitud: -33.044541,
    longitud: -71.615485,
    direccion: 'Av. Brasil 2021, Valparaíso',
};

export default function MapaReferencial() {
    const contenedorMapa = useRef(null);

    useEffect(() => {
        if (!contenedorMapa.current) return;

        const coordenadas = [
            UBICACION_CLINICA.latitud,
            UBICACION_CLINICA.longitud,
        ];

        const mapa = L.map(contenedorMapa.current).setView(coordenadas, 16);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                referrerPolicy: 'strict-origin-when-cross-origin',
                attribution:
                    '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team, OpenStreetMap France',
            }
        ).addTo(mapa);


        const iconoClinica = L.divIcon({
            className: 'icono-pin-clinica',
            html: '<div class="pin-clinica"><span>🏥</span></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -34],
        });

        L.marker(coordenadas, { icon: iconoClinica })
            .addTo(mapa)
            .bindPopup(`
        <strong>Clínica NutriVida</strong>
        <p>${UBICACION_CLINICA.direccion}</p>
        <small>Ubicación referencial del proyecto académico.</small>
      `);

        return () => mapa.remove();
    }, []);

    return (
        <section
            id="ubicacion"
            className="ubicacion-contacto"
            aria-labelledby="titulo-ubicacion"
        >
            <div className="ubicacion-contacto-info">
                <h2 id="titulo-ubicacion">¿Dónde estamos?</h2>
                <p>{UBICACION_CLINICA.direccion}</p>
                <p className="ubicacion-contacto-aviso">
                    Ubicación utilizada para la demostración académica.
                </p>
            </div>

            <div
                ref={contenedorMapa}
                className="mapa-interactivo"
                role="region"
                aria-label="Mapa de ubicación de Clínica NutriVida"
            />
        </section>
    );
}
