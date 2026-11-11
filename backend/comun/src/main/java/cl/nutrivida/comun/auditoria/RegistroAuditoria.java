package cl.nutrivida.comun.auditoria;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "auditorias")
public record RegistroAuditoria(
        @Id String id,
        String servicioOrigen,
        @Indexed String entidad,
        @Indexed String entidadId,
        String operacion,
        String usuarioId,
        String rol,
        Map<String, Object> detalle,
        @Indexed Instant fecha) {
}
