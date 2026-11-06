package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.configuracion.PropiedadesAgenda;
import cl.nutrivida.agenda.dto.HorarioDisponible;
import cl.nutrivida.agenda.modelo.Agenda;
import cl.nutrivida.agenda.modelo.Agenda.BloqueHorario;
import cl.nutrivida.agenda.modelo.Agenda.BloqueoAgenda;
import cl.nutrivida.agenda.repositorio.RepositorioAgendas;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class ServicioDisponibilidad {

    private final RepositorioAgendas repositorioAgendas;
    private final ReservaDeBloques reservaDeBloques;
    private final Clock reloj;
    private final ZoneId zona;
    private final int pasoOfertaMinutos;

    public ServicioDisponibilidad(RepositorioAgendas repositorioAgendas, ReservaDeBloques reservaDeBloques, Clock reloj,
                                  PropiedadesAgenda propiedades) {
        this.repositorioAgendas = repositorioAgendas;
        this.reservaDeBloques = reservaDeBloques;
        this.reloj = reloj;
        this.zona = ZoneId.of(propiedades.zonaHoraria());
        this.pasoOfertaMinutos = propiedades.pasoOfertaMinutos();
    }

    public List<HorarioDisponible> consultarHorariosDelDia(String nutricionistaId, LocalDate fecha, int duracionMinutos) {
        Agenda agenda = repositorioAgendas.findById(nutricionistaId).filter(Agenda::activa).orElse(null);
        if (agenda == null) {
            return List.of();
        }
        Instant inicioDia = fecha.atStartOfDay(zona).toInstant();
        Instant finDia = fecha.plusDays(1).atStartOfDay(zona).toInstant();
        Set<Instant> ocupados = reservaDeBloques.consultarBloquesOcupados(nutricionistaId, inicioDia, finDia, null);
        List<HorarioDisponible> disponibles = new ArrayList<>();
        for (BloqueHorario ventana : ventanasDelDia(agenda, fecha)) {
            Instant inicioVentana = fecha.atTime(LocalTime.parse(ventana.horaInicio())).atZone(zona).toInstant();
            Instant finVentana = fecha.atTime(LocalTime.parse(ventana.horaFin())).atZone(zona).toInstant();
            for (Instant candidato = inicioVentana;
                 !Calendario.sumarMinutos(candidato, duracionMinutos).isAfter(finVentana);
                 candidato = Calendario.sumarMinutos(candidato, pasoOfertaMinutos)) {
                Instant fin = Calendario.sumarMinutos(candidato, duracionMinutos);
                if (candidato.isAfter(reloj.instant()) && !chocaConBloqueo(agenda, candidato, fin)
                        && bloquesLibres(ocupados, candidato, fin)) {
                    disponibles.add(new HorarioDisponible(candidato, fin));
                }
            }
        }
        return disponibles;
    }

    public void exigirHorarioReservable(String nutricionistaId, Instant inicio, int duracionMinutos,
                                        String citaIgnoradaId) {
        Instant fin = Calendario.sumarMinutos(inicio, duracionMinutos);
        if (!inicio.isAfter(reloj.instant())) {
            throw new SolicitudInvalida("No es posible reservar en una fecha y hora pasadas");
        }
        if (!Calendario.estaAlineadoAlBloque(inicio, zona)) {
            throw new SolicitudInvalida("La hora debe comenzar en múltiplos de " + Calendario.BLOQUE_MINUTOS + " minutos");
        }
        Agenda agenda = repositorioAgendas.findById(nutricionistaId).filter(Agenda::activa)
                .orElseThrow(() -> new ConflictoDeNegocio("El profesional no tiene agenda disponible"));
        if (!estaDentroDeUnaVentana(agenda, inicio, fin)) {
            throw new ConflictoDeNegocio("El horario está fuera de la jornada de atención del profesional");
        }
        if (chocaConBloqueo(agenda, inicio, fin)) {
            throw new ConflictoDeNegocio("El profesional no atiende en ese horario por un bloqueo o ausencia");
        }
        Set<Instant> ocupados = reservaDeBloques.consultarBloquesOcupados(nutricionistaId, inicio, fin, citaIgnoradaId);
        if (!bloquesLibres(ocupados, inicio, fin)) {
            throw new ConflictoDeNegocio("El horario seleccionado ya no está disponible");
        }
    }

    private boolean estaDentroDeUnaVentana(Agenda agenda, Instant inicio, Instant fin) {
        LocalDate fecha = inicio.atZone(zona).toLocalDate();
        return ventanasDelDia(agenda, fecha).stream().anyMatch(ventana -> {
            Instant inicioVentana = fecha.atTime(LocalTime.parse(ventana.horaInicio())).atZone(zona).toInstant();
            Instant finVentana = fecha.atTime(LocalTime.parse(ventana.horaFin())).atZone(zona).toInstant();
            return !inicio.isBefore(inicioVentana) && !fin.isAfter(finVentana);
        });
    }

    private List<BloqueHorario> ventanasDelDia(Agenda agenda, LocalDate fecha) {
        return agenda.horariosSemanales().stream().filter(ventana -> ventana.dia() == fecha.getDayOfWeek()).toList();
    }

    private boolean chocaConBloqueo(Agenda agenda, Instant inicio, Instant fin) {
        return agenda.bloqueos().stream()
                .anyMatch((BloqueoAgenda bloqueo) -> Calendario.seSuperponen(inicio, fin, bloqueo.inicio(), bloqueo.fin()));
    }

    private boolean bloquesLibres(Set<Instant> ocupados, Instant inicio, Instant fin) {
        return reservaDeBloques.calcularBloques(inicio, fin).stream().noneMatch(ocupados::contains);
    }
}
