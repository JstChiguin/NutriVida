package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Agenda.TipoBloqueo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record SolicitudBloqueo(
        @NotNull Instant inicio,
        @NotNull Instant fin,
        @NotBlank @Size(max = 300) String motivo,
        @NotNull TipoBloqueo tipo) {
}
