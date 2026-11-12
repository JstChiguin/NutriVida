package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.clinico.ClienteClinico;
import cl.nutrivida.agenda.clinico.ResumenNutricionista;
import cl.nutrivida.agenda.clinico.ResumenPaciente;
import cl.nutrivida.agenda.clinico.ResumenServicio;
import cl.nutrivida.agenda.configuracion.PropiedadesAgenda;
import cl.nutrivida.agenda.dto.CitaRespuesta;
import cl.nutrivida.agenda.dto.SolicitudCita;
import cl.nutrivida.agenda.modelo.Cita;
import cl.nutrivida.agenda.modelo.Cita.CambioEstado;
import cl.nutrivida.agenda.modelo.Cita.EstadoCita;
import cl.nutrivida.agenda.modelo.Cita.EventoCita;
import cl.nutrivida.agenda.repositorio.RepositorioCitas;
import cl.nutrivida.agenda.servicio.IdentidadSolicitante.Contexto;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Map;

@Service
public class ServicioCitas {

    private static final EnumSet<EstadoCita> ESTADOS_ACTIVOS = EnumSet.of(EstadoCita.SOLICITADA, EstadoCita.CONFIRMADA);

    private final RepositorioCitas repositorioCitas;
    private final MongoTemplate plantillaMongo;
    private final ClienteClinico clienteClinico;
    private final ServicioDisponibilidad servicioDisponibilidad;
    private final ReservaDeBloques reservaDeBloques;
    private final IdentidadSolicitante identidadSolicitante;
    private final ServicioAuditoria servicioAuditoria;
    private final Clock reloj;
    private final Duration anticipacionMinimaPaciente;

    public ServicioCitas(RepositorioCitas repositorioCitas, MongoTemplate plantillaMongo, ClienteClinico clienteClinico,
                         ServicioDisponibilidad servicioDisponibilidad, ReservaDeBloques reservaDeBloques,
                         IdentidadSolicitante identidadSolicitante, ServicioAuditoria servicioAuditoria, Clock reloj,
                         PropiedadesAgenda propiedades) {
        this.repositorioCitas = repositorioCitas;
        this.plantillaMongo = plantillaMongo;
        this.clienteClinico = clienteClinico;
        this.servicioDisponibilidad = servicioDisponibilidad;
        this.reservaDeBloques = reservaDeBloques;
        this.identidadSolicitante = identidadSolicitante;
        this.servicioAuditoria = servicioAuditoria;
        this.reloj = reloj;
        this.anticipacionMinimaPaciente = Duration.ofHours(propiedades.horasMinimasCancelacion());
    }

    public CitaRespuesta solicitarCita(UsuarioAutenticado usuario, SolicitudCita solicitud) {
        ResumenPaciente paciente = resolverPaciente(usuario, solicitud.pacienteId());
        ResumenServicio servicio = clienteClinico.consultarServicio(solicitud.servicioId());
        ResumenNutricionista nutricionista = clienteClinico.consultarNutricionista(solicitud.nutricionistaId());
        validarOferta(paciente, servicio, nutricionista);
        Instant fin = Calendario.sumarMinutos(solicitud.inicio(), servicio.duracionMinutos());
        servicioDisponibilidad.exigirHorarioReservable(nutricionista.id(), solicitud.inicio(), servicio.duracionMinutos(), null);
        exigirPacienteSinCitasSuperpuestas(paciente.id(), solicitud.inicio(), fin, null);
        String citaId = new ObjectId().toHexString();
        reservaDeBloques.reservar(citaId, nutricionista.id(), solicitud.inicio(), fin);
        try {
            Instant ahora = reloj.instant();
            CambioEstado cambioInicial = new CambioEstado(EventoCita.SOLICITUD, EstadoCita.SOLICITADA, ahora,
                    usuario.usuarioId(), solicitud.motivoConsulta());
            Cita guardada = repositorioCitas.save(new Cita(citaId, paciente.id(), paciente.nombreCompleto(),
                    nutricionista.id(), nutricionista.nombreCompleto(), servicio.id(), servicio.nombre(),
                    servicio.duracionMinutos(), servicio.precioReferencial(), solicitud.inicio(), fin,
                    solicitud.motivoConsulta().trim(), EstadoCita.SOLICITADA, false, java.util.List.of(cambioInicial),
                    ahora, ahora, null));
            servicioAuditoria.registrar("citas", citaId, "SOLICITAR_CITA", usuario, Map.of());
            return CitaRespuesta.desde(guardada);
        } catch (RuntimeException excepcion) {
            reservaDeBloques.liberar(citaId);
            throw excepcion;
        }
    }

