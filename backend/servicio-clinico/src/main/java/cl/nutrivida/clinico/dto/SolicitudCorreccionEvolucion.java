package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudCorreccionEvolucion(
        @NotBlank @Size(max = 3000) String descripcion,
        @Size(max = 3000) String indicaciones,
        @NotBlank @Size(max = 500) String motivoCorreccion) {
}
