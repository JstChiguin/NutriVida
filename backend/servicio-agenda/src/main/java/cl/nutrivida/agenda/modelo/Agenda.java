package cl.nutrivida.agenda.modelo;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "agendas")
public record Agenda(
        @Id String id,
        List<BloqueHorario> horariosSemanales,
        List<BloqueoAgenda> bloqueos,
        boolean activa,
        Instant actualizadaEn,
        @Version Long version) {

    public Agenda {
        horariosSemanales = horariosSemanales == null ? new ArrayList<>() : horariosSemanales;
        bloqueos = bloqueos == null ? new ArrayList<>() : bloqueos;
    }

    public enum TipoBloqueo {
        BLOQUEO,
        AUSENCIA
    }

    public record BloqueHorario(
            @NotNull DayOfWeek dia,
            @NotNull @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "Use el formato HH:mm") String horaInicio,
            @NotNull @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "Use el formato HH:mm") String horaFin) {
    }

    public record BloqueoAgenda(String identificador, Instant inicio, Instant fin, String motivo, TipoBloqueo tipo) {
    }

    public Agenda conHorarios(List<BloqueHorario> nuevosHorarios) {
        return new Agenda(id, nuevosHorarios, bloqueos, activa, Instant.now(), version);
    }

    public Agenda conBloqueos(List<BloqueoAgenda> nuevosBloqueos) {
        return new Agenda(id, horariosSemanales, nuevosBloqueos, activa, Instant.now(), version);
    }
}
