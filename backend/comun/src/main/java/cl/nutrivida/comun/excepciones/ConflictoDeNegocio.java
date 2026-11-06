package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public class ConflictoDeNegocio extends ExcepcionNegocio {

    public ConflictoDeNegocio(String mensaje) {
        super(HttpStatus.CONFLICT, "CONFLICTO_DE_NEGOCIO", mensaje);
    }
}
