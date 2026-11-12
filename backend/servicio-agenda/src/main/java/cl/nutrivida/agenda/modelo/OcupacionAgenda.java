package cl.nutrivida.agenda.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;

@Document(collection = "ocupaciones_agenda")
public record OcupacionAgenda(
        @Id String id,
        @Field(targetType = FieldType.OBJECT_ID) String nutricionistaId,
        Instant bloqueInicio,
        @Indexed @Field(targetType = FieldType.OBJECT_ID) String citaId) {
}
