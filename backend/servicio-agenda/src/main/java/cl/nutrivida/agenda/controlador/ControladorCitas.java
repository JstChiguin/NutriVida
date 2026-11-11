package cl.nutrivida.agenda.controlador;

import cl.nutrivida.agenda.dto.CitaRespuesta;
import cl.nutrivida.agenda.dto.PagoRespuesta;
import cl.nutrivida.agenda.dto.SolicitudCita;
import cl.nutrivida.agenda.dto.SolicitudMotivo;
import cl.nutrivida.agenda.dto.SolicitudPago;
import cl.nutrivida.agenda.dto.SolicitudReprogramacion;
import cl.nutrivida.agenda.modelo.Cita.EstadoCita;
import cl.nutrivida.agenda.servicio.ServicioCitas;
import cl.nutrivida.agenda.servicio.ServicioPagos;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/citas")
@Tag(name = "Citas", description = "Solicitud, confirmación, cancelación, reprogramación y atención de citas")
public class ControladorCitas {

    private final ServicioCitas servicioCitas;
    private final ServicioPagos servicioPagos;

    public ControladorCitas(ServicioCitas servicioCitas, ServicioPagos servicioPagos) {
        this.servicioCitas = servicioCitas;
        this.servicioPagos = servicioPagos;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PACIENTE','ADMINISTRADOR')")
    @Operation(summary = "Solicita una cita. El backend valida disponibilidad, bloqueos, duplicados y fechas pasadas")
    public ResponseEntity<CitaRespuesta> solicitarCita(@Valid @RequestBody SolicitudCita solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioCitas.solicitarCita(UsuarioActual.obtener(), solicitud));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PACIENTE','NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Lista citas con filtros. Cada rol solo ve las citas que le corresponden")
    public PaginaRespuesta<CitaRespuesta> listarCitas(
            @RequestParam(required = false) EstadoCita estado,
            @RequestParam(required = false) String nutricionistaId,
            @RequestParam(required = false) String pacienteId,
            @RequestParam(required = false) String servicioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @RequestParam(defaultValue = "false") boolean descendente) {
        return servicioCitas.listarCitas(UsuarioActual.obtener(), estado, nutricionistaId, pacienteId, servicioId,
                desde, hasta, ParametrosPagina.crear(pagina, tamano, "inicio", descendente));
    }

    @GetMapping("/{citaId}")
    @PreAuthorize("hasAnyRole('PACIENTE','NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Consulta una cita con su historial de estados")
    public CitaRespuesta consultarCita(@PathVariable String citaId) {
        return servicioCitas.consultarCita(UsuarioActual.obtener(), citaId);
    }

    @PatchMapping("/{citaId}/confirmacion")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Confirma una cita solicitada y autoriza al profesional sobre el paciente")
    public CitaRespuesta confirmarCita(@PathVariable String citaId) {
        return servicioCitas.confirmarCita(UsuarioActual.obtener(), citaId);
    }

    @PatchMapping("/{citaId}/rechazo")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Rechaza una cita solicitada y libera el horario")
    public CitaRespuesta rechazarCita(@PathVariable String citaId, @Valid @RequestBody SolicitudMotivo solicitud) {
        return servicioCitas.rechazarCita(UsuarioActual.obtener(), citaId, solicitud.motivo());
    }

    @PatchMapping("/{citaId}/cancelacion")
    @PreAuthorize("hasAnyRole('PACIENTE','NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Cancela una cita activa. El paciente debe respetar la anticipación mínima")
    public CitaRespuesta cancelarCita(@PathVariable String citaId, @Valid @RequestBody SolicitudMotivo solicitud) {
        return servicioCitas.cancelarCita(UsuarioActual.obtener(), citaId, solicitud.motivo());
    }

    @PatchMapping("/{citaId}/reprogramacion")
    @PreAuthorize("hasAnyRole('PACIENTE','NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Reprograma una cita activa validando el nuevo horario")
    public CitaRespuesta reprogramarCita(@PathVariable String citaId, @Valid @RequestBody SolicitudReprogramacion solicitud) {
        return servicioCitas.reprogramarCita(UsuarioActual.obtener(), citaId, solicitud.nuevoInicio(), solicitud.motivo());
    }

    @PatchMapping("/{citaId}/atencion-realizada")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Registra la atención realizada de una cita confirmada ya iniciada")
    public CitaRespuesta registrarAtencionRealizada(@PathVariable String citaId) {
        return servicioCitas.registrarAtencionRealizada(UsuarioActual.obtener(), citaId);
    }

    @PatchMapping("/{citaId}/inasistencia")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','ADMINISTRADOR')")
    @Operation(summary = "Registra la inasistencia del paciente a una cita confirmada ya iniciada")
    public CitaRespuesta registrarInasistencia(@PathVariable String citaId) {
        return servicioCitas.registrarInasistencia(UsuarioActual.obtener(), citaId);
    }

    @PostMapping("/{citaId}/pagos")
    @PreAuthorize("hasAnyRole('PACIENTE','ADMINISTRADOR')")
    @Operation(summary = "Realiza un pago SIMULADO de la cita y emite un comprobante ficticio")
    public ResponseEntity<PagoRespuesta> pagarCita(@PathVariable String citaId, @Valid @RequestBody SolicitudPago solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioPagos.pagarCita(UsuarioActual.obtener(), citaId, solicitud));
    }

    @GetMapping("/{citaId}/pagos")
    @PreAuthorize("hasAnyRole('PACIENTE','ADMINISTRADOR')")
    @Operation(summary = "Lista los pagos simulados de una cita")
    public List<PagoRespuesta> listarPagosDeCita(@PathVariable String citaId) {
        return servicioPagos.listarPagosDeCita(UsuarioActual.obtener(), citaId);
    }
}
