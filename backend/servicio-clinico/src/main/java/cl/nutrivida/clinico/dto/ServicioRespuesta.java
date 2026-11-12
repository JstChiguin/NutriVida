package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.ServicioNutricional;

public record ServicioRespuesta(
        String id,
        String nombre,
        String descripcion,
        String categoria,
        int duracionMinutos,
        int precioReferencial,
        boolean activo) {

    public static ServicioRespuesta desde(ServicioNutricional servicio) {
        return new ServicioRespuesta(servicio.id(), servicio.nombre(), servicio.descripcion(), servicio.categoria(),
                servicio.duracionMinutos(), servicio.precioReferencial(), servicio.activo());
    }
}
