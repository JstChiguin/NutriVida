package cl.nutrivida.autenticacion.dto;

import java.time.LocalDate;

public record SolicitudPerfilPaciente(
        String usuarioId,
        String nombreCompleto,
        String correo,
        String rut,
        String telefono,
        LocalDate fechaNacimiento) {
}
