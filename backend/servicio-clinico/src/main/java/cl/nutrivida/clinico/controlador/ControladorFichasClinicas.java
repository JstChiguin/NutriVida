package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.DatosFichaClinica;
import cl.nutrivida.clinico.dto.FichaClinicaRespuesta;
import cl.nutrivida.clinico.dto.SolicitudActualizarFicha;
import cl.nutrivida.clinico.dto.SolicitudCorreccionEvolucion;
import cl.nutrivida.clinico.dto.SolicitudEvolucion;
import cl.nutrivida.clinico.modelo.FichaClinica.EstadoFicha;
import cl.nutrivida.clinico.servicio.ServicioFichasClinicas;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pacientes/{pacienteId}/ficha-clinica")
@Tag(name = "Fichas clínicas", description = "Ficha nutricional con evoluciones y correcciones auditadas")
public class ControladorFichasClinicas {

    private final ServicioFichasClinicas servicioFichas;

    public ControladorFichasClinicas(ServicioFichasClinicas servicioFichas) {
        this.servicioFichas = servicioFichas;
    }

    @PostMapping
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Abre la ficha clínica del paciente (nutricionista autorizado)")
    public ResponseEntity<FichaClinicaRespuesta> abrirFicha(@PathVariable String pacienteId,
                                                            @Valid @RequestBody DatosFichaClinica datos) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioFichas.abrirFicha(UsuarioActual.obtener(), pacienteId, datos));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Consulta la ficha: nutricionista autorizado o el propio paciente")
    public FichaClinicaRespuesta consultarFicha(@PathVariable String pacienteId) {
        return servicioFichas.consultarFicha(UsuarioActual.obtener(), pacienteId);
    }

    @PutMapping
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Corrige los datos base de la ficha conservando el estado anterior")
    public FichaClinicaRespuesta actualizarFicha(@PathVariable String pacienteId,
                                                 @Valid @RequestBody SolicitudActualizarFicha solicitud) {
        return servicioFichas.actualizarFicha(UsuarioActual.obtener(), pacienteId, solicitud);
    }

    @PostMapping("/evoluciones")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Registra una evolución sin modificar las anteriores")
    public ResponseEntity<FichaClinicaRespuesta> registrarEvolucion(@PathVariable String pacienteId,
                                                                    @Valid @RequestBody SolicitudEvolucion solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioFichas.registrarEvolucion(UsuarioActual.obtener(), pacienteId, solicitud));
    }

    @PostMapping("/evoluciones/{evolucionId}/correcciones")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Corrige una evolución creando una nueva y marcando la original como corregida")
    public ResponseEntity<FichaClinicaRespuesta> corregirEvolucion(@PathVariable String pacienteId,
                                                                   @PathVariable String evolucionId,
                                                                   @Valid @RequestBody SolicitudCorreccionEvolucion solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioFichas.corregirEvolucion(UsuarioActual.obtener(), pacienteId, evolucionId, solicitud));
    }

    @PatchMapping("/estado")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Abre o cierra la ficha (las fichas nunca se eliminan)")
    public FichaClinicaRespuesta cambiarEstado(@PathVariable String pacienteId, @RequestParam EstadoFicha estado) {
        return servicioFichas.cambiarEstado(UsuarioActual.obtener(), pacienteId, estado);
    }
}
