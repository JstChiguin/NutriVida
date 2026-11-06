package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Cita;
import cl.nutrivida.agenda.modelo.Cita.CambioEstado;
import cl.nutrivida.agenda.modelo.Cita.EstadoCita;

import java.time.Instant;
import java.util.List;

public record CitaRespuesta(
        String id,
        String pacienteId,
        String nombrePaciente,
        String nutricionistaId,
        String nombreNutricionista,
        String servicioId,
        String nombreServicio,
        int duracionMinutos,
        int precioReferencial,
        Instant inicio,
        Instant fin,
        String motivoConsulta,
        EstadoCita estado,
        boolean pagada,
        List<CambioEstado> historialEstados) {

    public static CitaRespuesta desde(Cita cita) {
        return new CitaRespuesta(cita.id(), cita.pacienteId(), cita.nombrePaciente(), cita.nutricionistaId(),
                cita.nombreNutricionista(), cita.servicioId(), cita.nombreServicio(), cita.duracionMinutos(),
                cita.precioReferencial(), cita.inicio(), cita.fin(), cita.motivoConsulta(), cita.estado(),
                cita.pagada(), cita.historialEstados());
    }
}
