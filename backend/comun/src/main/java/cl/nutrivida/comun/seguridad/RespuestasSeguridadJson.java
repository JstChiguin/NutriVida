package cl.nutrivida.comun.seguridad;

import cl.nutrivida.comun.excepciones.RespuestaError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

@Component
public class RespuestasSeguridadJson implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper convertidorJson;

    public RespuestasSeguridadJson(ObjectMapper convertidorJson) {
        this.convertidorJson = convertidorJson;
    }

    @Override
    public void commence(HttpServletRequest peticion, HttpServletResponse respuesta, AuthenticationException excepcion)
            throws IOException {
        escribir(respuesta, peticion, HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO", "Debe iniciar sesión para acceder");
    }

    @Override
    public void handle(HttpServletRequest peticion, HttpServletResponse respuesta, AccessDeniedException excepcion)
            throws IOException {
        escribir(respuesta, peticion, HttpStatus.FORBIDDEN, "PERMISO_DENEGADO", "No tiene permisos para realizar esta operación");
    }

    private void escribir(HttpServletResponse respuesta, HttpServletRequest peticion, HttpStatus estado,
                          String codigo, String mensaje) throws IOException {
        respuesta.setStatus(estado.value());
        respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        respuesta.setCharacterEncoding("UTF-8");
        RespuestaError cuerpo = RespuestaError.de(estado.value(), codigo, mensaje, peticion.getRequestURI(), List.of());
        convertidorJson.writeValue(respuesta.getOutputStream(), cuerpo);
    }
}
