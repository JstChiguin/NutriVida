package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.PlanAlimentarioRespuesta;
import cl.nutrivida.clinico.dto.SolicitudPlanAlimentario;
import cl.nutrivida.clinico.servicio.ServicioPlanesAlimentarios;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Planes alimentarios", description = "Planes versionados con comidas y porciones")
public class ControladorPlanesAlimentarios {

    private final ServicioPlanesAlimentarios servicioPlanes;

    public ControladorPlanesAlimentarios(ServicioPlanesAlimentarios servicioPlanes) {
        this.servicioPlanes = servicioPlanes;
    }

    @PostMapping("/api/pacientes/{pacienteId}/planes-alimentarios")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Crea el primer plan alimentario del paciente (nutricionista autorizado)")
    public ResponseEntity<PlanAlimentarioRespuesta> crearPlan(@PathVariable String pacienteId,
                                                              @Valid @RequestBody SolicitudPlanAlimentario solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioPlanes.crearPlan(UsuarioActual.obtener(), pacienteId, solicitud));
    }

    @GetMapping("/api/pacientes/{pacienteId}/planes-alimentarios/vigente")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Consulta el plan vigente del paciente")
    public PlanAlimentarioRespuesta consultarPlanVigente(@PathVariable String pacienteId) {
        return servicioPlanes.consultarPlanVigente(UsuarioActual.obtener(), pacienteId);
    }

    @GetMapping("/api/pacientes/{pacienteId}/planes-alimentarios")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Historial de versiones de planes del paciente")
    public PaginaRespuesta<PlanAlimentarioRespuesta> listarVersiones(@PathVariable String pacienteId,
                                                                      @RequestParam(defaultValue = "0") int pagina,
                                                                      @RequestParam(defaultValue = "20") int tamano) {
        return servicioPlanes.listarVersiones(UsuarioActual.obtener(), pacienteId,
                ParametrosPagina.crear(pagina, tamano, "numeroVersion", true));
    }

    @GetMapping("/api/planes-alimentarios/{planId}")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Consulta un plan por identificador")
    public PlanAlimentarioRespuesta consultarPlan(@PathVariable String planId) {
        return servicioPlanes.consultarPlan(UsuarioActual.obtener(), planId);
    }

    @PutMapping("/api/planes-alimentarios/{planId}")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Crea una nueva versión del plan y marca la anterior como reemplazada")
    public PlanAlimentarioRespuesta actualizarPlan(@PathVariable String planId,
                                                   @Valid @RequestBody SolicitudPlanAlimentario solicitud) {
        return servicioPlanes.actualizarPlan(UsuarioActual.obtener(), planId, solicitud);
    }

    @PatchMapping("/api/planes-alimentarios/{planId}/finalizacion")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Finaliza un plan vigente")
    public PlanAlimentarioRespuesta finalizarPlan(@PathVariable String planId) {
        return servicioPlanes.finalizarPlan(UsuarioActual.obtener(), planId);
    }
}
