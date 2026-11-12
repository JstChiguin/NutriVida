package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.EvolucionMediciones;
import cl.nutrivida.clinico.dto.MedicionRespuesta;
import cl.nutrivida.clinico.dto.SolicitudAnulacionMedicion;
import cl.nutrivida.clinico.dto.SolicitudMedicion;
import cl.nutrivida.clinico.servicio.ServicioMediciones;
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

@RestController
@RequestMapping("/api/pacientes/{pacienteId}/mediciones")
@Tag(name = "Mediciones", description = "Peso, estatura, IMC y evolución antropométrica")
public class ControladorMediciones {

    private final ServicioMediciones servicioMediciones;

    public ControladorMediciones(ServicioMediciones servicioMediciones) {
        this.servicioMediciones = servicioMediciones;
    }

    @PostMapping
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Registra una medición y calcula el IMC (nutricionista autorizado)")
    public ResponseEntity<MedicionRespuesta> registrarMedicion(@PathVariable String pacienteId,
                                                               @Valid @RequestBody SolicitudMedicion solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioMediciones.registrarMedicion(UsuarioActual.obtener(), pacienteId, solicitud));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Lista las mediciones con filtro por fechas y paginación")
    public PaginaRespuesta<MedicionRespuesta> listarMediciones(
            @PathVariable String pacienteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioMediciones.listarMediciones(UsuarioActual.obtener(), pacienteId, desde, hasta,
                ParametrosPagina.crear(pagina, tamano, "fecha", true));
    }

    @GetMapping("/evolucion")
    @PreAuthorize("hasAnyRole('NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Serie temporal de peso, IMC y cintura lista para graficar")
    public EvolucionMediciones consultarEvolucion(@PathVariable String pacienteId) {
        return servicioMediciones.consultarEvolucion(UsuarioActual.obtener(), pacienteId);
    }

    @PatchMapping("/{medicionId}/anulacion")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Anula una medición errónea conservando el registro y el motivo")
    public MedicionRespuesta anularMedicion(@PathVariable String pacienteId, @PathVariable String medicionId,
                                            @Valid @RequestBody SolicitudAnulacionMedicion solicitud) {
        return servicioMediciones.anularMedicion(UsuarioActual.obtener(), pacienteId, medicionId, solicitud);
    }
}
