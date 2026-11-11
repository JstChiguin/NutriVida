package cl.nutrivida.clinico.dto;

import cl.nutrivida.comun.validacion.RutValido;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SolicitudPerfilPaciente(
        @NotBlank String usuarioId,
        @NotBlank @Size(min = 3, max = 120) String nombreCompleto,
        @NotBlank @Email String correo,
        @RutValido String rut,
        String telefono,
        LocalDate fechaNacimiento) {
}
