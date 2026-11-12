package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.Paciente;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PacienteRespuesta(
        String id,
        String usuarioId,
        String nombreCompleto,
        String rut,
        String correo,
        String telefono,
        LocalDate fechaNacimiento,
        String sexo,
        String direccion,
        boolean activo,
        List<String> nutricionistasAutorizados,
        Instant creadoEn) {

    public static PacienteRespuesta desde(Paciente paciente) {
        LocalDate fechaNacimiento = paciente.fechaNacimiento() == null ? null : LocalDate.parse(paciente.fechaNacimiento());
        return new PacienteRespuesta(paciente.id(), paciente.usuarioId(), paciente.nombreCompleto(), paciente.rut(),
                paciente.correo(), paciente.telefono(), fechaNacimiento, paciente.sexo(), paciente.direccion(),
                paciente.activo(), paciente.nutricionistasAutorizados(), paciente.creadoEn());
    }
}
