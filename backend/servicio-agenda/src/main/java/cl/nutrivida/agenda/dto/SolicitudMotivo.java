package cl.nutrivida.agenda.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudMotivo(@NotBlank @Size(max = 500) String motivo) {
}
