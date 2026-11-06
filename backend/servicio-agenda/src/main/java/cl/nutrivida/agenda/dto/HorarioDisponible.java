package cl.nutrivida.agenda.dto;

import java.time.Instant;

public record HorarioDisponible(Instant inicio, Instant fin) {
}
