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

@Document(collection = "fichas_clinicas")
public record FichaClinica(
        @Id String id,
        @Indexed(unique = true) @Field(targetType = FieldType.OBJECT_ID) String pacienteId,
        @Field(targetType = FieldType.OBJECT_ID) String nutricionistaResponsableId,
        Instant fechaApertura,
        String motivoConsulta,
        Antecedentes antecedentes,
        List<String> alergias,
        List<String> intolerancias,
        String habitosAlimentarios,
        ActividadFisica actividadFisica,
        List<String> objetivosNutricionales,
        String evaluacion,
        String diagnosticoNutricional,
        String planIntervencion,
        String indicaciones,
        EstadoFicha estado,
        List<Evolucion> evoluciones,
        List<CorreccionFicha> correcciones,
        Instant actualizadoEn,
        @Version Long version) {

    public FichaClinica {
        alergias = alergias == null ? new ArrayList<>() : alergias;
        intolerancias = intolerancias == null ? new ArrayList<>() : intolerancias;
        objetivosNutricionales = objetivosNutricionales == null ? new ArrayList<>() : objetivosNutricionales;
        evoluciones = evoluciones == null ? new ArrayList<>() : evoluciones;
        correcciones = correcciones == null ? new ArrayList<>() : correcciones;
    }

    public enum EstadoFicha {
        ABIERTA,
        CERRADA
    }

    public enum NivelActividad {
        SEDENTARIO,
        LIGERO,
        MODERADO,
        INTENSO
    }

    public record Antecedentes(List<String> morbidos, List<String> quirurgicos, List<String> familiares,
                               List<String> farmacos) {
    }

    public record ActividadFisica(NivelActividad nivel, String descripcion, Integer sesionesPorSemana) {
    }

    public record Evolucion(
            String identificador,
            Instant fecha,
            @Field(targetType = FieldType.OBJECT_ID) String nutricionistaId,
            @Field(targetType = FieldType.OBJECT_ID) String citaId,
            String descripcion,
            String indicaciones,
            String corrigeEvolucionId,
            String motivoCorreccion,
            boolean corregida) {
    }

    public record CorreccionFicha(Instant fecha, String usuarioId, String motivo, String valorAnterior) {
    }
}
