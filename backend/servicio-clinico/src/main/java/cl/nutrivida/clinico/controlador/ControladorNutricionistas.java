package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.NutricionistaRespuesta;
import cl.nutrivida.clinico.dto.SolicitudCambioEstado;
import cl.nutrivida.clinico.dto.SolicitudNutricionista;
import cl.nutrivida.clinico.servicio.ServicioNutricionistas;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/nutricionistas")
@Tag(name = "Nutricionistas", description = "Catálogo público de profesionales y administración de perfiles")
public class ControladorNutricionistas {

    private final ServicioNutricionistas servicioNutricionistas;

    public ControladorNutricionistas(ServicioNutricionistas servicioNutricionistas) {
        this.servicioNutricionistas = servicioNutricionistas;
    }

    @GetMapping
    @Operation(summary = "Lista pública de nutricionistas con filtros por texto, especialidad o servicio")
    public PaginaRespuesta<NutricionistaRespuesta> listarNutricionistas(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) String especialidad,
            @RequestParam(required = false) String servicioId,
            @RequestParam(defaultValue = "true") boolean soloActivos,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioNutricionistas.listarNutricionistas(texto, especialidad, servicioId, soloActivos,
                ParametrosPagina.crear(pagina, tamano, "nombreCompleto", false));
    }

    @GetMapping("/yo")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Perfil del nutricionista autenticado")
    public NutricionistaRespuesta consultarMiPerfil() {
        return servicioNutricionistas.consultarMiPerfil(UsuarioActual.obtener());
    }

    @PutMapping("/yo")
    @PreAuthorize("hasRole('NUTRICIONISTA')")
    @Operation(summary = "Actualiza el perfil profesional del nutricionista autenticado")
    public NutricionistaRespuesta actualizarMiPerfil(@Valid @RequestBody SolicitudNutricionista solicitud) {
        return servicioNutricionistas.actualizarMiPerfil(UsuarioActual.obtener(), solicitud);
    }

    @GetMapping("/{nutricionistaId}")
    @Operation(summary = "Consulta pública de un nutricionista")
    public NutricionistaRespuesta consultarNutricionista(@PathVariable String nutricionistaId) {
        return servicioNutricionistas.consultarNutricionista(nutricionistaId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Crea el perfil de un nutricionista para un usuario existente (solo ADMINISTRADOR)")
    public ResponseEntity<NutricionistaRespuesta> crearNutricionista(@Valid @RequestBody SolicitudNutricionista solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioNutricionistas.crearNutricionista(solicitud, UsuarioActual.obtener()));
    }

    @PutMapping("/{nutricionistaId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Actualiza un nutricionista (solo ADMINISTRADOR)")
    public NutricionistaRespuesta actualizarNutricionista(@PathVariable String nutricionistaId,
                                                          @Valid @RequestBody SolicitudNutricionista solicitud) {
        return servicioNutricionistas.actualizarNutricionista(nutricionistaId, solicitud, UsuarioActual.obtener());
    }

    @PatchMapping("/{nutricionistaId}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Activa o desactiva un nutricionista (solo ADMINISTRADOR)")
    public NutricionistaRespuesta cambiarEstado(@PathVariable String nutricionistaId,
                                                @Valid @RequestBody SolicitudCambioEstado solicitud) {
        return servicioNutricionistas.cambiarEstado(nutricionistaId, solicitud.activo(), UsuarioActual.obtener());
    }

    @DeleteMapping("/{nutricionistaId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Desactiva al nutricionista (eliminación lógica que conserva el historial)")
    public ResponseEntity<Void> desactivarNutricionista(@PathVariable String nutricionistaId) {
        servicioNutricionistas.cambiarEstado(nutricionistaId, false, UsuarioActual.obtener());
        return ResponseEntity.noContent().build();
    }
}
