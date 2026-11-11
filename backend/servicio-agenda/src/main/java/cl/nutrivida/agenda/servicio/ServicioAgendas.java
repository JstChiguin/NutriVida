package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.clinico.ClienteClinico;
import cl.nutrivida.agenda.dto.AgendaRespuesta;
import cl.nutrivida.agenda.dto.HorarioDisponible;
import cl.nutrivida.agenda.dto.SolicitudBloqueo;
import cl.nutrivida.agenda.dto.SolicitudHorarios;
import cl.nutrivida.agenda.modelo.Agenda;
import cl.nutrivida.agenda.modelo.Agenda.BloqueHorario;
import cl.nutrivida.agenda.modelo.Agenda.BloqueoAgenda;
import cl.nutrivida.agenda.modelo.Cita.EstadoCita;
import cl.nutrivida.agenda.repositorio.RepositorioAgendas;
import cl.nutrivida.agenda.repositorio.RepositorioCitas;
import cl.nutrivida.agenda.servicio.IdentidadSolicitante.Contexto;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ServicioAgendas {

    private static final int MAXIMO_DIAS_CONSULTA = 14;

    private final RepositorioAgendas repositorioAgendas;
    private final RepositorioCitas repositorioCitas;
    private final ServicioDisponibilidad servicioDisponibilidad;
    private final IdentidadSolicitante identidadSolicitante;
    private final ClienteClinico clienteClinico;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioAgendas(RepositorioAgendas repositorioAgendas, RepositorioCitas repositorioCitas,
                           ServicioDisponibilidad servicioDisponibilidad, IdentidadSolicitante identidadSolicitante,
                           ClienteClinico clienteClinico, ServicioAuditoria servicioAuditoria) {
        this.repositorioAgendas = repositorioAgendas;
        this.repositorioCitas = repositorioCitas;
        this.servicioDisponibilidad = servicioDisponibilidad;
        this.identidadSolicitante = identidadSolicitante;
        this.clienteClinico = clienteClinico;
        this.servicioAuditoria = servicioAuditoria;
    }

    public AgendaRespuesta consultarAgenda(UsuarioAutenticado usuario, String nutricionistaId) {
        exigirGestion(usuario, nutricionistaId);
        Agenda agenda = repositorioAgendas.findById(nutricionistaId)
                .orElseThrow(() -> new RecursoNoEncontrado("El profesional aún no tiene agenda configurada"));
        return AgendaRespuesta.desde(agenda);
    }

    public AgendaRespuesta definirHorarios(UsuarioAutenticado usuario, String nutricionistaId, SolicitudHorarios solicitud) {
        exigirGestion(usuario, nutricionistaId);
        validarHorarios(solicitud.horarios());
        Agenda agenda = repositorioAgendas.findById(nutricionistaId).orElse(null);
        if (agenda == null) {
            clienteClinico.consultarNutricionista(nutricionistaId);
            agenda = new Agenda(nutricionistaId, solicitud.horarios(), null, true, Instant.now(), null);
        } else {
            agenda = agenda.conHorarios(solicitud.horarios());
        }
        Agenda guardada = repositorioAgendas.save(agenda);
        servicioAuditoria.registrar("agendas", nutricionistaId, "DEFINIR_HORARIOS", usuario, Map.of());
        return AgendaRespuesta.desde(guardada);
    }

    public AgendaRespuesta agregarBloqueo(UsuarioAutenticado usuario, String nutricionistaId, SolicitudBloqueo solicitud) {
        exigirGestion(usuario, nutricionistaId);
        if (!solicitud.fin().isAfter(solicitud.inicio())) {
            throw new SolicitudInvalida("El bloqueo debe terminar después de su inicio");
        }
        Agenda agenda = repositorioAgendas.findById(nutricionistaId)
                .orElseThrow(() -> new RecursoNoEncontrado("El profesional aún no tiene agenda configurada"));
        long citasAfectadas = repositorioCitas.findByNutricionistaIdAndEstadoInAndInicioLessThanAndFinGreaterThan(
                nutricionistaId, EnumSet.of(EstadoCita.SOLICITADA, EstadoCita.CONFIRMADA), solicitud.fin(),
                solicitud.inicio()).size();
        if (citasAfectadas > 0) {
            throw new ConflictoDeNegocio("El bloqueo afecta " + citasAfectadas + " cita(s) activa(s); reprográmelas antes");
        }
        List<BloqueoAgenda> bloqueos = new ArrayList<>(agenda.bloqueos());
        bloqueos.add(new BloqueoAgenda(UUID.randomUUID().toString(), solicitud.inicio(), solicitud.fin(),
                solicitud.motivo(), solicitud.tipo()));
        Agenda guardada = repositorioAgendas.save(agenda.conBloqueos(bloqueos));
        servicioAuditoria.registrar("agendas", nutricionistaId, "AGREGAR_BLOQUEO", usuario,
                Map.of("tipo", solicitud.tipo().name()));
        return AgendaRespuesta.desde(guardada);
    }

    public AgendaRespuesta quitarBloqueo(UsuarioAutenticado usuario, String nutricionistaId, String bloqueoId) {
        exigirGestion(usuario, nutricionistaId);
        Agenda agenda = repositorioAgendas.findById(nutricionistaId)
                .orElseThrow(() -> new RecursoNoEncontrado("El profesional aún no tiene agenda configurada"));
        List<BloqueoAgenda> restantes = agenda.bloqueos().stream()
                .filter(bloqueo -> !bloqueo.identificador().equals(bloqueoId)).toList();
        if (restantes.size() == agenda.bloqueos().size()) {
            throw new RecursoNoEncontrado("No existe el bloqueo indicado");
        }
        Agenda guardada = repositorioAgendas.save(agenda.conBloqueos(new ArrayList<>(restantes)));
        servicioAuditoria.registrar("agendas", nutricionistaId, "QUITAR_BLOQUEO", usuario, Map.of());
        return AgendaRespuesta.desde(guardada);
    }

    public List<DisponibilidadDiaria> consultarDisponibilidad(String nutricionistaId, int duracionMinutos,
                                                                LocalDate desde, int dias) {
        if (dias < 1 || dias > MAXIMO_DIAS_CONSULTA) {
            throw new SolicitudInvalida("La consulta admite entre 1 y " + MAXIMO_DIAS_CONSULTA + " días");
        }
        List<DisponibilidadDiaria> semana = new ArrayList<>();
        for (int desplazamiento = 0; desplazamiento < dias; desplazamiento++) {
            LocalDate fecha = desde.plusDays(desplazamiento);
            List<HorarioDisponible> horarios = servicioDisponibilidad
                    .consultarHorariosDelDia(nutricionistaId, fecha, duracionMinutos).stream()
                    .sorted(Comparator.comparing(HorarioDisponible::inicio)).toList();
            semana.add(new DisponibilidadDiaria(fecha, horarios));
        }
        return semana;
    }

    private void exigirGestion(UsuarioAutenticado usuario, String nutricionistaId) {
        Contexto contexto = identidadSolicitante.resolver(usuario);
        if (!contexto.puedeGestionarAgendaDe(nutricionistaId)) {
            throw new PermisoDenegado("Solo el profesional o un administrador pueden gestionar esta agenda");
        }
    }

    private void validarHorarios(List<BloqueHorario> horarios) {
        for (BloqueHorario horario : horarios) {
            LocalTime inicio = LocalTime.parse(horario.horaInicio());
            LocalTime fin = LocalTime.parse(horario.horaFin());
            if (!fin.isAfter(inicio)) {
                throw new SolicitudInvalida("La hora de término debe ser posterior a la de inicio");
            }
            if (inicio.getMinute() % Calendario.BLOQUE_MINUTOS != 0 || fin.getMinute() % Calendario.BLOQUE_MINUTOS != 0) {
                throw new SolicitudInvalida("Los horarios deben ser múltiplos de " + Calendario.BLOQUE_MINUTOS + " minutos");
            }
        }
        for (int primero = 0; primero < horarios.size(); primero++) {
            for (int segundo = primero + 1; segundo < horarios.size(); segundo++) {
                if (seSuperponenEnElMismoDia(horarios.get(primero), horarios.get(segundo))) {
                    throw new SolicitudInvalida("Existen bloques horarios superpuestos el mismo día");
                }
            }
        }
    }

    private boolean seSuperponenEnElMismoDia(BloqueHorario a, BloqueHorario b) {
        return a.dia() == b.dia()
                && LocalTime.parse(a.horaInicio()).isBefore(LocalTime.parse(b.horaFin()))
                && LocalTime.parse(a.horaFin()).isAfter(LocalTime.parse(b.horaInicio()));
    }

    public record DisponibilidadDiaria(LocalDate fecha, List<HorarioDisponible> horarios) {
    }
}
