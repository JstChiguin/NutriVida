package cl.nutrivida.autenticacion.dto;

import cl.nutrivida.comun.seguridad.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudCrearUsuario(
        @NotBlank @Size(min = 3, max = 120) String nombreCompleto,
        @NotBlank @Email @Size(max = 120) String correo,
        @NotBlank @Size(min = 8, max = 72)
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "La contraseña debe contener letras y números")
        String contrasena,
        @NotNull Rol rol) {
}
