package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Agenda.BloqueHorario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SolicitudHorarios(@NotNull List<@Valid BloqueHorario> horarios) {
}
