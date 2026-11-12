package cl.nutrivida.agenda.controlador;

import cl.nutrivida.agenda.servicio.ServicioReportesAgenda;
import cl.nutrivida.agenda.servicio.ServicioReportesAgenda.ActividadDiaria;
import cl.nutrivida.agenda.servicio.ServicioReportesAgenda.AtencionesPorNutricionista;
import cl.nutrivida.agenda.servicio.ServicioReportesAgenda.CantidadPorEstado;
import cl.nutrivida.agenda.servicio.ServicioReportesAgenda.CantidadPorEvento;
import cl.nutrivida.agenda.servicio.ServicioReportesAgenda.PacientesAtendidos;
import cl.nutrivida.agenda.servicio.ServicioReportesAgenda.ServicioSolicitado;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/reportes")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Reportes de agenda", description = "Indicadores agregados con MongoDB aggregation, sin datos personales")
public class ControladorReportesAgenda {

    private final ServicioReportesAgenda servicioReportes;

    public ControladorReportesAgenda(ServicioReportesAgenda servicioReportes) {
        this.servicioReportes = servicioReportes;
    }

    @GetMapping("/citas-por-estado")
    @Operation(summary = "Cantidad de citas por estado, filtrable por fechas y profesional")
    public List<CantidadPorEstado> contarCitasPorEstado(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(required = false) String nutricionistaId) {
        return servicioReportes.contarCitasPorEstado(desde, hasta, nutricionistaId);
    }

    @GetMapping("/atenciones-por-nutricionista")
    @Operation(summary = "Total, realizadas, inasistencias y canceladas por nutricionista")
    public List<AtencionesPorNutricionista> resumirAtencionesPorNutricionista(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return servicioReportes.resumirAtencionesPorNutricionista(desde, hasta);
    }

    @GetMapping("/servicios-mas-solicitados")
    @Operation(summary = "Ranking de servicios más solicitados")
    public List<ServicioSolicitado> listarServiciosMasSolicitados(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(defaultValue = "5") int limite) {
        return servicioReportes.listarServiciosMasSolicitados(desde, hasta, limite);
    }

    @GetMapping("/actividad-agenda")
    @Operation(summary = "Cantidad de citas por día para graficar la actividad de la agenda")
    public List<ActividadDiaria> resumirActividadPorDia(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(required = false) String nutricionistaId) {
        return servicioReportes.resumirActividadPorDia(desde, hasta, nutricionistaId);
    }

    @GetMapping("/eventos-de-citas")
    @Operation(summary = "Conteo de eventos del historial de citas (usa $unwind): solicitudes, cancelaciones, reprogramaciones")
    public List<CantidadPorEvento> contarEventosDelHistorial(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return servicioReportes.contarEventosDelHistorial(desde, hasta);
    }

    @GetMapping("/pacientes-atendidos")
    @Operation(summary = "Pacientes distintos atendidos y atenciones realizadas en el período")
    public PacientesAtendidos contarPacientesAtendidos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return servicioReportes.contarPacientesAtendidos(desde, hasta);
    }
}