    public PaginaRespuesta<CitaRespuesta> listarCitas(UsuarioAutenticado usuario, EstadoCita estado,
                                                      String nutricionistaId, String pacienteId, String servicioId,
                                                      Instant desde, Instant hasta, Pageable paginacion) {
        Contexto contexto = identidadSolicitante.resolver(usuario);
        String pacienteFiltrado = usuario.esPaciente() ? contexto.pacienteId() : pacienteId;
        String nutricionistaFiltrado = usuario.esNutricionista() ? contexto.nutricionistaId() : nutricionistaId;
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .igual("estado", estado)
                .igual("nutricionistaId", nutricionistaFiltrado)
                .igual("pacienteId", pacienteFiltrado)
                .igual("servicioId", servicioId)
                .entreFechas("inicio", desde, hasta);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, Cita.class), CitaRespuesta::desde);
    }

    public CitaRespuesta consultarCita(UsuarioAutenticado usuario, String citaId) {
        return CitaRespuesta.desde(cargarConAcceso(identidadSolicitante.resolver(usuario), citaId));
    }

    public CitaRespuesta confirmarCita(UsuarioAutenticado usuario, String citaId) {
        Cita cita = cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        exigirTransicion(cita, EstadoCita.CONFIRMADA);
        clienteClinico.autorizarNutricionistaSobrePaciente(cita.pacienteId(), cita.nutricionistaId());
        return aplicarCambio(usuario, cita, EstadoCita.CONFIRMADA, EventoCita.CONFIRMACION, null, "CONFIRMAR_CITA");
    }

    public CitaRespuesta rechazarCita(UsuarioAutenticado usuario, String citaId, String motivo) {
        Cita cita = cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        exigirTransicion(cita, EstadoCita.RECHAZADA);
        CitaRespuesta respuesta = aplicarCambio(usuario, cita, EstadoCita.RECHAZADA, EventoCita.RECHAZO, motivo, "RECHAZAR_CITA");
        reservaDeBloques.liberar(citaId);
        return respuesta;
    }

    public CitaRespuesta cancelarCita(UsuarioAutenticado usuario, String citaId, String motivo) {
        Cita cita = cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        exigirTransicion(cita, EstadoCita.CANCELADA);
        if (usuario.esPaciente()) {
            exigirAnticipacionMinima(cita.inicio(), "cancelar");
        }
        CitaRespuesta respuesta = aplicarCambio(usuario, cita, EstadoCita.CANCELADA, EventoCita.CANCELACION, motivo, "CANCELAR_CITA");
        reservaDeBloques.liberar(citaId);
        return respuesta;
    }

    public CitaRespuesta reprogramarCita(UsuarioAutenticado usuario, String citaId, Instant nuevoInicio, String motivo) {
        Cita cita = cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        if (!cita.estado().estaActiva()) {
            throw new ConflictoDeNegocio("Solo se pueden reprogramar citas solicitadas o confirmadas");
        }
        if (usuario.esPaciente()) {
            exigirAnticipacionMinima(cita.inicio(), "reprogramar");
        }
        Instant nuevoFin = Calendario.sumarMinutos(nuevoInicio, cita.duracionMinutos());
        servicioDisponibilidad.exigirHorarioReservable(cita.nutricionistaId(), nuevoInicio, cita.duracionMinutos(), citaId);
        exigirPacienteSinCitasSuperpuestas(cita.pacienteId(), nuevoInicio, nuevoFin, citaId);
        reservaDeBloques.reubicar(citaId, cita.nutricionistaId(), cita.inicio(), cita.fin(), nuevoInicio, nuevoFin);
        EstadoCita estadoResultante = usuario.esPaciente() ? EstadoCita.SOLICITADA : cita.estado();
        CambioEstado cambio = new CambioEstado(EventoCita.REPROGRAMACION, estadoResultante, reloj.instant(),
                usuario.usuarioId(), motivo + " (anterior: " + cita.inicio() + ")");
        try {
            Cita guardada = repositorioCitas.save(cita.reprogramada(nuevoInicio, nuevoFin, estadoResultante, cambio));
            servicioAuditoria.registrar("citas", citaId, "REPROGRAMAR_CITA", usuario, Map.of("motivo", motivo));
            return CitaRespuesta.desde(guardada);
        } catch (RuntimeException excepcion) {
            reservaDeBloques.reubicar(citaId, cita.nutricionistaId(), nuevoInicio, nuevoFin, cita.inicio(), cita.fin());
            throw excepcion;
        }
    }

    public CitaRespuesta registrarAtencionRealizada(UsuarioAutenticado usuario, String citaId) {
        Cita cita = cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        exigirTransicion(cita, EstadoCita.REALIZADA);
        exigirCitaIniciada(cita);
        return aplicarCambio(usuario, cita, EstadoCita.REALIZADA, EventoCita.ATENCION_REALIZADA, null, "ATENCION_REALIZADA");
    }

    public CitaRespuesta registrarInasistencia(UsuarioAutenticado usuario, String citaId) {
        Cita cita = cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        exigirTransicion(cita, EstadoCita.INASISTENCIA);
        exigirCitaIniciada(cita);
        return aplicarCambio(usuario, cita, EstadoCita.INASISTENCIA, EventoCita.INASISTENCIA, null, "REGISTRAR_INASISTENCIA");
    }

    public Cita cargarConAcceso(Contexto contexto, String citaId) {
        Cita cita = repositorioCitas.findById(citaId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe la cita solicitada"));
        boolean esAdministrador = contexto.usuario().esAdministrador();
        boolean esElPaciente = cita.pacienteId().equals(contexto.pacienteId());
        boolean esElProfesional = cita.nutricionistaId().equals(contexto.nutricionistaId());
        if (!esAdministrador && !esElPaciente && !esElProfesional) {
            throw new PermisoDenegado("No tiene autorización para acceder a esta cita");
        }
        return cita;
    }

    private CitaRespuesta aplicarCambio(UsuarioAutenticado usuario, Cita cita, EstadoCita nuevoEstado, EventoCita evento,
                                        String detalle, String operacionAuditada) {
        CambioEstado cambio = new CambioEstado(evento, nuevoEstado, reloj.instant(), usuario.usuarioId(), detalle);
        Cita guardada = repositorioCitas.save(cita.conCambio(nuevoEstado, cambio));
        servicioAuditoria.registrar("citas", cita.id(), operacionAuditada, usuario,
                detalle == null ? Map.of() : Map.of("detalle", detalle));
        return CitaRespuesta.desde(guardada);
    }

    private void exigirTransicion(Cita cita, EstadoCita destino) {
        if (!cita.estado().puedeCambiarA(destino)) {
            throw new ConflictoDeNegocio("No es posible pasar una cita de " + cita.estado() + " a " + destino);
        }
    }

    private void exigirCitaIniciada(Cita cita) {
        if (cita.inicio().isAfter(reloj.instant())) {
            throw new ConflictoDeNegocio("La cita aún no ha comenzado");
        }
    }

    private void exigirAnticipacionMinima(Instant inicioCita, String accion) {
        if (inicioCita.isBefore(reloj.instant().plus(anticipacionMinimaPaciente))) {
            throw new ConflictoDeNegocio("Solo es posible " + accion + " con al menos "
                    + anticipacionMinimaPaciente.toHours() + " horas de anticipación; contacte a la clínica");
        }
    }

    private ResumenPaciente resolverPaciente(UsuarioAutenticado usuario, String pacienteIdSolicitado) {
        if (usuario.esPaciente()) {
            return clienteClinico.consultarMiPerfilDePaciente();
        }
        if (usuario.esAdministrador() && pacienteIdSolicitado != null && !pacienteIdSolicitado.isBlank()) {
            return clienteClinico.consultarPaciente(pacienteIdSolicitado);
        }
        throw new SolicitudInvalida("El administrador debe indicar el paciente de la cita");
    }

    private void validarOferta(ResumenPaciente paciente, ResumenServicio servicio, ResumenNutricionista nutricionista) {
        if (!paciente.activo()) {
            throw new ConflictoDeNegocio("El paciente se encuentra desactivado");
        }
        if (!servicio.activo()) {
            throw new ConflictoDeNegocio("El servicio seleccionado no está disponible");
        }
        if (!nutricionista.activo()) {
            throw new ConflictoDeNegocio("El profesional seleccionado no está disponible");
        }
        if (!nutricionista.serviciosIds().contains(servicio.id())) {
            throw new SolicitudInvalida("El profesional no ofrece el servicio seleccionado");
        }
    }

    private void exigirPacienteSinCitasSuperpuestas(String pacienteId, Instant inicio, Instant fin, String citaIgnoradaId) {
        boolean existeChoque = repositorioCitas
                .findByPacienteIdAndEstadoInAndInicioLessThanAndFinGreaterThan(pacienteId, ESTADOS_ACTIVOS, fin, inicio)
                .stream().anyMatch(cita -> !cita.id().equals(citaIgnoradaId));
        if (existeChoque) {
            throw new ConflictoDeNegocio("El paciente ya tiene una cita activa que coincide con ese horario");
        }
    }
}
