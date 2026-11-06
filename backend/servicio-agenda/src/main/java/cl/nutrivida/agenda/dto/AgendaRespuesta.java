package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Agenda;
import cl.nutrivida.agenda.modelo.Agenda.BloqueHorario;
import cl.nutrivida.agenda.modelo.Agenda.BloqueoAgenda;

import java.util.List;

public record AgendaRespuesta(String nutricionistaId, List<BloqueHorario> horariosSemanales,
                              List<BloqueoAgenda> bloqueos, boolean activa) {

    public static AgendaRespuesta desde(Agenda agenda) {
        return new AgendaRespuesta(agenda.id(), agenda.horariosSemanales(), agenda.bloqueos(), agenda.activa());
    }
}
