package cl.nutrivida.comun.seguridad;

public interface VerificadorRevocacion {

    boolean estaRevocado(String identificadorToken);
}
