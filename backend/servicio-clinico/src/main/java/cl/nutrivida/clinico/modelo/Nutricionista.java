package cl.nutrivida.clinico.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "nutricionistas")
public record Nutricionista(
        @Id String id,
        @Indexed(unique = true) @Field(targetType = FieldType.OBJECT_ID) String usuarioId,
        String nombreCompleto,
        String titulo,
        @Indexed List<String> especialidades,
        String biografia,
        String fotoUrl,
        @Field(targetType = FieldType.OBJECT_ID) List<String> serviciosIds,
        boolean activo,
        Instant creadoEn,
        Instant actualizadoEn,
        @Version Long version) {

    public Nutricionista {
        especialidades = especialidades == null ? new ArrayList<>() : especialidades;
        serviciosIds = serviciosIds == null ? new ArrayList<>() : serviciosIds;
    }

    public Nutricionista conPerfil(String nuevoNombre, String nuevoTitulo, List<String> nuevasEspecialidades,
                                   String nuevaBiografia, String nuevaFotoUrl, List<String> nuevosServicios) {
        return new Nutricionista(id, usuarioId, nuevoNombre, nuevoTitulo, nuevasEspecialidades, nuevaBiografia,
                nuevaFotoUrl, nuevosServicios, activo, creadoEn, Instant.now(), version);
    }

    public Nutricionista conEstado(boolean nuevoEstado) {
        return new Nutricionista(id, usuarioId, nombreCompleto, titulo, especialidades, biografia, fotoUrl,
                serviciosIds, nuevoEstado, creadoEn, Instant.now(), version);
    }
}
