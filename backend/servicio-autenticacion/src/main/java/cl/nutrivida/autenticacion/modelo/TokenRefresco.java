package cl.nutrivida.autenticacion.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.IndexDirection;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "tokens_refresco")
public record TokenRefresco(
        @Id String huella,
        @Indexed String usuarioId,
        @Indexed String familia,
        Instant creadoEn,
        Instant usadoEn,
        boolean revocado,
        @Indexed(direction = IndexDirection.ASCENDING, expireAfterSeconds = 0) Instant sesionExpiraEn) {
}
