package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.SolicitudContacto;
import cl.nutrivida.clinico.modelo.SolicitudContacto.EstadoSolicitud;

import java.time.Instant;

public record SolicitudContactoRespuesta(
        String id,
        String nombre,
        String correo,
        String telefono,
        String mensaje,
        EstadoSolicitud estado,
        Instant creadoEn) {

    public static SolicitudContactoRespuesta desde(SolicitudContacto solicitud) {
        return new SolicitudContactoRespuesta(solicitud.id(), solicitud.nombre(), solicitud.correo(),
                solicitud.telefono(), solicitud.mensaje(), solicitud.estado(), solicitud.creadoEn());
    }
}
