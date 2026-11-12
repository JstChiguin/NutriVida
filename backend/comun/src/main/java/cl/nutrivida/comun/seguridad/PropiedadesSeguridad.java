package cl.nutrivida.comun.seguridad;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "nutrivida.seguridad")
public record PropiedadesSeguridad(
        String secretoJwt,
        long expiracionMinutos,
        String emisor,
        List<String> origenesPermitidos,
        List<String> rutasPublicasGet,
        List<String> rutasPublicasPost) {

    public PropiedadesSeguridad {
        expiracionMinutos = expiracionMinutos <= 0 ? 60 : expiracionMinutos;
        emisor = emisor == null || emisor.isBlank() ? "nutrivida" : emisor;
        origenesPermitidos = origenesPermitidos == null ? List.of() : origenesPermitidos;
        rutasPublicasGet = rutasPublicasGet == null ? List.of() : rutasPublicasGet;
        rutasPublicasPost = rutasPublicasPost == null ? List.of() : rutasPublicasPost;
    }
}
