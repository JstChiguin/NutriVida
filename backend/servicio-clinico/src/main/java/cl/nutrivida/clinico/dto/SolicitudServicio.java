package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudServicio(
        @NotBlank @Size(min = 3, max = 100) String nombre,
        @NotBlank @Size(max = 500) String descripcion,
        @NotBlank @Size(max = 60) String categoria,
        @Min(15) @Max(180) int duracionMinutos,
        @Min(0) @Max(1000000) int precioReferencial) {
}
