package cl.nutrivida.autenticacion.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.IndexDirection;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "usuarios_invalidados")
public record UsuarioInvalidado(
        @Id String usuarioId,
        Instant desde,
        @Indexed(direction = IndexDirection.ASCENDING, expireAfterSeconds = 0) Instant expiraEn) {
}
