package cl.nutrivida.autenticacion.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudActualizarUsuario(
        @NotBlank @Size(min = 3, max = 120) String nombreCompleto,
        @NotBlank @Email @Size(max = 120) String correo) {
}
