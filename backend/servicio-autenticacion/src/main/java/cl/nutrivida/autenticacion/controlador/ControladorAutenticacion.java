package cl.nutrivida.autenticacion.controlador;

import cl.nutrivida.autenticacion.dto.RespuestaSesion;
import cl.nutrivida.autenticacion.dto.SesionEmitida;
import cl.nutrivida.autenticacion.servicio.ServicioRefresco.Emitido;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestHeader;
import java.time.Duration;
import java.time.Instant;
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
@RequestMapping("/api/v1/autenticacion")
@Tag(name = "Autenticación", description = "Registro de pacientes, inicio y cierre de sesión con JWT y renovación con refresh token")
public class ControladorAutenticacion {

    static final String COOKIE_REFRESCO = "nutrivida_refresco";
    static final String CABECERA_ANTI_CSRF = "X-Nutrivida-Csrf";
    private static final String RUTA_COOKIE = "/api/v1/autenticacion";

    private final ServicioAutenticacion servicioAutenticacion;
    private final boolean cookieSegura;
    private final String cookieSameSite;

    public ControladorAutenticacion(ServicioAutenticacion servicioAutenticacion,
                                    @Value("${nutrivida.sesion.cookie-segura:true}") boolean cookieSegura,
                                    @Value("${nutrivida.sesion.cookie-same-site:Lax}") String cookieSameSite) {
        this.servicioAutenticacion = servicioAutenticacion;
        this.cookieSegura = cookieSegura;
        this.cookieSameSite = cookieSameSite;
    }

    @PostMapping("/registro")
    @Operation(summary = "Registra un paciente nuevo. El registro público siempre asigna el rol PACIENTE")
    public ResponseEntity<RespuestaSesion> registrarPaciente(@Valid @RequestBody SolicitudRegistroPaciente solicitud) {
        return responder(HttpStatus.CREATED, servicioAutenticacion.registrarPaciente(solicitud));
    }

    @PostMapping("/iniciar-sesion")
    @Operation(summary = "Valida las credenciales y entrega un token JWT de acceso y una cookie HttpOnly de refresco")
    public ResponseEntity<RespuestaSesion> iniciarSesion(@Valid @RequestBody SolicitudInicioSesion solicitud) {
        return responder(HttpStatus.OK, servicioAutenticacion.iniciarSesion(solicitud));
    }

    @PostMapping("/refrescar")
    @Operation(summary = "Renueva el token de acceso rotando la cookie de refresco. Exige la cabecera X-Nutrivida-Csrf")
    public ResponseEntity<RespuestaSesion> refrescar(
            @RequestHeader(value = CABECERA_ANTI_CSRF, required = false) String cabeceraAntiCsrf,
            @CookieValue(value = COOKIE_REFRESCO, required = false) String valorRefresco) {
        if (!"1".equals(cabeceraAntiCsrf)) {
            throw new PermisoDenegado("Solicitud de renovación no permitida");
        }
        return responder(HttpStatus.OK, servicioAutenticacion.refrescarSesion(valorRefresco));
    }

    @PostMapping("/cerrar-sesion")
    @Operation(summary = "Revoca el token de acceso y la sesión de refresco actuales")
    public ResponseEntity<Void> cerrarSesion(@CookieValue(value = COOKIE_REFRESCO, required = false) String valorRefresco) {
        servicioAutenticacion.cerrarSesion(UsuarioActual.obtener(), UsuarioActual.obtenerTokenActual(), valorRefresco);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, construirCookie("", Duration.ZERO).toString()).build();
    }

    @GetMapping("/yo")
    @Operation(summary = "Devuelve los datos del usuario autenticado")
    public UsuarioRespuesta obtenerUsuarioActual() {
        return servicioAutenticacion.obtenerUsuarioActual(UsuarioActual.obtener());
    }

    private ResponseEntity<RespuestaSesion> responder(HttpStatus estado, SesionEmitida sesion) {
        Emitido refresco = sesion.refresco();
        Duration vida = Duration.between(Instant.now(), refresco.expiraEn());
        return ResponseEntity.status(estado)
                .header(HttpHeaders.SET_COOKIE, construirCookie(refresco.valor(), vida).toString())
                .body(sesion.cuerpo());
    }

    private ResponseCookie construirCookie(String valor, Duration vida) {
        return ResponseCookie.from(COOKIE_REFRESCO, valor)
                .httpOnly(true).secure(cookieSegura).sameSite(cookieSameSite)
                .path(RUTA_COOKIE).maxAge(vida).build();
    }
}
