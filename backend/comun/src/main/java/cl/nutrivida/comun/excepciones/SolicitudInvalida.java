package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public class SolicitudInvalida extends ExcepcionNegocio {

    public SolicitudInvalida(String mensaje) {
        super(HttpStatus.BAD_REQUEST, "SOLICITUD_INVALIDA", mensaje);
    }
}
