package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.SolicitudCambioEstadoContacto;
import cl.nutrivida.clinico.dto.SolicitudContactoNueva;
import cl.nutrivida.clinico.dto.SolicitudContactoRespuesta;
import cl.nutrivida.clinico.modelo.SolicitudContacto.EstadoSolicitud;
import cl.nutrivida.clinico.servicio.ServicioSolicitudesContacto;
import cl.nutrivida.clinico.servicio.ServicioSolicitudesContacto.ResultadoRegistro;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/solicitudes-contacto")
@Tag(name = "Solicitudes de contacto", description = "Formulario público de contacto y su gestión")
public class ControladorSolicitudesContacto {

    private final ServicioSolicitudesContacto servicioSolicitudes;

    public ControladorSolicitudesContacto(ServicioSolicitudesContacto servicioSolicitudes) {
        this.servicioSolicitudes = servicioSolicitudes;
    }

    @PostMapping
    @Operation(summary = "Registra una solicitud de contacto. Un reenvío idéntico el mismo día no genera duplicados")
    public ResponseEntity<SolicitudContactoRespuesta> registrarSolicitud(
            @Valid @RequestBody SolicitudContactoNueva solicitud) {
        ResultadoRegistro resultado = servicioSolicitudes.registrarSolicitud(solicitud);
        HttpStatus estado = resultado.creada() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(estado).body(resultado.solicitud());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Lista solicitudes con filtros y paginación (solo ADMINISTRADOR)")
    public PaginaRespuesta<SolicitudContactoRespuesta> listarSolicitudes(
            @RequestParam(required = false) EstadoSolicitud estado,
            @RequestParam(required = false) String texto,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioSolicitudes.listarSolicitudes(estado, texto, ParametrosPagina.crear(pagina, tamano, "creadoEn", true));
    }

    @PatchMapping("/{solicitudId}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Cambia el estado de gestión de una solicitud (solo ADMINISTRADOR)")
    public SolicitudContactoRespuesta cambiarEstado(@PathVariable String solicitudId,
                                                    @Valid @RequestBody SolicitudCambioEstadoContacto solicitud) {
        return servicioSolicitudes.cambiarEstado(solicitudId, solicitud.estado(), UsuarioActual.obtener());
    }
}
