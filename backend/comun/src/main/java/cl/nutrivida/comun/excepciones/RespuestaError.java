package cl.nutrivida.comun.excepciones;

import java.time.Instant;
import java.util.List;

public record RespuestaError(
        Instant fecha,
        int estado,
        String codigo,
        String mensaje,
        String ruta,
        List<String> detalles) {

    public static RespuestaError de(int estado, String codigo, String mensaje, String ruta, List<String> detalles) {
        return new RespuestaError(Instant.now(), estado, codigo, mensaje, ruta, detalles);
    }
}
