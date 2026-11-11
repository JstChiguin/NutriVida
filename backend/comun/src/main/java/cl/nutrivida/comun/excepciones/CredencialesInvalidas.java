package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public class CredencialesInvalidas extends ExcepcionNegocio {

    public CredencialesInvalidas(String mensaje) {
        super(HttpStatus.UNAUTHORIZED, "CREDENCIALES_INVALIDAS", mensaje);
    }
}
