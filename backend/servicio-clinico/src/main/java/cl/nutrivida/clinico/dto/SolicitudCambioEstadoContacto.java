package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.SolicitudContacto.EstadoSolicitud;
import jakarta.validation.constraints.NotNull;

public record SolicitudCambioEstadoContacto(@NotNull EstadoSolicitud estado) {
}
