package cl.nutrivida.comun.excepciones;

import org.springframework.http.HttpStatus;

public abstract class ExcepcionNegocio extends RuntimeException {

    private final HttpStatus estadoHttp;
    private final String codigo;

    protected ExcepcionNegocio(HttpStatus estadoHttp, String codigo, String mensaje) {
        super(mensaje);
        this.estadoHttp = estadoHttp;
        this.codigo = codigo;
    }

    public HttpStatus getEstadoHttp() {
        return estadoHttp;
    }

    public String getCodigo() {
        return codigo;
    }
}
