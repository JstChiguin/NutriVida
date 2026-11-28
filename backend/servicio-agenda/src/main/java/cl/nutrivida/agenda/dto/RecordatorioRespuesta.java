package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Cita;

import java.time.Duration;
import java.time.Instant;

public record RecordatorioRespuesta(String citaId, String nombreServicio, String nombreNutricionista, Instant inicio,
                                    long minutosRestantes) {

    public static RecordatorioRespuesta desde(Cita cita, Instant ahora) {
        return new RecordatorioRespuesta(cita.id(), cita.nombreServicio(), cita.nombreNutricionista(), cita.inicio(),
                Duration.between(ahora, cita.inicio()).toMinutes());
    }
}
