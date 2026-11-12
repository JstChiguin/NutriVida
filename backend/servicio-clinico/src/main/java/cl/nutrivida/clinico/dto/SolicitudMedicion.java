package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public record SolicitudMedicion(
        @NotNull @DecimalMin(value = "2.0", message = "El peso mínimo es 2 kg")
        @DecimalMax(value = "400.0", message = "El peso máximo es 400 kg") Double pesoKg,
        @DecimalMin(value = "40.0", message = "La estatura mínima es 40 cm")
        @DecimalMax(value = "250.0", message = "La estatura máxima es 250 cm") Double estaturaCm,
        @DecimalMin(value = "20.0") @DecimalMax(value = "250.0") Double cinturaCm,
        @Size(max = 10) Map<String, Double> otrasMediciones,
        @Size(max = 1000) String observaciones,
        Instant fecha) {
}
