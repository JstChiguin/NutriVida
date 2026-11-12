package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public class PermisoDenegado extends ExcepcionNegocio {

    public PermisoDenegado(String mensaje) {
        super(HttpStatus.FORBIDDEN, "PERMISO_DENEGADO", mensaje);
    }
}
