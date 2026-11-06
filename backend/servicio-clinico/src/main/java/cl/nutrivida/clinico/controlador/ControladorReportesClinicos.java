package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.servicio.ServicioReportesClinicos;
import cl.nutrivida.clinico.servicio.ServicioReportesClinicos.ResumenPacientes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/reportes")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Reportes clínicos", description = "Indicadores agregados sin datos personales")
public class ControladorReportesClinicos {

    private final ServicioReportesClinicos servicioReportes;

    public ControladorReportesClinicos(ServicioReportesClinicos servicioReportes) {
        this.servicioReportes = servicioReportes;
    }

    @GetMapping("/pacientes")
    @Operation(summary = "Pacientes registrados, activos y registros por mes (solo ADMINISTRADOR)")
    public ResumenPacientes resumirPacientes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta) {
        return servicioReportes.resumirPacientes(desde, hasta);
    }
}
