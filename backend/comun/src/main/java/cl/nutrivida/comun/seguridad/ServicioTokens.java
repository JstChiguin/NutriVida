package cl.nutrivida.comun.seguridad;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Component
public class ServicioTokens {

    private static final int LONGITUD_MINIMA_SECRETO = 32;
    private static final String RECLAMO_CORREO = "correo";
    private static final String RECLAMO_ROL = "rol";

    private final SecretKey clave;
    private final PropiedadesSeguridad propiedades;

    public ServicioTokens(PropiedadesSeguridad propiedades) {
        if (propiedades.secretoJwt() == null || propiedades.secretoJwt().length() < LONGITUD_MINIMA_SECRETO) {
            throw new IllegalStateException(
                    "NUTRIVIDA_JWT_SECRETO debe tener al menos " + LONGITUD_MINIMA_SECRETO + " caracteres");
        }
        this.propiedades = propiedades;
        this.clave = Keys.hmacShaKeyFor(propiedades.secretoJwt().getBytes(StandardCharsets.UTF_8));
    }

    public String generar(String usuarioId, String correo, Rol rol) {
        return generar(usuarioId, correo, rol, Duration.ofMinutes(propiedades.expiracionMinutos()));
    }

    public String generar(String usuarioId, String correo, Rol rol, Duration vigencia) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(propiedades.emisor())
                .subject(usuarioId)
                .claim(RECLAMO_CORREO, correo)
                .claim(RECLAMO_ROL, rol.name())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(vigencia)))
                .signWith(clave)
                .compact();
    }

    public Optional<UsuarioAutenticado> validar(String token) {
        try {
            Claims reclamos = Jwts.parser()
                    .verifyWith(clave)
                    .requireIssuer(propiedades.emisor())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Rol rol = Rol.valueOf(reclamos.get(RECLAMO_ROL, String.class));
            return Optional.of(new UsuarioAutenticado(
                    reclamos.getSubject(), reclamos.get(RECLAMO_CORREO, String.class), rol, reclamos.getId()));
        } catch (JwtException | IllegalArgumentException excepcion) {
            return Optional.empty();
        }
    }

    public Instant obtenerExpiracion(String token) {
        return Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload().getExpiration().toInstant();
    }

    public long getExpiracionSegundos() {
        return Duration.ofMinutes(propiedades.expiracionMinutos()).toSeconds();
    }
}
