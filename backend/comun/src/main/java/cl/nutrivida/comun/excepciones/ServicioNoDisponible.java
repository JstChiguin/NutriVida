package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public class ServicioNoDisponible extends ExcepcionNegocio {

    public ServicioNoDisponible(String mensaje) {
        super(HttpStatus.SERVICE_UNAVAILABLE, "SERVICIO_NO_DISPONIBLE", mensaje);
    }
}
