package cl.nutrivida.autenticacion.controlador;

import cl.nutrivida.autenticacion.dto.RespuestaSesion;
import cl.nutrivida.autenticacion.dto.SolicitudInicioSesion;
import cl.nutrivida.autenticacion.dto.SolicitudRegistroPaciente;
import cl.nutrivida.autenticacion.dto.UsuarioRespuesta;
import cl.nutrivida.autenticacion.servicio.ServicioAutenticacion;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/autenticacion")
@Tag(name = "Autenticación", description = "Registro de pacientes, inicio y cierre de sesión con JWT")
public class ControladorAutenticacion {

    private final ServicioAutenticacion servicioAutenticacion;

    public ControladorAutenticacion(ServicioAutenticacion servicioAutenticacion) {
        this.servicioAutenticacion = servicioAutenticacion;
    }

    @PostMapping("/registro")
    @Operation(summary = "Registra un paciente nuevo. El registro público siempre asigna el rol PACIENTE")
    public ResponseEntity<RespuestaSesion> registrarPaciente(@Valid @RequestBody SolicitudRegistroPaciente solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioAutenticacion.registrarPaciente(solicitud));
    }

    @PostMapping("/iniciar-sesion")
    @Operation(summary = "Valida las credenciales y entrega un token JWT")
    public RespuestaSesion iniciarSesion(@Valid @RequestBody SolicitudInicioSesion solicitud) {
        return servicioAutenticacion.iniciarSesion(solicitud);
    }

    @PostMapping("/cerrar-sesion")
    @Operation(summary = "Revoca el token de la sesión actual")
    public ResponseEntity<Void> cerrarSesion() {
        servicioAutenticacion.cerrarSesion(UsuarioActual.obtener(), UsuarioActual.obtenerTokenActual());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/yo")
    @Operation(summary = "Devuelve los datos del usuario autenticado")
    public UsuarioRespuesta obtenerUsuarioActual() {
        return servicioAutenticacion.obtenerUsuarioActual(UsuarioActual.obtener());
    }
}
