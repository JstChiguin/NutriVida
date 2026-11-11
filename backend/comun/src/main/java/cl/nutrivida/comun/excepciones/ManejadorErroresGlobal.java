package cl.nutrivida.comun.excepciones;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

@RestControllerAdvice
public class ManejadorErroresGlobal {

    private static final Logger registro = LoggerFactory.getLogger(ManejadorErroresGlobal.class);

    @ExceptionHandler(ExcepcionNegocio.class)
    public ResponseEntity<RespuestaError> manejarExcepcionNegocio(ExcepcionNegocio excepcion, HttpServletRequest peticion) {
        return responder(excepcion.getEstadoHttp(), excepcion.getCodigo(), excepcion.getMessage(), peticion, List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RespuestaError> manejarValidacion(MethodArgumentNotValidException excepcion, HttpServletRequest peticion) {
        List<String> detalles = excepcion.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .sorted()
                .toList();
        return responder(HttpStatus.BAD_REQUEST, "VALIDACION_FALLIDA", "Los datos enviados no son válidos", peticion, detalles);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<RespuestaError> manejarCuerpoIlegible(Exception excepcion, HttpServletRequest peticion) {
        return responder(HttpStatus.BAD_REQUEST, "SOLICITUD_INVALIDA", "La solicitud tiene un formato incorrecto", peticion, List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<RespuestaError> manejarAccesoDenegado(AccessDeniedException excepcion, HttpServletRequest peticion) {
        return responder(HttpStatus.FORBIDDEN, "PERMISO_DENEGADO", "No tiene permisos para realizar esta operación", peticion, List.of());
    }

    @ExceptionHandler({DuplicateKeyException.class, OptimisticLockingFailureException.class})
    public ResponseEntity<RespuestaError> manejarConflictoDePersistencia(Exception excepcion, HttpServletRequest peticion) {
        return responder(HttpStatus.CONFLICT, "CONFLICTO_DE_DATOS", "El registro ya existe o fue modificado simultáneamente", peticion, List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<RespuestaError> manejarRutaInexistente(NoResourceFoundException excepcion, HttpServletRequest peticion) {
        return responder(HttpStatus.NOT_FOUND, "RUTA_NO_ENCONTRADA", "La ruta solicitada no existe", peticion, List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<RespuestaError> manejarMetodoNoPermitido(HttpRequestMethodNotSupportedException excepcion, HttpServletRequest peticion) {
        return responder(HttpStatus.METHOD_NOT_ALLOWED, "METODO_NO_PERMITIDO", "El método HTTP no está permitido para esta ruta", peticion, List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<RespuestaError> manejarErrorInesperado(Exception excepcion, HttpServletRequest peticion) {
        registro.error("Error inesperado en {} {}", peticion.getMethod(), peticion.getRequestURI(), excepcion);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_INTERNO", "Ocurrió un error interno", peticion, List.of());
    }

    private ResponseEntity<RespuestaError> responder(HttpStatus estado, String codigo, String mensaje,
                                                     HttpServletRequest peticion, List<String> detalles) {
        RespuestaError cuerpo = RespuestaError.de(estado.value(), codigo, mensaje, peticion.getRequestURI(), detalles);
        return ResponseEntity.status(estado).body(cuerpo);
    }
}
