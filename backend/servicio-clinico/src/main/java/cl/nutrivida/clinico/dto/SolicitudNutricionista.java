package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SolicitudNutricionista(
        String usuarioId,
        @NotBlank @Size(min = 3, max = 120) String nombreCompleto,
        @Size(max = 120) String titulo,
        @NotEmpty List<@NotBlank @Size(max = 120) String> especialidades,
        @Size(max = 1000) String biografia,
        @Size(max = 300) String fotoUrl,
        List<@NotBlank String> serviciosIds) {
}
