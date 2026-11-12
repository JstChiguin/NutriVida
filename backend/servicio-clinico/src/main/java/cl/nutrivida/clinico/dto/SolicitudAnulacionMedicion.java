package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudAnulacionMedicion(@NotBlank @Size(max = 500) String motivo) {
}
