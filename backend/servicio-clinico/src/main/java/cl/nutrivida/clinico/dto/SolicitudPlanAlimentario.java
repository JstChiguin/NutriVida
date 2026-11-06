package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.PlanAlimentario.Comida;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record SolicitudPlanAlimentario(
        @NotEmpty List<@NotBlank @Size(max = 300) String> objetivos,
        @NotEmpty @Valid List<Comida> comidas,
        @Size(max = 3000) String recomendacionesGenerales,
        LocalDate vigenteDesde,
        LocalDate vigenteHasta) {
}
