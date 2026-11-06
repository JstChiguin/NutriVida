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

@Document(collection = "pacientes")
public record Paciente(
        @Id String id,
        @Indexed(unique = true) @Field(targetType = FieldType.OBJECT_ID) String usuarioId,
        String nombreCompleto,
        @Indexed(unique = true, sparse = true) String rut,
        String correo,
        String telefono,
        String fechaNacimiento,
        String sexo,
        String direccion,
        boolean activo,
        @Field(targetType = FieldType.OBJECT_ID) List<String> nutricionistasAutorizados,
        Instant creadoEn,
        Instant actualizadoEn,
        @Version Long version) {

    public Paciente {
        nutricionistasAutorizados = nutricionistasAutorizados == null ? new ArrayList<>() : nutricionistasAutorizados;
    }

    public boolean tieneAutorizado(String nutricionistaId) {
        return nutricionistasAutorizados.contains(nutricionistaId);
    }

    public Paciente conDatosPersonales(String nuevoNombre, String nuevoRut, String nuevoTelefono,
                                       String nuevaFechaNacimiento, String nuevoSexo, String nuevaDireccion) {
        return new Paciente(id, usuarioId, nuevoNombre, nuevoRut, correo, nuevoTelefono, nuevaFechaNacimiento,
                nuevoSexo, nuevaDireccion, activo, nutricionistasAutorizados, creadoEn, Instant.now(), version);
    }

    public Paciente conEstado(boolean nuevoEstado) {
        return new Paciente(id, usuarioId, nombreCompleto, rut, correo, telefono, fechaNacimiento, sexo, direccion,
                nuevoEstado, nutricionistasAutorizados, creadoEn, Instant.now(), version);
    }
}
