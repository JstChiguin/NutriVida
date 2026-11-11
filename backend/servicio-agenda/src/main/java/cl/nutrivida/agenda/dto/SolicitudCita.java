package cl.nutrivida.agenda.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record SolicitudCita(
        @NotBlank String nutricionistaId,
        @NotBlank String servicioId,
        @NotNull Instant inicio,
        @NotBlank @Size(max = 500) String motivoConsulta,
        String pacienteId) {
}
