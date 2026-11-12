package cl.nutrivida.autenticacion.dto;

import jakarta.validation.constraints.NotNull;

public record SolicitudCambioEstado(@NotNull Boolean activo) {
}
