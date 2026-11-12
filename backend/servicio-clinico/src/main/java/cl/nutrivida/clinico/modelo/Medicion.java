package cl.nutrivida.clinico.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.Map;

@Document(collection = "mediciones")
@CompoundIndex(name = "paciente_fecha", def = "{'pacienteId': 1, 'fecha': -1}")
public record Medicion(
        @Id String id,
        @Field(targetType = FieldType.OBJECT_ID) String pacienteId,
        @Field(targetType = FieldType.OBJECT_ID) String nutricionistaId,
        Instant fecha,
        double pesoKg,
        double estaturaCm,
        double imc,
        Double cinturaCm,
        Map<String, Double> otrasMediciones,
        String observaciones,
        EstadoMedicion estado,
        String motivoAnulacion,
        Instant creadoEn,
        @Version Long version) {

    public enum EstadoMedicion {
        VIGENTE,
        ANULADA
    }

    public Medicion anulada(String motivo) {
        return new Medicion(id, pacienteId, nutricionistaId, fecha, pesoKg, estaturaCm, imc, cinturaCm,
                otrasMediciones, observaciones, EstadoMedicion.ANULADA, motivo, creadoEn, version);
    }
}
