package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.NotNull;

public record SolicitudCambioEstado(@NotNull Boolean activo) {
}
