package cl.nutrivida.agenda.modelo;

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

@Document(collection = "citas")
@CompoundIndexes({
        @CompoundIndex(name = "nutricionista_inicio", def = "{'nutricionistaId': 1, 'inicio': 1}"),
        @CompoundIndex(name = "paciente_inicio", def = "{'pacienteId': 1, 'inicio': 1}"),
        @CompoundIndex(name = "estado_inicio", def = "{'estado': 1, 'inicio': 1}")
})
public record Cita(
        @Id String id,
        @Field(targetType = FieldType.OBJECT_ID) String pacienteId,
        String nombrePaciente,
        @Field(targetType = FieldType.OBJECT_ID) String nutricionistaId,
        String nombreNutricionista,
        @Field(targetType = FieldType.OBJECT_ID) String servicioId,
        String nombreServicio,
        int duracionMinutos,
        int precioReferencial,
        Instant inicio,
        Instant fin,
        String motivoConsulta,
        EstadoCita estado,
        boolean pagada,
        List<CambioEstado> historialEstados,
        Instant creadaEn,
        Instant actualizadaEn,
        @Version Long version) {

    public Cita {
        historialEstados = historialEstados == null ? new ArrayList<>() : historialEstados;
    }

    public enum EstadoCita {
        SOLICITADA,
        CONFIRMADA,
        RECHAZADA,
        CANCELADA,
        REALIZADA,
        INASISTENCIA;

        public boolean estaActiva() {
            return this == SOLICITADA || this == CONFIRMADA;
        }

        public boolean puedeCambiarA(EstadoCita destino) {
            return switch (this) {
                case SOLICITADA -> destino == CONFIRMADA || destino == RECHAZADA || destino == CANCELADA;
                case CONFIRMADA -> destino == CANCELADA || destino == REALIZADA || destino == INASISTENCIA;
                default -> false;
            };
        }
    }

    public enum EventoCita {
        SOLICITUD,
        CONFIRMACION,
        RECHAZO,
        CANCELACION,
        REPROGRAMACION,
        ATENCION_REALIZADA,
        INASISTENCIA
    }

    public record CambioEstado(EventoCita evento, EstadoCita estado, Instant fecha,
                               @Field(targetType = FieldType.OBJECT_ID) String usuarioId, String detalle) {
    }

    public Cita conCambio(EstadoCita nuevoEstado, CambioEstado cambio) {
        return new Cita(id, pacienteId, nombrePaciente, nutricionistaId, nombreNutricionista, servicioId,
                nombreServicio, duracionMinutos, precioReferencial, inicio, fin, motivoConsulta, nuevoEstado, pagada,
                agregarCambio(cambio), creadaEn, Instant.now(), version);
    }

    public Cita reprogramada(Instant nuevoInicio, Instant nuevoFin, EstadoCita nuevoEstado, CambioEstado cambio) {
        return new Cita(id, pacienteId, nombrePaciente, nutricionistaId, nombreNutricionista, servicioId,
                nombreServicio, duracionMinutos, precioReferencial, nuevoInicio, nuevoFin, motivoConsulta, nuevoEstado,
                pagada, agregarCambio(cambio), creadaEn, Instant.now(), version);
    }

    private List<CambioEstado> agregarCambio(CambioEstado cambio) {
        List<CambioEstado> historial = new ArrayList<>(historialEstados);
        historial.add(cambio);
        return historial;
    }
}
