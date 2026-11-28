package cl.nutrivida.autenticacion.servicio;

import cl.nutrivida.autenticacion.modelo.TokenRefresco;
import cl.nutrivida.autenticacion.modelo.UsuarioInvalidado;
import cl.nutrivida.comun.excepciones.CredencialesInvalidas;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class ServicioRefresco {

    public record Emitido(String valor, Instant expiraEn) {
    }

    public record Rotacion(String usuarioId, Emitido emitido) {
    }

    private static final int BYTES_ALEATORIOS = 32;
    private static final Duration VIGENCIA_INVALIDACION = Duration.ofDays(1);

    private final MongoTemplate plantillaMongo;
    private final Clock reloj;
    private final Duration sesionMaxima;
    private final SecureRandom generadorAleatorio = new SecureRandom();

    public ServicioRefresco(MongoTemplate plantillaMongo, Clock reloj,
                            @Value("${nutrivida.sesion.maxima-horas:8}") long sesionMaximaHoras) {
        this.plantillaMongo = plantillaMongo;
        this.reloj = reloj;
        this.sesionMaxima = Duration.ofHours(sesionMaximaHoras <= 0 ? 8 : sesionMaximaHoras);
    }

    public Emitido emitirNuevaSesion(String usuarioId) {
        Instant ahora = reloj.instant();
        return guardarNuevo(usuarioId, UUID.randomUUID().toString(), ahora, ahora.plus(sesionMaxima));
    }

    public Rotacion rotar(String valorPlano) {
        if (valorPlano == null || valorPlano.isBlank()) {
            throw sesionInvalida();
        }
        Instant ahora = reloj.instant();
        String huella = calcularHuella(valorPlano);
        Query vigente = Query.query(Criteria.where("_id").is(huella).and("usadoEn").is(null)
                .and("revocado").is(false).and("sesionExpiraEn").gt(ahora));
        TokenRefresco consumido = plantillaMongo.findAndModify(vigente, new Update().set("usadoEn", ahora),
                FindAndModifyOptions.options().returnNew(false), TokenRefresco.class);
        if (consumido == null) {
            TokenRefresco existente = plantillaMongo.findById(huella, TokenRefresco.class);
            if (existente != null && existente.usadoEn() != null) {
                revocarFamilia(existente.familia());
            }
            throw sesionInvalida();
        }
        Emitido nuevo = guardarNuevo(consumido.usuarioId(), consumido.familia(), ahora, consumido.sesionExpiraEn());
        return new Rotacion(consumido.usuarioId(), nuevo);
    }

    public void revocarSesionDe(String valorPlano) {
        if (valorPlano == null || valorPlano.isBlank()) {
            return;
        }
        TokenRefresco existente = plantillaMongo.findById(calcularHuella(valorPlano), TokenRefresco.class);
        if (existente != null) {
            revocarFamilia(existente.familia());
        }
    }

    public void revocarFamilia(String familia) {
        plantillaMongo.updateMulti(Query.query(Criteria.where("familia").is(familia)),
                new Update().set("revocado", true), TokenRefresco.class);
    }

    public void revocarSesionesDelUsuario(String usuarioId) {
        plantillaMongo.updateMulti(Query.query(Criteria.where("usuarioId").is(usuarioId)),
                new Update().set("revocado", true), TokenRefresco.class);
        Instant ahora = reloj.instant();
        plantillaMongo.save(new UsuarioInvalidado(usuarioId, ahora, ahora.plus(VIGENCIA_INVALIDACION)));
    }

    private Emitido guardarNuevo(String usuarioId, String familia, Instant ahora, Instant sesionExpiraEn) {
        byte[] aleatorio = new byte[BYTES_ALEATORIOS];
        generadorAleatorio.nextBytes(aleatorio);
        String valor = Base64.getUrlEncoder().withoutPadding().encodeToString(aleatorio);
        plantillaMongo.insert(new TokenRefresco(calcularHuella(valor), usuarioId, familia, ahora, null, false,
                sesionExpiraEn));
        return new Emitido(valor, sesionExpiraEn);
    }

    private static String calcularHuella(String valor) {
        try {
            byte[] resumen = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumen);
        } catch (NoSuchAlgorithmException excepcion) {
            throw new IllegalStateException("SHA-256 no disponible", excepcion);
        }
    }

    private static CredencialesInvalidas sesionInvalida() {
        return new CredencialesInvalidas("La sesión expiró o ya no es válida. Inicie sesión nuevamente");
    }
}
