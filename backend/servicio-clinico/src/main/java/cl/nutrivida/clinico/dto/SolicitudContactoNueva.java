package cl.nutrivida.clinico.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudContactoNueva(
        @NotBlank @Size(min = 3, max = 120) String nombre,
        @NotBlank @Email @Size(max = 120) String correo,
        @Pattern(regexp = "^\\+?\\d{8,12}$", message = "El teléfono debe tener entre 8 y 12 dígitos") String telefono,
        @NotBlank @Size(min = 10, max = 1000) String mensaje) {
}
