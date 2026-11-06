package cl.nutrivida.clinico.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "planes_alimentarios")
@CompoundIndexes({
        @CompoundIndex(name = "paciente_version", def = "{'pacienteId': 1, 'numeroVersion': 1}", unique = true),
        @CompoundIndex(name = "un_plan_vigente_por_paciente", def = "{'pacienteId': 1}", unique = true,
                partialFilter = "{'estado': 'VIGENTE'}")
})
public record PlanAlimentario(
        @Id String id,
        @Field(targetType = FieldType.OBJECT_ID) String pacienteId,
        @Field(targetType = FieldType.OBJECT_ID) String nutricionistaId,
        int numeroVersion,
        EstadoPlan estado,
        String vigenteDesde,
        String vigenteHasta,
        List<String> objetivos,
        List<Comida> comidas,
        String recomendacionesGenerales,
        @Field(targetType = FieldType.OBJECT_ID) String planAnteriorId,
        Instant creadoEn,
        @Version Long version) {

    public PlanAlimentario {
        objetivos = objetivos == null ? new ArrayList<>() : objetivos;
        comidas = comidas == null ? new ArrayList<>() : comidas;
    }

    public enum EstadoPlan {
        VIGENTE,
        REEMPLAZADO,
        FINALIZADO
    }

    public record Comida(String nombre, String horario, List<AlimentoPorcion> alimentos, String recomendaciones) {
    }

    public record AlimentoPorcion(String alimento, double cantidad, String unidad) {
    }
}
