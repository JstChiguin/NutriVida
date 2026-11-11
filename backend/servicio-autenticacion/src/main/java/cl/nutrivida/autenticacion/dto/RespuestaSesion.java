package cl.nutrivida.autenticacion.dto;

public record RespuestaSesion(String token, String tipo, long expiraEnSegundos, UsuarioRespuesta usuario) {

    public static RespuestaSesion bearer(String token, long expiraEnSegundos, UsuarioRespuesta usuario) {
        return new RespuestaSesion(token, "Bearer", expiraEnSegundos, usuario);
    }
}
