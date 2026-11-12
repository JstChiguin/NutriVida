package cl.nutrivida.agenda.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record SolicitudReprogramacion(@NotNull Instant nuevoInicio, @NotBlank @Size(max = 500) String motivo) {
}
