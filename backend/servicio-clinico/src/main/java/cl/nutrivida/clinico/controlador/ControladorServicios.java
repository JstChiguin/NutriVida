package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.ServicioRespuesta;
import cl.nutrivida.clinico.dto.SolicitudCambioEstado;
import cl.nutrivida.clinico.dto.SolicitudServicio;
import cl.nutrivida.clinico.servicio.ServicioCatalogo;
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
@RequestMapping("/api/servicios")
@Tag(name = "Servicios", description = "Catálogo de prestaciones nutricionales")
public class ControladorServicios {

    private final ServicioCatalogo servicioCatalogo;

    public ControladorServicios(ServicioCatalogo servicioCatalogo) {
        this.servicioCatalogo = servicioCatalogo;
    }

    @GetMapping
    @Operation(summary = "Lista pública de prestaciones con filtros y paginación")
    public PaginaRespuesta<ServicioRespuesta> listarServicios(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) String categoria,
            @RequestParam(defaultValue = "true") boolean soloActivos,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @RequestParam(defaultValue = "nombre") String ordenarPor,
            @RequestParam(defaultValue = "false") boolean descendente) {
        return servicioCatalogo.listarServicios(texto, categoria, soloActivos,
                ParametrosPagina.crear(pagina, tamano, camposOrdenables(ordenarPor), descendente));
    }

    @GetMapping("/{servicioId}")
    @Operation(summary = "Consulta pública de una prestación")
    public ServicioRespuesta consultarServicio(@PathVariable String servicioId) {
        return servicioCatalogo.consultarServicio(servicioId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Crea una prestación (solo ADMINISTRADOR)")
    public ResponseEntity<ServicioRespuesta> crearServicio(@Valid @RequestBody SolicitudServicio solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioCatalogo.crearServicio(solicitud, UsuarioActual.obtener()));
    }

    @PutMapping("/{servicioId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Actualiza una prestación (solo ADMINISTRADOR)")
    public ServicioRespuesta actualizarServicio(@PathVariable String servicioId,
                                                @Valid @RequestBody SolicitudServicio solicitud) {
        return servicioCatalogo.actualizarServicio(servicioId, solicitud, UsuarioActual.obtener());
    }

    @PatchMapping("/{servicioId}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Activa o desactiva una prestación (solo ADMINISTRADOR)")
    public ServicioRespuesta cambiarEstado(@PathVariable String servicioId,
                                           @Valid @RequestBody SolicitudCambioEstado solicitud) {
        return servicioCatalogo.cambiarEstado(servicioId, solicitud.activo(), UsuarioActual.obtener());
    }

    @DeleteMapping("/{servicioId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Desactiva la prestación (eliminación lógica porque las citas la referencian)")
    public ResponseEntity<Void> desactivarServicio(@PathVariable String servicioId) {
        servicioCatalogo.cambiarEstado(servicioId, false, UsuarioActual.obtener());
        return ResponseEntity.noContent().build();
    }

    private String camposOrdenables(String campo) {
        return switch (campo) {
            case "categoria", "duracionMinutos", "precioReferencial" -> campo;
            default -> "nombre";
        };
    }
}
