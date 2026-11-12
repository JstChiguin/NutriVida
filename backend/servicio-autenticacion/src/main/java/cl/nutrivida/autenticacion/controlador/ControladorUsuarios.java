package cl.nutrivida.autenticacion.controlador;

import cl.nutrivida.autenticacion.dto.SolicitudActualizarUsuario;
import cl.nutrivida.autenticacion.dto.SolicitudCambioContrasena;
import cl.nutrivida.autenticacion.dto.SolicitudCambioEstado;
import cl.nutrivida.autenticacion.dto.SolicitudCambioRol;
import cl.nutrivida.autenticacion.dto.SolicitudCrearUsuario;
import cl.nutrivida.autenticacion.dto.UsuarioRespuesta;
import cl.nutrivida.autenticacion.servicio.ServicioUsuarios;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import cl.nutrivida.comun.seguridad.Rol;
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
@RequestMapping("/api/usuarios")
@Tag(name = "Usuarios", description = "Administración de cuentas, roles y estado")
public class ControladorUsuarios {

    private final ServicioUsuarios servicioUsuarios;

    public ControladorUsuarios(ServicioUsuarios servicioUsuarios) {
        this.servicioUsuarios = servicioUsuarios;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Lista usuarios con filtros, paginación y orden (solo ADMINISTRADOR)")
    public PaginaRespuesta<UsuarioRespuesta> listarUsuarios(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) Rol rol,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @RequestParam(defaultValue = "creadoEn") String ordenarPor,
            @RequestParam(defaultValue = "true") boolean descendente) {
        return servicioUsuarios.listarUsuarios(texto, rol, activo,
                ParametrosPagina.crear(pagina, tamano, camposOrdenables(ordenarPor), descendente));
    }

    @GetMapping("/{usuarioId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Consulta un usuario por identificador (solo ADMINISTRADOR)")
    public UsuarioRespuesta consultarUsuario(@PathVariable String usuarioId) {
        return servicioUsuarios.consultarUsuario(usuarioId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Crea un usuario con cualquier rol permitido (solo ADMINISTRADOR)")
    public ResponseEntity<UsuarioRespuesta> crearUsuario(@Valid @RequestBody SolicitudCrearUsuario solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioUsuarios.crearUsuario(solicitud, UsuarioActual.obtener()));
    }

    @PutMapping("/{usuarioId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Actualiza nombre y correo de un usuario (solo ADMINISTRADOR)")
    public UsuarioRespuesta actualizarUsuario(@PathVariable String usuarioId,
                                              @Valid @RequestBody SolicitudActualizarUsuario solicitud) {
        return servicioUsuarios.actualizarUsuario(usuarioId, solicitud, UsuarioActual.obtener());
    }

    @PatchMapping("/{usuarioId}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Activa o desactiva una cuenta (solo ADMINISTRADOR)")
    public UsuarioRespuesta cambiarEstado(@PathVariable String usuarioId,
                                          @Valid @RequestBody SolicitudCambioEstado solicitud) {
        return servicioUsuarios.cambiarEstado(usuarioId, solicitud.activo(), UsuarioActual.obtener());
    }

    @PatchMapping("/{usuarioId}/rol")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Cambia el rol de un usuario (solo ADMINISTRADOR)")
    public UsuarioRespuesta cambiarRol(@PathVariable String usuarioId, @Valid @RequestBody SolicitudCambioRol solicitud) {
        return servicioUsuarios.cambiarRol(usuarioId, solicitud.rol(), UsuarioActual.obtener());
    }

    @DeleteMapping("/{usuarioId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Desactiva la cuenta (eliminación lógica, conserva el historial)")
    public ResponseEntity<Void> desactivarUsuario(@PathVariable String usuarioId) {
        servicioUsuarios.cambiarEstado(usuarioId, false, UsuarioActual.obtener());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/yo/contrasena")
    @Operation(summary = "Cambia la contraseña del usuario autenticado")
    public ResponseEntity<Void> cambiarContrasena(@Valid @RequestBody SolicitudCambioContrasena solicitud) {
        servicioUsuarios.cambiarContrasena(UsuarioActual.obtener(), solicitud);
        return ResponseEntity.noContent().build();
    }

    private String camposOrdenables(String campo) {
        return switch (campo) {
            case "correo", "nombreCompleto", "rol", "activo", "ultimoAcceso" -> campo;
            default -> "creadoEn";
        };
    }
}
