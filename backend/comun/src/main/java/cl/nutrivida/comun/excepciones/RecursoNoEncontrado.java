package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public class RecursoNoEncontrado extends ExcepcionNegocio {

    public RecursoNoEncontrado(String mensaje) {
        super(HttpStatus.NOT_FOUND, "RECURSO_NO_ENCONTRADO", mensaje);
    }
}
