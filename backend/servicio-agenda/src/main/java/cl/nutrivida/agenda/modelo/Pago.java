package cl.nutrivida.agenda.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;

@Document(collection = "pagos")
public record Pago(
        @Id String id,
        @Indexed @Field(targetType = FieldType.OBJECT_ID) String citaId,
        @Indexed @Field(targetType = FieldType.OBJECT_ID) String pacienteId,
        int monto,
        EstadoPago estado,
        MetodoSimulado metodo,
        Comprobante comprobante,
        Instant creadoEn,
        @Version Long version) {

    public static final String GLOSA_SIMULACION = "COMPROBANTE FICTICIO - PAGO SIMULADO SIN VALOR TRIBUTARIO";

    public enum EstadoPago {
        APROBADO_SIMULADO,
        RECHAZADO_SIMULADO,
        ANULADO
    }

    public enum MetodoSimulado {
        TARJETA_SIMULADA,
        TRANSFERENCIA_SIMULADA,
        EFECTIVO_SIMULADO
    }

    public record Comprobante(String numero, Instant emitidoEn, String glosa) {
    }

    public Pago anulado() {
        return new Pago(id, citaId, pacienteId, monto, EstadoPago.ANULADO, metodo, comprobante, creadoEn, version);
    }
}
