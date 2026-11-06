package cl.nutrivida.clinico.dto;

import cl.nutrivida.comun.validacion.RutValido;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SolicitudActualizarPaciente(
        @NotBlank @Size(min = 3, max = 120) String nombreCompleto,
        @RutValido String rut,
        @Pattern(regexp = "^\\+?\\d{8,12}$", message = "El teléfono debe tener entre 8 y 12 dígitos") String telefono,
        @Past LocalDate fechaNacimiento,
        @Pattern(regexp = "^(FEMENINO|MASCULINO|OTRO|NO_INFORMA)$", message = "Sexo no válido") String sexo,
        @Size(max = 200) String direccion) {
}
