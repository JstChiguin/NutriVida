package cl.nutrivida.autenticacion.dto;

import cl.nutrivida.comun.validacion.RutValido;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SolicitudRegistroPaciente(
        @NotBlank @Size(min = 3, max = 120) String nombreCompleto,
        @NotBlank @Email @Size(max = 120) String correo,
        @NotBlank @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "La contraseña debe contener letras y números")
        String contrasena,
        @RutValido String rut,
        @Pattern(regexp = "^\\+?\\d{8,12}$", message = "El teléfono debe tener entre 8 y 12 dígitos") String telefono,
        @Past LocalDate fechaNacimiento) {
}
