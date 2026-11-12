package cl.nutrivida.clinico.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SolicitudActualizarFicha(
        @NotNull @Valid DatosFichaClinica datos,
        @NotBlank @Size(max = 500) String motivoCambio) {
}
